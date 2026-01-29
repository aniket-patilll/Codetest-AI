"""
Submission API router.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from supabase import Client

from app.dependencies import (
    get_current_user,
    get_current_user_id,
    get_supabase_client,
    get_supabase_admin_client,
    require_host,
)
from app.schemas.submission import (
    SubmissionRequest,
    SubmissionResponse,
    SubmissionDetail,
    SubmissionListItem,
)
from app.schemas.execution import TestcaseInput
from app.services.sandbox import execute_testcase
from app.services.scorer import calculate_score, combine_scores
from app.services.ai_evaluator import evaluate_code_with_ai
from app.services.complexity_analyzer import analyze_complexity
from app.config import get_settings, Settings


router = APIRouter()

async def run_evaluation_task(submission_id: str, supabase: Client):
    """
    Background task to run AI evaluation and update submission.
    """
    try:
        # Get submission details
        sub_res = supabase.table("submissions").select("*").eq("id", submission_id).single().execute()
        if not sub_res.data:
            return
        
        submission = sub_res.data
        
        # Get question details for description
        q_res = supabase.table("questions").select("title, description").eq("id", submission["question_id"]).single().execute()
        description = "No description"
        if q_res.data:
            description = f"{q_res.data['title']}\n\n{q_res.data['description']}"
            
        # Run static complexity analysis first
        complexity_analysis = analyze_complexity(submission["code"])
        
        # Run AI Eval
        ai_eval = await evaluate_code_with_ai(
            code=submission["code"],
            language=submission["language"],
            problem_description=description,
            testcases_passed=submission["testcases_passed"],
            total_testcases=submission["total_testcases"]
        )
        
        # Override complexity values from static analysis if AI returned 'Unknown'
        if ai_eval.time_complexity == "Unknown":
            ai_eval.time_complexity = complexity_analysis["time_complexity"]
        if ai_eval.space_complexity == "Unknown":
            ai_eval.space_complexity = complexity_analysis["space_complexity"]
        
        # Calculate Final Score
        final_score = combine_scores(
            rule_based_score=submission["rule_based_score"],
            ai_score=ai_eval.overall_score,
            rule_weight=0.7,
            ai_weight=0.3
        )
        
        ai_data = {
            "code_quality_score": ai_eval.code_quality_score,
            "logical_clarity_score": ai_eval.logical_clarity_score,
            "time_complexity": ai_eval.time_complexity,
            "space_complexity": ai_eval.space_complexity,
            "overall_score": ai_eval.overall_score,
            "suggestions": ai_eval.suggestions or [],
            "justification": ai_eval.justification
        }
        
        # Update DB
        supabase.table("submissions").update({
            "ai_evaluation": ai_data,
            "final_score": final_score
        }).eq("id", submission_id).execute()
        
    except Exception as e:
        print(f"Background evaluation failed: {e}")


@router.post("/submit", response_model=SubmissionResponse)
def submit_solution(
    request: SubmissionRequest,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_user)],
    user_id: Annotated[str, Depends(get_current_user_id)],
    supabase: Annotated[Client, Depends(get_supabase_admin_client)],
    settings: Annotated[Settings, Depends(get_settings)]
):
    """
    Submit a solution for evaluation.
    
    Runs code against all testcases (including hidden ones) and calculates score.
    Triggers AI evaluation in background.
    """
    try:
        # Get question details
        question_result = supabase.table("questions").select("*").eq("id", request.question_id).limit(1).execute()
        
        if not question_result.data or len(question_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )
        
        question = question_result.data[0]
        
        # Get participant
        participant_result = supabase.table("participants").select("*").eq("user_id", user_id).eq("test_id", question["test_id"]).limit(1).execute()
        
        if not participant_result.data or len(participant_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this test. Please join the test first."
            )
        
        participant = participant_result.data[0]
        
        # Get all testcases (including hidden)
        testcases_result = supabase.table("testcases").select("*").eq("question_id", request.question_id).order("order_index").execute()
        
        testcases = testcases_result.data or []
        
        if not testcases:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No testcases found for this question"
            )
        
        # Execute against all testcases
        results = []
        total_time_ms = 0
        max_memory_mb = 0
        runtime_error = None
        
        for i, tc in enumerate(testcases):
            testcase_input = TestcaseInput(
                input=tc["input"],
                expected_output=tc["expected_output"]
            )
            
            result = execute_testcase(
                code=request.code,
                language=request.language,
                testcase=testcase_input,
                testcase_index=i,
                timeout_seconds=settings.code_timeout_seconds,
                memory_limit_mb=settings.code_memory_limit_mb,
                use_docker=True
            )
            
            results.append(result)
            total_time_ms += result.execution_time_ms
            max_memory_mb = max(max_memory_mb, result.memory_used_mb)
            
            if result.error and not runtime_error:
                runtime_error = result.error
        
        # Calculate score
        passed = sum(1 for r in results if r.passed)
        total = len(results)
        
        scoring_result = calculate_score(
            testcases_passed=passed,
            total_testcases=total,
            question_points=question.get("points", 100),
            execution_time_ms=total_time_ms / len(results) if results else 0,
            memory_used_mb=max_memory_mb
        )
        
        # Format for display
        avg_time_ms = total_time_ms / len(results) if results else 0
        execution_time = f"{avg_time_ms:.0f}ms"
        memory_used = f"{max_memory_mb:.1f}MB"
        
        # Store submission in database
        submission_data = {
            "participant_id": participant["id"],
            "question_id": request.question_id,
            "code": request.code,
            "language": request.language,
            "testcases_passed": passed,
            "total_testcases": total,
            "rule_based_score": scoring_result.final_score,
            "final_score": scoring_result.final_score,  # Will be updated after AI eval
            "execution_time": execution_time,
            "memory_used": memory_used,
            "runtime_error": runtime_error,
        }
        
        insert_result = supabase.table("submissions").insert(submission_data).execute()
        
        if not insert_result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save submission"
            )
        
        submission = insert_result.data[0]
        
        if request.is_final:
            supabase.table("participants").update({
                "status": "submitted",
                "submitted_at": "now()"
            }).eq("id", participant["id"]).execute()

        # Trigger AI Evaluation Background Task
        # Note: We pass original supabase (admin) client might be safer or not?
        # Typically passing client is fine.
        background_tasks.add_task(run_evaluation_task, submission["id"], supabase)
        
        return SubmissionResponse(
            submission_id=submission["id"],
            testcases_passed=passed,
            total_testcases=total,
            rule_based_score=scoring_result.final_score,
            execution_time=execution_time,
            memory_used=memory_used,
            runtime_error=runtime_error
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Debugging 500: {str(e)}"
        )


@router.get("/submissions/{test_id}", response_model=list[SubmissionListItem])
def get_submissions(
    test_id: str,
    current_user: Annotated[dict, Depends(require_host)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Get all submissions for a test (host only).
    """
    # Verify host owns this test
    test_result = supabase.table("tests").select("host_id").eq("id", test_id).single().execute()
    
    if not test_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test not found"
        )
    
    if test_result.data["host_id"] != current_user.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this test"
        )
    
    # Get submissions with participant and user info including timing
    submissions_result = supabase.table("submissions").select(
        "*, participants!inner(user_id, started_at, submitted_at, users(full_name))"
    ).eq("participants.test_id", test_id).execute()
    
    submissions = []
    for sub in submissions_result.data or []:
        participant = sub.get("participants", {})
        user = participant.get("users", {})
        
        submissions.append(SubmissionListItem(
            id=sub["id"],
            student_name=user.get("full_name", "Unknown"),
            student_id=participant.get("user_id", ""),
            language=sub["language"],
            score=sub["final_score"],
            testcases_passed=sub["testcases_passed"],
            total_testcases=sub["total_testcases"],
            submitted_at=sub["submitted_at"],
            execution_time=sub["execution_time"],
            memory_used=sub["memory_used"],
            participant_started_at=participant.get("started_at"),
            participant_submitted_at=participant.get("submitted_at")
        ))
    
    return submissions


@router.get("/submission/{submission_id}", response_model=SubmissionDetail)
def get_submission_detail(
    submission_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Get detailed submission info.
    Students can view their own, hosts can view any in their tests.
    """
    result = supabase.table("submissions").select("*").eq("id", submission_id).single().execute()
    
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    submission = result.data
    
    return SubmissionDetail(
        id=submission["id"],
        participant_id=submission["participant_id"],
        question_id=submission["question_id"],
        code=submission["code"],
        language=submission["language"],
        testcases_passed=submission["testcases_passed"],
        total_testcases=submission["total_testcases"],
        rule_based_score=submission["rule_based_score"],
        ai_evaluation=submission.get("ai_evaluation"),
        final_score=submission["final_score"],
        execution_time=submission["execution_time"],
        memory_used=submission["memory_used"],
        runtime_error=submission.get("runtime_error"),
        submitted_at=submission["submitted_at"]
    )

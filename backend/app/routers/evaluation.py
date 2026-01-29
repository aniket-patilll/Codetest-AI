"""
AI Evaluation API router.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_current_user, get_supabase_client
from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
)
from app.services.ai_evaluator import evaluate_code_with_ai
from app.services.scorer import combine_scores


router = APIRouter()


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_submission(
    request: EvaluationRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Perform AI evaluation on a submission.
    
    Analyzes code quality, logical clarity, and complexity.
    Updates the submission with AI scores and combined final score.
    """
    # Get submission
    submission_result = supabase.table("submissions").select("*").eq("id", request.submission_id).single().execute()
    
    if not submission_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    submission = submission_result.data
    
    # Get question for problem description
    question_result = supabase.table("questions").select("title, description").eq("id", submission["question_id"]).single().execute()
    
    problem_description = "No description available"
    if question_result.data:
        question = question_result.data
        problem_description = f"{question['title']}\n\n{question['description']}"
    
    # Perform AI evaluation
    ai_evaluation = await evaluate_code_with_ai(
        code=submission["code"],
        language=submission["language"],
        problem_description=problem_description,
        testcases_passed=submission["testcases_passed"],
        total_testcases=submission["total_testcases"]
    )
    
    # Calculate combined score
    rule_based = submission["rule_based_score"]
    final_score = combine_scores(
        rule_based_score=rule_based,
        ai_score=ai_evaluation.overall_score,
        rule_weight=0.7,
        ai_weight=0.3
    )
    
    # Update submission with AI evaluation
    ai_eval_dict = {
        "code_quality_score": ai_evaluation.code_quality_score,
        "logical_clarity_score": ai_evaluation.logical_clarity_score,
        "time_complexity": ai_evaluation.time_complexity,
        "space_complexity": ai_evaluation.space_complexity,
        "overall_score": ai_evaluation.overall_score,
        "suggestions": ai_evaluation.suggestions or [],
        "justification": ai_evaluation.justification
    }
    
    update_result = supabase.table("submissions").update({
        "ai_evaluation": ai_eval_dict,
        "final_score": final_score
    }).eq("id", request.submission_id).execute()
    
    if not update_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update submission with AI evaluation"
        )
    
    return EvaluationResponse(
        submission_id=request.submission_id,
        ai_evaluation=ai_evaluation,
        final_score=final_score,
        rule_based_score=rule_based,
        ai_weight=0.3
    )

from fastapi import APIRouter, HTTPException, Depends
from app.schemas.generation import GenerateQuestionRequest, GeneratedQuestionResponse
from app.services.ai_generator import generate_question_with_ai
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/generate",
    tags=["generation"],
    responses={404: {"description": "Not found"}},
)

@router.post("/question", response_model=GeneratedQuestionResponse)
async def generate_question(
    request: GenerateQuestionRequest,
    current_user = Depends(get_current_user) # Require auth
):
    try:
        print(f"[DEBUG] Generating question: prompt='{request.prompt}', difficulty='{request.difficulty}', count={request.testcase_count}")
        result = await generate_question_with_ai(request.prompt, request.difficulty, request.testcase_count)
        print(f"[DEBUG] Generation successful")
        return result
    except Exception as e:
        import traceback
        print(f"[ERROR] Generation failed: {type(e).__name__}: {str(e)}")
        print(f"[ERROR] Traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

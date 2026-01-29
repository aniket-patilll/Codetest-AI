"""
Pydantic schemas for AI evaluation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class EvaluationRequest(BaseModel):
    """Request model for AI code evaluation."""
    submission_id: str = Field(..., description="UUID of the submission to evaluate")


class AIEvaluation(BaseModel):
    """AI evaluation results."""
    code_quality_score: float = Field(..., ge=0, le=10, description="Code quality score 1-10")
    logical_clarity_score: float = Field(..., ge=0, le=10, description="Logical clarity score 1-10")
    time_complexity: str = Field(..., description="Estimated time complexity (e.g., O(n))")
    space_complexity: str = Field(..., description="Estimated space complexity")

    # New fields for richer feedback
    suggestions: List[str] = Field(
        default_factory=list,
        description="Concrete suggestions for improving the code."
    )
    justification: Optional[str] = Field(
        default=None,
        description="Short explanation justifying the assigned scores."
    )

    overall_score: float = Field(..., ge=0, le=10, description="Overall AI score 1-10")


class EvaluationResponse(BaseModel):
    """Response model for AI evaluation."""
    submission_id: str
    ai_evaluation: AIEvaluation
    final_score: float = Field(..., description="Combined rule-based + AI score")
    rule_based_score: float
    ai_weight: float = Field(default=0.3, description="Weight of AI score in final")

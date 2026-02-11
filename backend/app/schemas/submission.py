"""
Pydantic schemas for submissions.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class SubmissionRequest(BaseModel):
    """Request model for submitting code."""
    question_id: str = Field(..., description="UUID of the question")
    code: str = Field(..., description="Source code to submit")
    language: str = Field(..., pattern="^(python|cpp|java)$", description="Programming language")
    is_final: bool = Field(False, description="Whether this is the final submission that ends the test")


class SubmissionResponse(BaseModel):
    """Response model for submission result."""
    submission_id: str
    testcases_passed: int
    total_testcases: int
    rule_based_score: float
    execution_time: str
    memory_used: str
    runtime_error: Optional[str] = None


class SubmissionDetail(BaseModel):
    """Detailed submission information."""
    id: str
    participant_id: str
    question_id: str
    code: str
    language: str
    testcases_passed: int
    total_testcases: int
    rule_based_score: float
    ai_evaluation: Optional[dict] = None
    final_score: float
    execution_time: str
    memory_used: str
    runtime_error: Optional[str] = None
    submitted_at: datetime


class SubmissionListItem(BaseModel):
    """Submission item for list views."""
    id: str
    student_name: str
    student_id: str
    language: str
    score: float
    testcases_passed: int
    total_testcases: int
    submitted_at: datetime
    execution_time: str
    memory_used: str
    participant_started_at: Optional[datetime] = None
    participant_submitted_at: Optional[datetime] = None

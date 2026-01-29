"""
Pydantic schemas for code execution.
"""

from pydantic import BaseModel, Field
from typing import Optional


class TestcaseInput(BaseModel):
    """Input testcase for code execution."""
    input: str = Field(..., description="Input data for the testcase")
    expected_output: str = Field(..., description="Expected output")


class ExecutionRequest(BaseModel):
    """Request model for code execution."""
    code: str = Field(..., description="Source code to execute")
    language: str = Field(..., pattern="^(python|cpp|java)$", description="Programming language")
    testcases: list[TestcaseInput] = Field(..., min_length=1, description="Testcases to run")
    timeout_seconds: int = Field(default=10, ge=1, le=30, description="Execution timeout")
    memory_limit_mb: int = Field(default=256, ge=64, le=512, description="Memory limit in MB")


class TestcaseResult(BaseModel):
    """Result of a single testcase execution."""
    testcase_index: int
    passed: bool
    actual_output: str
    expected_output: str
    execution_time_ms: float
    memory_used_mb: float
    error: Optional[str] = None


class ExecutionSummary(BaseModel):
    """Summary of all testcase executions."""
    passed: int
    failed: int
    total: int
    avg_execution_time_ms: float
    max_memory_mb: float


class ExecutionResponse(BaseModel):
    """Response model for code execution."""
    results: list[TestcaseResult]
    summary: ExecutionSummary
    runtime_error: Optional[str] = None

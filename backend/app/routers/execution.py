"""
Code execution API router.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.schemas.execution import (
    ExecutionRequest,
    ExecutionResponse,
    ExecutionSummary,
    TestcaseResult,
)
from app.services.sandbox import execute_testcase
from app.config import get_settings, Settings


router = APIRouter()


@router.post("/execute", response_model=ExecutionResponse)
async def execute_code(
    request: ExecutionRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)]
):
    """
    Execute code against provided testcases.
    
    Runs code in a sandboxed environment (Docker when available, local otherwise).
    Enforces timeout and memory limits.
    """
    results: list[TestcaseResult] = []
    runtime_error = None
    
    # Use configured limits or request-specified limits (capped)
    timeout = min(request.timeout_seconds, settings.code_timeout_seconds)
    memory = min(request.memory_limit_mb, settings.code_memory_limit_mb)
    
    for i, testcase in enumerate(request.testcases):
        result = execute_testcase(
            code=request.code,
            language=request.language,
            testcase=testcase,
            testcase_index=i,
            timeout_seconds=timeout,
            memory_limit_mb=memory,
            use_docker=True  # Try Docker, falls back to local
        )
        results.append(result)
        
        # Capture first runtime error
        if result.error and not runtime_error:
            runtime_error = result.error
    
    # Calculate summary
    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    
    avg_time = sum(r.execution_time_ms for r in results) / len(results) if results else 0
    max_memory = max((r.memory_used_mb for r in results), default=0)
    
    summary = ExecutionSummary(
        passed=passed,
        failed=failed,
        total=len(results),
        avg_execution_time_ms=round(avg_time, 2),
        max_memory_mb=round(max_memory, 2)
    )
    
    return ExecutionResponse(
        results=results,
        summary=summary,
        runtime_error=runtime_error
    )

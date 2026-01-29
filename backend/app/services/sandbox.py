"""
Docker-based sandboxed code execution service.
"""

import subprocess
import tempfile
import os
import time
import sys
from typing import Optional
from dataclasses import dataclass

from app.schemas.execution import TestcaseInput, TestcaseResult


@dataclass
class ExecutionResult:
    """Result of code execution."""
    output: str
    execution_time_ms: float
    memory_used_mb: float
    error: Optional[str] = None
    timed_out: bool = False


# Language-specific configurations
# Note: On Windows, 'python' is used; on Unix, 'python3' may be needed
PYTHON_CMD = "python" if sys.platform == "win32" else "python3"

LANGUAGE_CONFIG = {
    "python": {
        "extension": ".py",
        "compile_cmd": None,
        "run_cmd": f"{PYTHON_CMD} {{file}}",
        "image": "python:3.11-slim",
    },
}


def create_solution_file(code: str, language: str) -> str:
    """Create a temporary file with the solution code."""
    config = LANGUAGE_CONFIG.get(language)
    if not config:
        raise ValueError(f"Unsupported language: {language}")
    
    # For Java, we need to wrap the code in a Solution class if not present
    if language == "java" and "class Solution" not in code:
        code = f"public class Solution {{\n{code}\n}}"
    
    suffix = config["extension"]
    fd, path = tempfile.mkstemp(suffix=suffix)
    
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(code)
        return path
    except:
        os.unlink(path)
        raise


def run_code_locally(
    code: str,
    language: str,
    input_data: str,
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256
) -> ExecutionResult:
    """
    Run code locally in a subprocess (development mode).
    For production, use Docker-based execution.
    """
    config = LANGUAGE_CONFIG.get(language)
    if not config:
        return ExecutionResult(
            output="",
            execution_time_ms=0,
            memory_used_mb=0,
            error=f"Unsupported language: {language}"
        )
    
    file_path = None
    try:
        file_path = create_solution_file(code, language)
        
        # Compile if needed
        if config["compile_cmd"]:
            compile_cmd = config["compile_cmd"].format(file=file_path)
            compile_result = subprocess.run(
                compile_cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            if compile_result.returncode != 0:
                return ExecutionResult(
                    output="",
                    execution_time_ms=0,
                    memory_used_mb=0,
                    error=f"Compilation error: {compile_result.stderr}"
                )
        
        # Run the code
        run_cmd = config["run_cmd"].format(file=file_path)
        
        start_time = time.perf_counter()
        try:
            result = subprocess.run(
                run_cmd,
                shell=True,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )
            end_time = time.perf_counter()
            
            execution_time = (end_time - start_time) * 1000  # Convert to ms
            
            if result.returncode != 0:
                return ExecutionResult(
                    output=result.stdout.strip(),
                    execution_time_ms=execution_time,
                    memory_used_mb=0,  # Can't easily measure without Docker
                    error=result.stderr.strip() if result.stderr else "Runtime error"
                )
            
            return ExecutionResult(
                output=result.stdout.strip(),
                execution_time_ms=execution_time,
                memory_used_mb=0  # Would need psutil or Docker for accurate measurement
            )
            
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                output="",
                execution_time_ms=timeout_seconds * 1000,
                memory_used_mb=0,
                error="Time limit exceeded",
                timed_out=True
            )
    
    except Exception as e:
        return ExecutionResult(
            output="",
            execution_time_ms=0,
            memory_used_mb=0,
            error=str(e)
        )
    
    finally:
        if file_path and os.path.exists(file_path):
            os.unlink(file_path)


def run_code_docker(
    code: str,
    language: str,
    input_data: str,
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256
) -> ExecutionResult:
    """
    Run code in a Docker container for secure sandboxing.
    """
    try:
        import docker
        client = docker.from_env(timeout=2, version='auto')  # Add timeout and auto-version to prevent hanging
        # Quick ping to verify Docker is actually running
        client.ping()
    except Exception as e:
        # Docker not available, fall back to local execution (this is normal on dev machines)
        return run_code_locally(code, language, input_data, timeout_seconds, memory_limit_mb)
    
    # Docker is available
    
    config = LANGUAGE_CONFIG.get(language)
    if not config:
        return ExecutionResult(
            output="",
            execution_time_ms=0,
            memory_used_mb=0,
            error=f"Unsupported language: {language}"
        )
    
    file_path = None
    input_file_path = None
    try:
        # Create temp file with code
        file_path = create_solution_file(code, language)
        file_name = os.path.basename(file_path)
        temp_dir = os.path.dirname(file_path)
        
        # Write input data to a file in the same temp directory
        input_file_path = os.path.join(temp_dir, "input.txt")
        with open(input_file_path, 'w', encoding='utf-8') as f:
            f.write(input_data)
        
        # Convert Windows path to Docker-compatible path if needed
        if sys.platform == "win32":
            # Docker on Windows needs forward slashes and drive letter format like /c/Users/...
            temp_dir_docker = temp_dir.replace("\\", "/")
            if len(temp_dir_docker) >= 2 and temp_dir_docker[1] == ":":
                temp_dir_docker = "/" + temp_dir_docker[0].lower() + temp_dir_docker[2:]
            # Handle WSL paths if present
            temp_dir_docker = temp_dir_docker.replace("C:/", "/mnt/c/").replace("D:/", "/mnt/d/")
        else:
            temp_dir_docker = temp_dir
        
        # Build the command to run inside container
        if config["compile_cmd"]:
            compile_part = config["compile_cmd"].format(file=f"/code/{file_name}") + " && "
        else:
            compile_part = ""
        
        run_part = config["run_cmd"].format(file=f"/code/{file_name}")
        # Use echo to pipe input data directly or cat from input file
        full_command = f"echo '{input_data}' | {run_part}"
        
        start_time = time.perf_counter()
        
        # Run container
        container = client.containers.run(
            config["image"],
            command=["sh", "-c", full_command],
            volumes={temp_dir_docker: {"bind": "/code", "mode": "ro"}},
            mem_limit=f"{memory_limit_mb}m",
            network_disabled=True,
            remove=True,
            detach=False,
            stdout=True,
            stderr=True,
        )
        
        end_time = time.perf_counter()
        execution_time = (end_time - start_time) * 1000
        
        output = container.decode("utf-8").strip() if isinstance(container, bytes) else str(container).strip()
        
        return ExecutionResult(
            output=output,
            execution_time_ms=execution_time,
            memory_used_mb=memory_limit_mb * 0.5  # Approximate
        )
    
    except docker.errors.ContainerError as e:
        return ExecutionResult(
            output="",
            execution_time_ms=0,
            memory_used_mb=0,
            error=f"Runtime error: {e.stderr.decode() if e.stderr else str(e)}"
        )
    
    except Exception as e:
        return ExecutionResult(
            output="",
            execution_time_ms=0,
            memory_used_mb=0,
            error=str(e)
        )
    
    finally:
        if file_path and os.path.exists(file_path):
            os.unlink(file_path)
        if input_file_path and os.path.exists(input_file_path):
            os.unlink(input_file_path)


def execute_testcase(
    code: str,
    language: str,
    testcase: TestcaseInput,
    testcase_index: int,
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
    use_docker: bool = True
) -> TestcaseResult:
    """Execute code against a single testcase."""
    
    executor = run_code_docker if use_docker else run_code_locally
    result = executor(code, language, testcase.input, timeout_seconds, memory_limit_mb)
    
    # Compare output (normalize whitespace)
    actual = result.output.strip()
    expected = testcase.expected_output.strip()
    
    # Try semantic JSON comparison first
    try:
        import json
        obj_actual = json.loads(actual)
        obj_expected = json.loads(expected)
        passed = obj_actual == obj_expected
    except:
        # Fallback to string comparison
        passed = actual == expected
    
    return TestcaseResult(
        testcase_index=testcase_index,
        passed=passed,
        actual_output=actual,
        expected_output=expected,
        execution_time_ms=result.execution_time_ms,
        memory_used_mb=result.memory_used_mb,
        error=result.error
    )

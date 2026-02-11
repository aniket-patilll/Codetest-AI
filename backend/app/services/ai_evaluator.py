"""
AI-based code evaluation using Groq (OpenAI-compatible API, free tier).
"""

import json
import re

from openai import AsyncOpenAI, OpenAI

from app.config import get_settings
from app.schemas.evaluation import AIEvaluation


GROQ_BASE_URL = "https://api.groq.com/openai/v1"
settings = get_settings()


def _groq_client() -> OpenAI:
    return OpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)


def _groq_async_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)


EVALUATION_PROMPT = """You are an expert code reviewer evaluating a coding submission for a programming test.

Analyze the following code and provide a structured evaluation:

**Language:** {language}

**Problem Description:**
{problem_description}

**Submitted Code:**
```{language}
{code}
```

**Testcase Results:**
- Passed: {testcases_passed}/{total_testcases}

Please evaluate the code and respond with a JSON object containing:
1. `code_quality_score` (1-10): Assess readability, naming conventions, code structure.
2. `logical_clarity_score` (1-10): Assess algorithm clarity and logical flow.
3. `time_complexity` (string): Big O notation for time complexity (e.g., "O(n)", "O(n log n)").
4. `space_complexity` (string): Big O notation for space complexity.
5. `overall_score` (1-10): Weighted average considering all factors.
6. `suggestions` (array of strings): 3–5 concise, actionable suggestions to improve the code quality, clarity, performance, or robustness.
7. `justification` (string): A short paragraph (3–6 sentences) that explains *why* you assigned these scores, referencing specific aspects of the code and testcase results.

Respond ONLY with a complete, valid JSON object. Ensure the JSON is complete with all required fields and properly closed braces. No markdown formatting, no extra text, just pure JSON.
"""


def extract_json_from_text(text: str) -> str:
    """
    Robustly extract JSON string from text that might contain markdown or other noise.
    Handles incomplete/truncated JSON responses.
    """
    text = text.strip()
    
    # Try to find markdown code blocks first
    json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    if json_match:
        text = json_match.group(1)
    
    # Find the first '{' and the last '}'
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_str = text[start_idx:end_idx+1]
        # Remove trailing commas which are common in LLM JSON output but invalid in standard JSON
        json_str = re.sub(r',(\s*})', r'\1', json_str)
        return json_str
    
    # If we have an incomplete JSON (starts with { but no closing }), try to reconstruct it
    if start_idx != -1 and end_idx == -1:
        # Try to find the last complete key-value pair
        incomplete_json = text[start_idx:]
        # Look for common patterns that might indicate the end of JSON
        last_comma = incomplete_json.rfind(',')
        last_colon = incomplete_json.rfind(':')
        
        # If we have a trailing comma or incomplete value, try to complete it
        if last_comma > last_colon and last_comma > 0:
            # Remove trailing comma and close the JSON
            incomplete_json = incomplete_json[:last_comma] + '}'
            return incomplete_json
        
        # If we have an incomplete value, try to close it with reasonable defaults
        if ':' in incomplete_json and incomplete_json.endswith('"'):
            # If it ends with a quote, try to close the string and add a closing brace
            incomplete_json = incomplete_json + '"}}'
            return incomplete_json
        elif ':' in incomplete_json:
            # If there's a colon but no closing quote, add reasonable defaults
            incomplete_json = incomplete_json + ' "Unknown"}}'
            return incomplete_json
    
    return text


def _parse_evaluation_response(response_text: str, testcases_passed: int, total_testcases: int) -> AIEvaluation:
    """Parse LLM response text into AIEvaluation, with fallback on parse errors."""
    if not response_text or not response_text.strip():
        base_score = 8.0 if testcases_passed == total_testcases else 5.0
        return AIEvaluation(
            code_quality_score=base_score,
            logical_clarity_score=base_score,
            time_complexity="Unknown",
            space_complexity="Unknown",
            suggestions=[
                "AI evaluation returned no content (safety filter or error). Consider reviewing the solution manually."
            ],
            justification="The AI model did not return any usable evaluation. Default scores were assigned based on testcase results.",
            overall_score=base_score,
        )
    json_str = extract_json_from_text(response_text)
    try:
        evaluation_data = json.loads(json_str)
    except json.JSONDecodeError:
        fixed_json = json_str
        fixed_json = re.sub(r',(\s*[}\]])', r'\1', fixed_json)
        fixed_json = re.sub(r"(?<!\\)'", '"', fixed_json)
        fixed_json = re.sub(r'([^:]+:\s*"[^"]*)\s+"([^"]*"[^}]*})', r'\1", "\2', fixed_json)
        fixed_json = re.sub(r'("\w+")\s*([^,}\]])', r'\1, \2', fixed_json)
        brace_count = fixed_json.count('{') - fixed_json.count('}')
        if brace_count > 0:
            fixed_json += '}' * brace_count
        try:
            evaluation_data = json.loads(fixed_json)
        except json.JSONDecodeError:
            base_score = 8.0 if testcases_passed == total_testcases else 5.0
            return AIEvaluation(
                code_quality_score=base_score,
                logical_clarity_score=base_score,
                time_complexity="Unknown",
                space_complexity="Unknown",
                suggestions=[],
                justification="The AI evaluation JSON was invalid and could not be parsed. Default scores were assigned based on testcase results.",
                overall_score=base_score,
            )

    return AIEvaluation(
        code_quality_score=float(evaluation_data.get("code_quality_score", 5)),
        logical_clarity_score=float(evaluation_data.get("logical_clarity_score", 5)),
        time_complexity=evaluation_data.get("time_complexity", "Unknown"),
        space_complexity=evaluation_data.get("space_complexity", "Unknown"),
        suggestions=list(evaluation_data.get("suggestions", []) or []),
        justification=evaluation_data.get("justification"),
        overall_score=float(evaluation_data.get("overall_score", 5)),
    )


async def evaluate_code_with_ai(
    code: str,
    language: str,
    problem_description: str,
    testcases_passed: int,
    total_testcases: int
) -> AIEvaluation:
    """
    Evaluate code using Groq (free-tier friendly).

    Args:
        code: The submitted source code
        language: Programming language
        problem_description: Description of the problem
        testcases_passed: Number of testcases passed
        total_testcases: Total number of testcases

    Returns:
        AIEvaluation with structured scores and feedback
    """
    base_score = 8.0 if testcases_passed == total_testcases else 5.0
    fallback = AIEvaluation(
        code_quality_score=base_score,
        logical_clarity_score=base_score,
        time_complexity="Unknown",
        space_complexity="Unknown",
        overall_score=base_score
    )
    try:
        client = _groq_async_client()
        prompt = EVALUATION_PROMPT.format(
            language=language,
            problem_description=problem_description,
            code=code,
            testcases_passed=testcases_passed,
            total_testcases=total_testcases
        )
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024,
        )
        content = (response.choices[0].message.content or "").strip()
        return _parse_evaluation_response(content, testcases_passed, total_testcases)
    except Exception:
        return fallback


def evaluate_code_sync(
    code: str,
    language: str,
    problem_description: str,
    testcases_passed: int,
    total_testcases: int
) -> AIEvaluation:
    """
    Synchronous version of code evaluation using Groq.
    """
    base_score = 8.0 if testcases_passed == total_testcases else 5.0
    fallback = AIEvaluation(
        code_quality_score=base_score,
        logical_clarity_score=base_score,
        time_complexity="Unknown",
        space_complexity="Unknown",
        overall_score=base_score
    )
    try:
        client = _groq_client()
        prompt = EVALUATION_PROMPT.format(
            language=language,
            problem_description=problem_description,
            code=code,
            testcases_passed=testcases_passed,
            total_testcases=total_testcases
        )
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024,
        )
        content = (response.choices[0].message.content or "").strip()
        return _parse_evaluation_response(content, testcases_passed, total_testcases)
    except Exception:
        return fallback

"""
AI-based content generation using Groq (OpenAI-compatible API, free tier).
"""

import json
import re

from openai import AsyncOpenAI

from app.config import get_settings


GROQ_BASE_URL = "https://api.groq.com/openai/v1"
settings = get_settings()


def _groq_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)


# Simplified prompt - AI only generates Python driver code
GENERATION_PROMPT = """You are an expert coding interview question generator.
Your task is to generate a coding problem in strict JSON format.

Topic: "{topic}"
Difficulty: {difficulty}

INSTRUCTIONS:
1. Create a function name based on the problem title by converting it to snake_case
2. For example: "Two Sum" becomes "two_sum", "Search Insert Position" becomes "search_insert_position"
3. Use this function name consistently in both starter_code and driver_code

RESPONSE FORMAT:
You MUST return a VALID JSON OBJECT. Do not include any markdown formatting outside the JSON. Do not include prologue or epilogue text.

JSON Structure:
{{
  "title": "Problem Title",
  "description": "Problem description in Markdown.",
  "difficulty": "{difficulty}",
  "testcases": [
    {{
      "input": "{{\"nums\": [1, 2], \"target\": 3}}",
      "expected_output": "3",
      "is_hidden": false
    }}
  ],
  "code_snippets": {{
    "python": {{
      "starter_code": "def function_name(params):\\n    pass",
      "driver_code": "import sys\\nimport json\\nif __name__ == '__main__':\\n    data = json.loads(sys.stdin.read())\\n    print(function_name(data['param1'], data['param2']))"
    }}
  }}
}}

REQUIREMENTS:
1.  **JSON ONLY**: The response must be a valid JSON object.
2.  **Function Naming**: Create a snake_case function name from the problem title
3.  **Consistency**: Use the same function name in both starter_code and driver_code
4.  **Testcases**: Generate {testcase_count} testcases. Input must be a JSON object string.
5.  **Starter Code**: MUST be INCOMPLETE placeholder code. Only include function signature with `pass` or a comment like `# Your code here`. DO NOT include any algorithm implementation, loops, conditionals, or solution logic. Example: `def function_name(params):\\n    pass` or `def function_name(params):\\n    # Your code here\\n    pass`
6.  **Python Driver**: ONLY parse JSON, call the named function, print result. NO algorithm logic.
7.  **Parameters**: Ensure starter code parameters match testcase structure.

CRITICAL: The starter_code must NOT contain the solution. It should only have the function signature and a placeholder (pass or comment). Students will write the actual implementation.
"""


async def generate_question_with_ai(topic: str, difficulty: str, testcase_count: int = 5):
    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            client = _groq_client()
            formatted_prompt = GENERATION_PROMPT.format(
                topic=topic, difficulty=difficulty, testcase_count=testcase_count
            )
            print(f"[DEBUG] Generating question (attempt {attempt+1}/{max_retries}): prompt='{topic}'")

            response = await client.chat.completions.create(
                model=settings.groq_model,
                messages=[{"role": "user", "content": formatted_prompt}],
                temperature=0.7,
                max_tokens=4096,
            )

            raw = response.choices[0].message.content or ""
            response_text = raw.strip()

            if not response_text:
                raise ValueError("AI response was empty")

            # Clean markdown code blocks if present
            if "```json" in response_text:
                match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1)
            elif "```" in response_text:
                match = re.search(r'```\s*(.*?)\s*```', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1)

            result = json.loads(response_text)
            validate_python_code(result.get('code_snippets', {}).get('python', {}))

            print(f"[DEBUG] Generation successful on attempt {attempt+1}")
            return result

        except json.JSONDecodeError as e:
            print(f"[WARNING] JSON Parse Error on attempt {attempt+1}: {e}")
            last_error = e
        except Exception as e:
            print(f"[WARNING] Generation Error on attempt {attempt+1}: {e}")
            last_error = e

    print(f"[ERROR] Failed after {max_retries} attempts.")
    raise last_error if last_error else ValueError("Failed to generate question after multiple attempts")


def validate_python_code(python_snippet: dict) -> None:
    """Validate that Python starter_code is incomplete and driver_code doesn't contain algorithm logic."""
    driver = python_snippet.get('driver_code', '')
    starter = python_snippet.get('starter_code', '')

    if not driver or not starter:
        return

    # Extract function name from starter code (first def line)
    func_match = re.search(r'def\s+(\w+)\s*\(', starter)
    if not func_match:
        raise ValueError("Starter code must contain a function definition")

    func_name = func_match.group(1)

    # Driver must call the same function name
    if f'{func_name}(' not in driver:
        raise ValueError(f"Python driver_code MUST call the {func_name}() function!")

    # Validate starter_code is incomplete (should only have function signature + pass/comment)
    # Remove comments and empty lines, then check what remains
    starter_lines = [l.strip() for l in starter.split('\n') if l.strip()]
    starter_lines_no_comments = [l for l in starter_lines if not l.startswith('#')]
    
    # Find the function definition line
    func_def_idx = None
    for i, line in enumerate(starter_lines_no_comments):
        if line.startswith('def '):
            func_def_idx = i
            break
    
    if func_def_idx is None:
        raise ValueError("Starter code must contain a function definition")
    
    # Everything after the function definition should be minimal (just pass or a comment)
    body_lines = starter_lines_no_comments[func_def_idx + 1:]
    
    # Check for forbidden patterns that indicate a solution
    FORBIDDEN_STARTER_PATTERNS = [
        (r'\bfor\s+\w+\s+in\s+', 'for loop'),
        (r'\bwhile\s+', 'while loop'),
        (r'\bif\s+.*:', 'if statement'),
        (r'\belif\s+.*:', 'elif statement'),
        (r'\breturn\s+[^#\n]', 'return statement with value'),
        (r'\brange\s*\(', 'range() call'),
        (r'\benumerate\s*\(', 'enumerate() call'),
        (r'\bsorted\s*\(', 'sorted() call'),
    ]
    
    body_text = '\n'.join(body_lines)
    
    # If body has more than just "pass", it's likely a solution
    body_clean = body_text.strip()
    if body_clean and body_clean != 'pass':
        # Check for forbidden patterns
        for pattern, desc in FORBIDDEN_STARTER_PATTERNS:
            if re.search(pattern, body_text, re.IGNORECASE):
                raise ValueError(
                    f"INVALID Python starter_code: Contains solution logic ({desc})! "
                    f"Starter code must only have function signature with 'pass' or a comment. "
                    f"Found: {body_text[:100]}..."
                )
        
        # If there are multiple non-empty lines (beyond def), it's likely a solution
        if len(body_lines) > 1:
            raise ValueError(
                f"INVALID Python starter_code: Contains multiple lines of implementation code! "
                f"Starter code must only have function signature with 'pass' or a comment. "
                f"Found {len(body_lines)} lines of code after function definition."
            )

    # Validate driver_code doesn't contain algorithm logic
    FORBIDDEN_DRIVER_PATTERNS = [
        r'\bfor\s+\w+\s+in\s+range\(',
        r'\bfor\s+\w+,\s*\w+\s+in\s+enumerate',
        r'\bwhile\s+(left|right|low|high|i|j)',
        r'\[\s*\w+\s+for\s+\w+\s+in',
        r'\bsorted\s*\(',
        r'\bleft\s*,\s*right\s*=',
        r'\blow\s*,\s*high\s*=',
        r'\bdp\s*=\s*\[',
        r'\bresult\s*=\s*\[\]',
    ]

    for pattern in FORBIDDEN_DRIVER_PATTERNS:
        if re.search(pattern, driver, re.IGNORECASE):
            raise ValueError(
                f"INVALID Python driver_code: Contains algorithm logic. "
                f"Driver code must ONLY parse input, call solution(), and print result!"
            )

    # Check driver length
    driver_lines = [l.strip() for l in driver.split('\n') if l.strip() and not l.strip().startswith('#')]
    if len(driver_lines) > 12:
        raise ValueError(
            f"Python driver_code is too long ({len(driver_lines)} lines). "
            f"It should only parse input, call solution(), and print result!"
        )

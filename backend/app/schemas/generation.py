from pydantic import BaseModel
from typing import List, Optional, Dict

class GenerateQuestionRequest(BaseModel):
    prompt: str
    difficulty: str = "medium"
    testcase_count: int = 5

class GeneratedTestcase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False

class CodeSnippet(BaseModel):
    starter_code: str
    driver_code: str

class GeneratedQuestionResponse(BaseModel):
    title: str
    description: str
    difficulty: str
    testcases: List[GeneratedTestcase]
    code_snippets: Dict[str, CodeSnippet]

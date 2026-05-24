from pydantic import BaseModel
from typing import Optional


class ErrorInput(BaseModel):
    service_name: str
    error_code: str
    message: str
    stack_trace: Optional[str] = None
    file: Optional[str] = None
    line: Optional[int] = None
    handler: Optional[str] = None


class TriageRequest(BaseModel):
    errors: list[ErrorInput]


class TriageResult(BaseModel):
    category: str
    severity: str
    auto_fixable: str
    suspected_file: Optional[str] = None
    suspected_line: Optional[int] = None
    fix_suggestion: str
    confidence: int


class TriageResponse(BaseModel):
    results: list[TriageResult]

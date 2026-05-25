from pydantic import BaseModel, field_validator
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

    @field_validator('confidence', mode='before')
    @classmethod
    def coerce_confidence(cls, v):
        val = float(v)
        if val <= 1.0:
            val = val * 100
        return int(val)


class TriageResponse(BaseModel):
    results: list[TriageResult]

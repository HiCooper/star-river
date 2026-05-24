import asyncio
import json
import os
import httpx
from .models import ErrorInput, TriageResult
from .prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"


def _build_user_prompt(e: ErrorInput) -> str:
    return USER_PROMPT_TEMPLATE.format(
        service_name=e.service_name,
        error_code=e.error_code,
        message=e.message,
        file=e.file or "unknown",
        line=e.line or 0,
        handler=e.handler or "unknown",
        stack_trace=(e.stack_trace or "")[:500],
    )


async def _classify_one(client: httpx.AsyncClient, api_key: str, e: ErrorInput) -> TriageResult:
    user_prompt = _build_user_prompt(e)
    try:
        resp = await client.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 500,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        parsed = json.loads(content)
        return TriageResult(
            category=parsed.get("category", "unknown"),
            severity=parsed.get("severity", "medium"),
            auto_fixable=parsed.get("auto_fixable", "no"),
            suspected_file=parsed.get("suspected_file"),
            suspected_line=parsed.get("suspected_line"),
            fix_suggestion=parsed.get("fix_suggestion", ""),
            confidence=parsed.get("confidence", 50),
        )
    except json.JSONDecodeError:
        return TriageResult(
            category="unknown", severity="medium", auto_fixable="no",
            fix_suggestion="LLM response parse failed",
            confidence=0,
        )
    except Exception as ex:
        return TriageResult(
            category="unknown", severity="medium", auto_fixable="no",
            fix_suggestion=f"LLM call failed: {str(ex)}",
            confidence=0,
        )


async def classify_errors(errors: list[ErrorInput]) -> list[TriageResult]:
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not set")

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [_classify_one(client, api_key, e) for e in errors]
        return list(await asyncio.gather(*tasks))

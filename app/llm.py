"""LLM gateway with Gemini support and a deterministic local fallback."""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from app.config import GEMINI_API_KEY, settings
from app.guardrails import check_input, check_output, GuardrailViolation

logger = logging.getLogger(__name__)
MODEL_NAME = settings.gemini_model
SYSTEM_PROMPT = (
    "You are Orbit, a concise and helpful AI engineering assistant. Never invent facts. "
    "Preserve the substance of every answer, but format it in Markdown appropriate to the "
    "question: use a short title and summary for normal questions, numbered steps for "
    "instructions, tables for comparisons, clear sections for technical/API designs, and "
    " fenced code blocks for code. Do not force a template when it would not help."
)
MAX_HISTORY_MESSAGES = 10
conversations: dict[str, list[dict]] = defaultdict(list)


class LLMProviderError(RuntimeError):
    """A hosted model request failed without a safe local response."""


class RateLimitError(LLMProviderError):
    """The hosted model rejected a request because its quota was exceeded."""

try:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
    provider_init_error = None
except Exception as exc:  # Optional provider must never prevent local startup.
    client = None
    provider_init_error = type(exc).__name__
    logger.error("Gemini client initialization failed (%s).", provider_init_error)


def _history(session_id: str, message: str) -> list[dict]:
    return conversations[session_id][-MAX_HISTORY_MESSAGES:] + [
        {"role": "user", "parts": [{"text": message}]}
    ]


def _fallback(message: str) -> str:
    return ("I’m running in local mode, so no hosted model is configured. "
            f"Here’s a useful starting point for: {message.strip()}\n\n"
            "Connect GEMINI_API_KEY to enable model-backed answers.")


def _status_code(exc: Exception) -> int | None:
    for candidate in (getattr(exc, "status_code", None), getattr(exc, "code", None)):
        if isinstance(candidate, int):
            return candidate
    response = getattr(exc, "response", None)
    code = getattr(response, "status_code", None)
    return code if isinstance(code, int) else None


def _raise_provider_error(exc: Exception) -> None:
    if _status_code(exc) == 429:
        raise RateLimitError("Gemini rate limit exceeded. Try again later.") from exc
    logger.error("Gemini request failed (%s).", type(exc).__name__)
    raise LLMProviderError("Gemini request failed. Please try again later.") from exc


def generate_response(session_id: str, message: str) -> str:
    valid, reason = check_input(message)
    if not valid:
        raise GuardrailViolation(reason)
    start = time.perf_counter()
    try:
        if client is None:
            if GEMINI_API_KEY and provider_init_error:
                raise LLMProviderError("Gemini client is unavailable.")
            answer = _fallback(message)
        else:
            response = client.models.generate_content(
                model=MODEL_NAME, contents=_history(session_id, message),
                config={"system_instruction": SYSTEM_PROMPT, "temperature": 0.3, "max_output_tokens": 1000},
            )
            answer = response.text or ""
        valid, reason = check_output(answer)
        if not valid:
            raise GuardrailViolation(reason)
        conversations[session_id].extend([
            {"role": "user", "parts": [{"text": message}]},
            {"role": "model", "parts": [{"text": answer}]},
        ])
        logger.info("chat completed session=%s latency_ms=%.1f", session_id, (time.perf_counter() - start) * 1000)
        return answer
    except GuardrailViolation:
        raise
    except Exception as exc:
        _raise_provider_error(exc)


def generate_stream(session_id: str, message: str):
    valid, reason = check_input(message)
    if not valid:
        raise GuardrailViolation(reason)
    if client is None:
        if GEMINI_API_KEY and provider_init_error:
            raise LLMProviderError("Gemini client is unavailable.")
        answer = _fallback(message)
        for word in answer.split(" "):
            yield word + " "
        conversations[session_id].extend([
            {"role": "user", "parts": [{"text": message}]},
            {"role": "model", "parts": [{"text": answer}]},
        ])
        return
    full = ""
    try:
        response = client.models.generate_content_stream(
            model=MODEL_NAME, contents=_history(session_id, message),
            config={"system_instruction": SYSTEM_PROMPT, "temperature": 0.3, "max_output_tokens": 1000},
        )
        for chunk in response:
            text = getattr(chunk, "text", None)
            if text:
                full += text
                yield text
        valid, reason = check_output(full)
        if not valid:
            raise GuardrailViolation(reason)
        conversations[session_id].extend([
            {"role": "user", "parts": [{"text": message}]},
            {"role": "model", "parts": [{"text": full}]},
        ])
    except GuardrailViolation:
        raise
    except Exception as exc:
        _raise_provider_error(exc)


def clear_conversation(session_id: str) -> None:
    conversations.pop(session_id, None)

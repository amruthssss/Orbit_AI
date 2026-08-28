"""Allow-listed, bounded tools for the workflow endpoint."""
from __future__ import annotations

import re
from collections.abc import Callable

MAX_WORKFLOW_STEPS = 8
MAX_STEP_NAME = 60


def _understand(value: str) -> str:
    return f"Task understood: {value.strip()[:500]}"


def _draft(value: str) -> str:
    return value.strip()


def _review(value: str) -> str:
    return f"{value.strip()}\n\nReview: verify claims, safety, and required next steps."


def _summarize(value: str) -> str:
    words = value.split()
    return " ".join(words[:80]) + ("…" if len(words) > 80 else "")


TOOL_REGISTRY: dict[str, Callable[[str], str]] = {
    "understand": _understand,
    "draft": _draft,
    "review": _review,
    "summarize": _summarize,
}


def run_tools(value: str, steps: list[str]) -> tuple[str, list[dict[str, str]]]:
    if len(steps) > MAX_WORKFLOW_STEPS:
        raise ValueError(f"A workflow may contain at most {MAX_WORKFLOW_STEPS} steps.")
    if not value.strip():
        raise ValueError("Workflow input cannot be empty.")
    output = value.strip()
    completed = []
    for raw_name in steps:
        name = re.sub(r"\s+", " ", raw_name.strip()).lower()
        if not name or len(name) > MAX_STEP_NAME or name not in TOOL_REGISTRY:
            raise ValueError(f"Unsupported workflow tool: {raw_name!r}.")
        output = TOOL_REGISTRY[name](output)
        completed.append({"name": raw_name.strip(), "status": "completed"})
    return output, completed

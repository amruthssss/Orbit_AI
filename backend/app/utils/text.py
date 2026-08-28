"""Text normalization helpers shared by adapters."""


def normalize_text(value: str) -> str:
    """Collapse surrounding whitespace without changing content semantics."""
    return " ".join(value.split())

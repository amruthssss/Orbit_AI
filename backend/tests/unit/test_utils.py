"""Tests for backend utility contracts."""

from backend.app.utils import normalize_text


def test_normalize_text() -> None:
    """Whitespace normalization remains deterministic."""
    assert normalize_text("  orbit   ai ") == "orbit ai"

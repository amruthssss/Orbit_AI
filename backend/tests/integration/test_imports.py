"""Smoke tests for compatibility imports."""

from backend.app.main import app


def test_application_imports() -> None:
    """The modular entry point exposes the existing FastAPI app."""
    assert app.title

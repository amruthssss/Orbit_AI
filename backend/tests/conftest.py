"""Fixtures shared by modular backend tests."""

import os

import pytest

# Tests must opt in to the in-memory SQLite adapter explicitly. Production
# never selects SQLite implicitly.
os.environ.setdefault("TESTING", "1")


@pytest.fixture
def sample_text() -> str:
    """Provide a deterministic text fixture."""
    return "Orbit modular backend"

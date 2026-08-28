"""Identifier helpers."""

from uuid import uuid4


def new_id() -> str:
    """Return a new opaque identifier."""
    return str(uuid4())

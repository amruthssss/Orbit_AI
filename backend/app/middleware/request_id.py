"""Request identifier helper for observability middleware."""

from uuid import uuid4


def request_id() -> str:
    """Create a correlation identifier for a request."""
    return uuid4().hex

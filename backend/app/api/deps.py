"""Shared dependency hooks for future API routes."""

from collections.abc import Iterator


def request_context() -> Iterator[None]:
    """Yield a request-scoped context placeholder."""
    yield

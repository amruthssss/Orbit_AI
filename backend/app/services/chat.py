"""Chat service facade over the existing local/model implementation."""

from app.llm import generate_response


def generate(session_id: str, message: str) -> str:
    """Generate a response while retaining the established API behavior."""
    return generate_response(session_id, message)

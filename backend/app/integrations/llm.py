"""LLM provider protocol used by future adapters."""

from typing import Protocol


class LLMProvider(Protocol):
    """Minimal text generation contract."""

    def generate(self, prompt: str) -> str:
        """Generate text for a prompt."""
        ...

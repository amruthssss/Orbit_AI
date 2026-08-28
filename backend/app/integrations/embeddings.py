"""Embedding provider protocol used by retrieval adapters."""

from typing import Protocol


class EmbeddingProvider(Protocol):
    """Minimal vectorization contract."""

    def embed(self, text: str) -> list[float]:
        """Return a vector representation for text."""
        ...

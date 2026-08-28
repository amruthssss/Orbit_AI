"""Knowledge document repository seam."""

from collections.abc import Sequence
from typing import Protocol

from ..models import Document


class DocumentRepository(Protocol):
    """Storage contract for knowledge documents."""

    def list(self, collection: str = "default") -> Sequence[Document]:
        """List documents in a collection."""
        ...

"""Conversation repository seam."""

from typing import Protocol

from ..models import Conversation


class ConversationRepository(Protocol):
    """Storage contract for conversations."""

    def get(self, session_id: str) -> Conversation | None:
        """Load a conversation by session identifier."""
        ...

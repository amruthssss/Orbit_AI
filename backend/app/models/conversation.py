"""Conversation domain record."""

from dataclasses import dataclass, field

from ..db.base import ModelRecord


@dataclass
class Conversation(ModelRecord):
    """A session containing ordered message payloads."""

    messages: list[dict[str, str]] = field(default_factory=list)

"""Generic repository protocol for future storage implementations."""

from typing import Protocol, TypeVar

RecordT = TypeVar("RecordT")


class Repository(Protocol[RecordT]):
    """Minimal read/write contract for a domain repository."""

    def get(self, record_id: str) -> RecordT | None:
        """Return a record by identifier when it exists."""
        ...

    def save(self, record: RecordT) -> RecordT:
        """Persist and return a record."""
        ...

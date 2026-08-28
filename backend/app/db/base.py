"""Shared database model marker used before an ORM is introduced."""

from dataclasses import dataclass


@dataclass
class ModelRecord:
    """Minimal typed record base for persistence adapters."""

    id: str

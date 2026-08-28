"""User domain record."""

from dataclasses import dataclass

from ..db.base import ModelRecord


@dataclass
class User(ModelRecord):
    """A user identity used by authentication adapters."""

    email: str = ""
    name: str = ""

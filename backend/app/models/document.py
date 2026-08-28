"""Knowledge document domain record."""

from dataclasses import dataclass

from ..db.base import ModelRecord


@dataclass
class Document(ModelRecord):
    """A text document belonging to a named collection."""

    name: str = ""
    collection: str = "default"
    text: str = ""

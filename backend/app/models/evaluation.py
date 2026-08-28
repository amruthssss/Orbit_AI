"""Evaluation domain record."""

from dataclasses import dataclass

from ..db.base import ModelRecord


@dataclass
class Evaluation(ModelRecord):
    """A scored prompt/response pair."""

    score: float = 0.0
    prompt: str = ""

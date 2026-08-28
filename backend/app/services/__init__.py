"""Domain service boundary for the existing application services."""

from .chat import generate
from .knowledge import retrieve

__all__ = ["generate", "retrieve"]

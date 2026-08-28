"""Database access package and future migration boundary."""

from .session import database_url

__all__ = ["database_url"]

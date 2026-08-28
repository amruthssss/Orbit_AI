"""Database session compatibility exports."""

from app.config import settings
from app.storage import init_db, storage_status, transaction

database_url: str | None = settings.database_url


def get_database_url() -> str | None:
    """Return the configured database URL."""
    return database_url


__all__ = ["database_url", "get_database_url", "init_db", "storage_status", "transaction"]

"""Database table metadata compatibility exports."""

from app.storage import (
    documents_table,
    evaluations_table,
    metadata,
    usage_table,
    users_table,
)

__all__ = [
    "metadata",
    "documents_table",
    "users_table",
    "usage_table",
    "evaluations_table",
]

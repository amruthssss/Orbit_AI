"""Database table metadata compatibility exports."""

from app.storage import (
    document_chunks_table,
    documents_table,
    evaluations_table,
    metadata,
    usage_table,
    users_table,
)

__all__ = [
    "metadata",
    "documents_table",
    "document_chunks_table",
    "users_table",
    "usage_table",
    "evaluations_table",
]

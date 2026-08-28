"""Database repository compatibility exports."""

from app.storage import (
    add_document,
    create_user,
    delete_document,
    documents,
    get_user,
    get_document,
    list_documents,
    record_usage,
    save_evaluation,
    update_document,
    usage_summary,
)

__all__ = [
    "add_document",
    "list_documents",
    "get_document",
    "update_document",
    "delete_document",
    "documents",
    "record_usage",
    "usage_summary",
    "save_evaluation",
    "create_user",
    "get_user",
]

"""Cache service compatibility exports."""

from app.cache import (
    allow_request,
    cache_delete,
    cache_get,
    cache_set,
    cache_status,
    cache_ttl,
)

__all__ = [
    "allow_request",
    "cache_set",
    "cache_get",
    "cache_delete",
    "cache_ttl",
    "cache_status",
]

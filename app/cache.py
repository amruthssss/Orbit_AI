"""Upstash/Redis cache and distributed rate limiting.

Redis failures are observable and fall back to process-local state; requests
are never silently treated as successful Redis operations.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)
_windows: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))
_local_cache: dict[str, tuple[Any, float | None]] = {}
_lock = threading.RLock()
_redis: Any = None
_redis_mode = "disabled"
_redis_error: str | None = None


def _configure() -> None:
    global _redis, _redis_mode, _redis_error
    if settings.testing or not settings.redis_url:
        _redis_mode = "disabled"
        return
    url = settings.redis_url.strip()
    try:
        if url.startswith(("http://", "https://")):
            if not settings.redis_token:
                _redis_mode = "unavailable"
                _redis_error = "missing_rest_token"
                logger.warning("Redis REST client unavailable (%s).", _redis_error)
                return
            import httpx
            _redis = httpx.Client(
                base_url=url.rstrip("/"),
                headers={"Authorization": f"Bearer {settings.redis_token}"},
                timeout=2.0,
            )
            _redis_mode = "upstash-rest"
        else:
            import redis
            _redis = redis.Redis.from_url(url, decode_responses=True, socket_timeout=2)
            _redis.ping()
            _redis_mode = "redis"
    except Exception as exc:
        _redis_mode = "unavailable"
        _redis_error = type(exc).__name__
        logger.warning("Redis client unavailable (%s).", _redis_error)


_configure()


def _rest(command: list[Any]) -> Any:
    response = _redis.post("/", json=command)
    response.raise_for_status()
    return response.json().get("result")


def _remote(op: str, *args: Any) -> Any:
    if _redis_mode == "upstash-rest":
        command = {"delete": "DEL"}.get(op, op.upper())
        return _rest([command, *args])
    if _redis_mode == "redis":
        return getattr(_redis, op)(*args)
    return None


def _remote_call(op: str, *args: Any) -> tuple[bool, Any]:
    global _redis_mode, _redis_error
    if _redis_mode not in {"redis", "upstash-rest"}:
        return False, None
    try:
        return True, _remote(op, *args)
    except Exception as exc:
        _redis_mode = "unavailable"
        _redis_error = type(exc).__name__
        logger.warning("Redis operation failed op=%s (%s); using local fallback.", op, _redis_error)
        return False, None


def cache_set(key: str, value: str, ttl: int | None = None) -> bool:
    args: list[Any] = [key, value]
    if ttl is not None:
        args.extend(["EX", max(1, int(ttl))])
    ok, result = _remote_call("set", *args)
    if ok:
        return result in (True, "OK", None)
    expires = time.time() + ttl if ttl is not None else None
    with _lock:
        _local_cache[key] = (value, expires)
    return True


def cache_get(key: str) -> str | None:
    ok, result = _remote_call("get", key)
    if ok:
        return result
    with _lock:
        entry = _local_cache.get(key)
        if entry is None:
            return None
        value, expires = entry
        if expires is not None and expires <= time.time():
            _local_cache.pop(key, None)
            return None
        return value


def cache_delete(key: str) -> bool:
    ok, result = _remote_call("delete", key)
    if ok:
        return bool(result)
    with _lock:
        return _local_cache.pop(key, None) is not None


def cache_ttl(key: str) -> int:
    ok, result = _remote_call("ttl", key)
    if ok:
        return int(result)
    with _lock:
        entry = _local_cache.get(key)
        if entry is None or entry[1] is None:
            return -1 if entry else -2
        remaining = int(entry[1] - time.time())
        return max(remaining, -2)


def cache_status() -> dict[str, str | None]:
    return {"mode": _redis_mode, "error": _redis_error}


def allow_request(key: str) -> bool:
    """Fixed-window limiter using Redis when available."""
    window = int(time.time() // 60)
    redis_key = f"orbit:rate:{key}:{window}"
    ok, count = _remote_call("incr", redis_key)
    if ok:
        if int(count) == 1:
            _remote_call("expire", redis_key, 61)
        return int(count) <= settings.rate_limit
    with _lock:
        old_window, local_count = _windows[key]
        if old_window != window:
            _windows[key] = (window, 1)
            return True
        _windows[key] = (window, local_count + 1)
        return local_count < settings.rate_limit

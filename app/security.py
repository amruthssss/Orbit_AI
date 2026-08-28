"""Small, dependency-free JWT authentication implementation."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from app.config import settings


class AuthenticationError(ValueError):
    """Raised when a bearer token is missing or invalid."""


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _key() -> bytes:
    if not settings.secret_key:
        if settings.testing or settings.environment.lower() in {"development", "dev", "test"}:
            return b"development-only-key-change-me"
        raise AuthenticationError("SECRET_KEY is not configured.")
    return settings.secret_key.encode("utf-8")


def create_access_token(user: dict[str, Any]) -> str:
    now = int(time.time())
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64(json.dumps({
        "sub": user["id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "iat": now,
        "exp": now + settings.jwt_expire_minutes * 60,
    }, separators=(",", ":")).encode())
    unsigned = f"{header}.{payload}".encode("ascii")
    signature = _b64(hmac.new(_key(), unsigned, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header, payload, signature = token.split(".")
        header_raw = header + "=" * (-len(header) % 4)
        header_claims = json.loads(base64.urlsafe_b64decode(header_raw).decode("utf-8"))
        if header_claims.get("alg") != "HS256" or header_claims.get("typ") != "JWT":
            raise AuthenticationError("Invalid authentication token.")
        unsigned = f"{header}.{payload}".encode("ascii")
        expected = _b64(hmac.new(_key(), unsigned, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise AuthenticationError("Invalid authentication token.")
        raw = payload + "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(raw).decode("utf-8"))
        if (
            not isinstance(claims, dict)
            or not isinstance(claims.get("sub"), str)
            or not isinstance(claims.get("email"), str)
            or not isinstance(claims.get("exp"), (int, float))
        ):
            raise AuthenticationError("Invalid authentication token.")
        if claims["exp"] < time.time():
            raise AuthenticationError("Authentication token has expired.")
        return claims
    except AuthenticationError:
        raise
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeError):
        raise AuthenticationError("Invalid authentication token.")

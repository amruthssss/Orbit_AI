"""Request dependencies shared by protected API routes."""
from __future__ import annotations

from fastapi import Header, HTTPException

from app.config import settings
from app.security import AuthenticationError, decode_access_token
from app.storage import StorageUnavailable, get_user


def current_user(authorization: str | None = Header(default=None)) -> dict | None:
    """Resolve the bearer token, with anonymous access only in non-production."""
    if not authorization:
        if settings.environment.lower() in {"development", "dev", "test"} and settings.testing:
            return None
        raise HTTPException(401, "Authentication required.", headers={"WWW-Authenticate": "Bearer"})
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Use a Bearer token.", headers={"WWW-Authenticate": "Bearer"})
    try:
        claims = decode_access_token(token)
        user = get_user(claims["email"])
    except AuthenticationError as exc:
        raise HTTPException(401, "Invalid authentication token.",
                            headers={"WWW-Authenticate": "Bearer"}) from exc
    except StorageUnavailable as exc:
        raise HTTPException(503, "Authentication service unavailable.") from exc
    if not user or user["id"] != claims.get("sub"):
        raise HTTPException(401, "Invalid authentication token.",
                            headers={"WWW-Authenticate": "Bearer"})
    return {"id": user["id"], "email": user["email"], "name": user["name"]}

"""Optional JWT auth helpers for Supabase."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer(auto_error=False)


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any] | None:
    if creds is None:
        return None
    return _decode(creds.credentials)


def require_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, Any]:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return _decode(creds.credentials)


def _decode(token: str) -> dict[str, Any]:
    from whats_new.config import get_settings

    settings = get_settings()
    if not settings.supabase_jwt_secret:
        # Dev mode: accept opaque user id in token for local testing
        return {"sub": token, "role": "authenticated"}
    try:
        import jwt
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="PyJWT not installed") from exc
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc

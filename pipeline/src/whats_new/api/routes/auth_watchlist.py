"""Auth-aware user profile and watchlist sync."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from whats_new.api.auth import get_optional_user, require_user

router = APIRouter()


class WatchlistBody(BaseModel):
    tickers: list[str] = Field(default_factory=list)


class PushTokenBody(BaseModel):
    push_token: str


class PreferencesBody(BaseModel):
    preferences: dict[str, Any] = Field(default_factory=dict)


def _ensure_user(user: dict[str, Any]) -> str:
    from whats_new import db
    import hashlib
    import uuid as uuid_lib

    raw = str(user.get("sub") or user.get("user_id") or "")
    try:
        user_id = str(uuid_lib.UUID(raw))
    except Exception:
        # Deterministic UUID for opaque local/dev tokens
        user_id = str(uuid_lib.UUID(hashlib.md5(raw.encode()).hexdigest()))
    email = user.get("email")
    db.execute(
        """
        INSERT INTO users (id, email)
        VALUES (%s::uuid, %s)
        ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email),
          updated_at = now()
        """,
        (user_id, email),
    )
    return user_id


@router.get("/me")
def me(user: dict[str, Any] | None = Depends(get_optional_user)) -> dict:
    if user is None:
        return {"authenticated": False}
    return {"authenticated": True, "user": {"id": user.get("sub"), "email": user.get("email")}}


@router.get("/watchlist")
def get_watchlist(user: dict[str, Any] = Depends(require_user)) -> dict:
    from whats_new import db

    user_id = _ensure_user(user)
    rows = db.fetch_all(
        "SELECT ticker FROM watchlists WHERE user_id = %s::uuid ORDER BY created_at",
        (user_id,),
    )
    return {"tickers": [r["ticker"] for r in rows]}


@router.put("/watchlist")
def put_watchlist(body: WatchlistBody, user: dict[str, Any] = Depends(require_user)) -> dict:
    from whats_new import db
    from whats_new.universe import get_stock

    user_id = _ensure_user(user)
    tickers = [t.upper() for t in body.tickers if get_stock(t.upper())]
    db.execute("DELETE FROM watchlists WHERE user_id = %s::uuid", (user_id,))
    for ticker in tickers:
        db.execute(
            """
            INSERT INTO watchlists (user_id, ticker) VALUES (%s::uuid, %s)
            ON CONFLICT DO NOTHING
            """,
            (user_id, ticker),
        )
    # Mirror into preferences for push relevance
    db.execute(
        """
        UPDATE users
        SET preferences = coalesce(preferences, '{}'::jsonb) || %s::jsonb,
            updated_at = now()
        WHERE id = %s::uuid
        """,
        (db.to_jsonb({"watchlist": tickers}), user_id),
    )
    return {"tickers": tickers}


@router.post("/push-token")
def save_push_token(body: PushTokenBody, user: dict[str, Any] = Depends(require_user)) -> dict:
    from whats_new import db

    user_id = _ensure_user(user)
    db.execute(
        "UPDATE users SET push_token = %s, updated_at = now() WHERE id = %s::uuid",
        (body.push_token, user_id),
    )
    return {"status": "ok"}


@router.put("/preferences")
def save_preferences(body: PreferencesBody, user: dict[str, Any] = Depends(require_user)) -> dict:
    from whats_new import db

    user_id = _ensure_user(user)
    db.execute(
        """
        UPDATE users
        SET preferences = coalesce(preferences, '{}'::jsonb) || %s::jsonb,
            updated_at = now()
        WHERE id = %s::uuid
        """,
        (db.to_jsonb(body.preferences), user_id),
    )
    return {"status": "ok", "preferences": body.preferences}

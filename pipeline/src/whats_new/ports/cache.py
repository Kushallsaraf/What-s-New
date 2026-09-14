"""Cache port: Postgres llm_cache table or Redis Memorystore."""

from __future__ import annotations

import json
import os
from typing import Any, Protocol

from whats_new.ports.base import NotProvisionedError, require_env


class CachePort(Protocol):
    def get(self, key: str) -> Any | None: ...

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None: ...


class PostgresCache:
    """Uses the llm_cache table when a database is configured; otherwise in-memory."""

    def __init__(self) -> None:
        self._memory: dict[str, Any] = {}

    def get(self, key: str) -> Any | None:
        try:
            from whats_new import db

            row = db.fetch_one(
                "SELECT value_json FROM llm_cache WHERE cache_key = %s AND (expires_at IS NULL OR expires_at > now())",
                (key,),
            )
            if row:
                return row["value_json"]
        except Exception:
            pass
        return self._memory.get(key)

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        self._memory[key] = value
        try:
            from whats_new import db

            expires = None
            if ttl_seconds is not None:
                expires = f"now() + interval '{int(ttl_seconds)} seconds'"
            if expires:
                db.execute(
                    """
                    INSERT INTO llm_cache (cache_key, value_json, expires_at)
                    VALUES (%s, %s::jsonb, """
                    + expires
                    + """)
                    ON CONFLICT (cache_key) DO UPDATE
                    SET value_json = EXCLUDED.value_json, expires_at = EXCLUDED.expires_at
                    """,
                    (key, json.dumps(value)),
                )
            else:
                db.execute(
                    """
                    INSERT INTO llm_cache (cache_key, value_json, expires_at)
                    VALUES (%s, %s::jsonb, NULL)
                    ON CONFLICT (cache_key) DO UPDATE
                    SET value_json = EXCLUDED.value_json, expires_at = NULL
                    """,
                    (key, json.dumps(value)),
                )
        except Exception:
            # Memory fallback is fine when DB is not ready.
            pass


class RedisCache:
    def __init__(self) -> None:
        require_env("cache", "cache", {"REDIS_URL": os.environ.get("REDIS_URL", "")})
        try:
            import redis  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise NotProvisionedError("cache", ["redis package"], "cache") from exc
        self._client = redis.Redis.from_url(os.environ["REDIS_URL"], decode_responses=True)

    def get(self, key: str) -> Any | None:
        raw = self._client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        payload = json.dumps(value)
        if ttl_seconds is not None:
            self._client.setex(key, ttl_seconds, payload)
        else:
            self._client.set(key, payload)


def get_cache(adapter: str | None = None) -> CachePort:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_cache).lower()
    if choice in {"postgres", "pg", "local"}:
        return PostgresCache()
    if choice in {"redis", "memorystore"}:
        return RedisCache()
    raise ValueError(f"Unknown WN_CACHE adapter: {choice}")

"""LLM response cache keyed by content hash + prompt version."""

from __future__ import annotations

from typing import Any

from whats_new.http_util import content_hash


PROMPT_VERSION = "event-analysis-v1"
REPORT_PROMPT_VERSION = "report-v1"


def analysis_cache_key(cluster_key: str, prompt_version: str = PROMPT_VERSION) -> str:
    return content_hash("analysis", prompt_version, cluster_key)


def get_cached(key: str) -> Any | None:
    from whats_new.ports import get_cache

    return get_cache().get(key)


def set_cached(key: str, value: Any, ttl_seconds: int = 60 * 60 * 24 * 7) -> None:
    from whats_new.ports import get_cache

    get_cache().set(key, value, ttl_seconds=ttl_seconds)

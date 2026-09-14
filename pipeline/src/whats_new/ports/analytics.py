"""Analytics port: noop locally, PostHog when provisioned."""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Protocol

from whats_new.ports.base import require_env


class AnalyticsPort(Protocol):
    def track(self, event: str, properties: dict[str, Any] | None = None, distinct_id: str = "system") -> None: ...


class NoopAnalytics:
    def track(self, event: str, properties: dict[str, Any] | None = None, distinct_id: str = "system") -> None:
        del event, properties, distinct_id


class PostHogAnalytics:
    def __init__(self) -> None:
        require_env(
            "analytics",
            "analytics",
            {
                "POSTHOG_API_KEY": os.environ.get("POSTHOG_API_KEY", ""),
                "POSTHOG_HOST": os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com"),
            },
        )
        self._key = os.environ["POSTHOG_API_KEY"]
        self._host = os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com").rstrip("/")

    def track(self, event: str, properties: dict[str, Any] | None = None, distinct_id: str = "system") -> None:
        payload = {
            "api_key": self._key,
            "event": event,
            "properties": {"distinct_id": distinct_id, **(properties or {})},
        }
        req = urllib.request.Request(
            f"{self._host}/capture/",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()


def get_analytics(adapter: str | None = None) -> AnalyticsPort:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_analytics).lower()
    if choice in {"noop", "none", "local"}:
        return NoopAnalytics()
    if choice in {"posthog"}:
        return PostHogAnalytics()
    raise ValueError(f"Unknown WN_ANALYTICS adapter: {choice}")

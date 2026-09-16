"""Public factories for capability ports."""

from __future__ import annotations

from whats_new.ports.analytics import get_analytics
from whats_new.ports.base import NotProvisionedError
from whats_new.ports.blobs import get_blobs
from whats_new.ports.cache import get_cache
from whats_new.ports.forecaster import get_forecaster
from whats_new.ports.mailer import get_mailer
from whats_new.ports.push import get_push
from whats_new.ports.queue import get_queue
from whats_new.ports.secrets import get_secrets
from whats_new.ports.telemetry import get_telemetry

__all__ = [
    "NotProvisionedError",
    "get_analytics",
    "get_blobs",
    "get_cache",
    "get_forecaster",
    "get_mailer",
    "get_push",
    "get_queue",
    "get_secrets",
    "get_telemetry",
    "capability_status",
]


def capability_status() -> list[dict[str, str]]:
    """Return status for every capability (used by doctor and /api/health)."""
    from whats_new.config import get_settings

    settings = get_settings()
    specs = [
        ("secrets", settings.wn_secrets, get_secrets),
        ("blobs", settings.wn_blobs, get_blobs),
        ("queue", settings.wn_queue, get_queue),
        ("push", settings.wn_push, get_push),
        ("analytics", settings.wn_analytics, get_analytics),
        ("telemetry", settings.wn_telemetry, get_telemetry),
        ("cache", settings.wn_cache, get_cache),
        ("forecaster", settings.wn_forecaster, get_forecaster),
        ("mailer", settings.wn_mailer, get_mailer),
    ]
    local_defaults = {
        "secrets": "env",
        "blobs": "local",
        "queue": "inline",
        "push": "console",
        "analytics": "noop",
        "telemetry": "stdout-json",
        "cache": "postgres",
        "forecaster": "local-cpu",
        "mailer": "console",
    }
    rows: list[dict[str, str]] = []
    for name, adapter, factory in specs:
        status = "ready"
        detail = ""
        try:
            factory()
            if adapter == local_defaults.get(name):
                status = "local-default"
        except NotProvisionedError as exc:
            status = "missing-credentials"
            detail = str(exc)
        except Exception as exc:  # pragma: no cover
            status = "error"
            detail = str(exc)
        rows.append(
            {
                "capability": name,
                "adapter": adapter,
                "status": status,
                "detail": detail,
            }
        )
    return rows

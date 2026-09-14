"""Telemetry / structured logging port."""

from __future__ import annotations

import json
import os
import sys
import time
import traceback
from typing import Any, Protocol

from whats_new.ports.base import NotProvisionedError, require_env


class TelemetryPort(Protocol):
    def info(self, message: str, **fields: Any) -> None: ...

    def error(self, message: str, exc: BaseException | None = None, **fields: Any) -> None: ...

    def event(self, name: str, **fields: Any) -> None: ...


class StdoutJsonTelemetry:
    def _emit(self, level: str, message: str, **fields: Any) -> None:
        record = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "level": level,
            "message": message,
            **fields,
        }
        sys.stdout.write(json.dumps(record, default=str) + "\n")
        sys.stdout.flush()

    def info(self, message: str, **fields: Any) -> None:
        self._emit("info", message, **fields)

    def error(self, message: str, exc: BaseException | None = None, **fields: Any) -> None:
        if exc is not None:
            fields["error_type"] = type(exc).__name__
            fields["error"] = str(exc)
            fields["traceback"] = traceback.format_exc()
        self._emit("error", message, **fields)

    def event(self, name: str, **fields: Any) -> None:
        self._emit("event", name, **fields)


class CloudTelemetry:
    """Stdout JSON (Cloud Logging) plus optional Sentry."""

    def __init__(self) -> None:
        self._stdout = StdoutJsonTelemetry()
        dsn = os.environ.get("SENTRY_DSN", "").strip()
        self._sentry = None
        if not dsn:
            raise NotProvisionedError("telemetry", ["SENTRY_DSN"], "telemetry")
        try:
            import sentry_sdk  # type: ignore

            sentry_sdk.init(dsn=dsn, traces_sample_rate=0.0)
            self._sentry = sentry_sdk
        except ImportError as exc:  # pragma: no cover
            raise NotProvisionedError(
                "telemetry",
                ["sentry-sdk package"],
                "telemetry",
            ) from exc

    def info(self, message: str, **fields: Any) -> None:
        self._stdout.info(message, **fields)

    def error(self, message: str, exc: BaseException | None = None, **fields: Any) -> None:
        self._stdout.error(message, exc=exc, **fields)
        if self._sentry is not None and exc is not None:
            self._sentry.capture_exception(exc)

    def event(self, name: str, **fields: Any) -> None:
        self._stdout.event(name, **fields)


def get_telemetry(adapter: str | None = None) -> TelemetryPort:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_telemetry).lower()
    if choice in {"stdout-json", "stdout", "local"}:
        return StdoutJsonTelemetry()
    if choice in {"cloud", "sentry", "gcp"}:
        return CloudTelemetry()
    raise ValueError(f"Unknown WN_TELEMETRY adapter: {choice}")

"""Forecaster port: local CPU Kronos or Cloud Run Job."""

from __future__ import annotations

import os
from typing import Any, Protocol

from whats_new.ports.base import NotProvisionedError, require_env


class ForecasterPort(Protocol):
    name: str

    def predict(
        self,
        history: list[dict[str, Any]],
        horizon: int,
        ticker: str | None = None,
    ) -> list[float]: ...


class LocalCpuForecaster:
    """Wraps the existing KronosAdapter when available; else returns empty."""

    name = "local-cpu"

    def __init__(self) -> None:
        self._adapter = None
        repo = os.environ.get("KRONOS_REPO", "").strip()
        variant = os.environ.get("KRONOS_VARIANT", "kronos-mini")
        if repo:
            try:
                from pathlib import Path

                from whats_new.kronos_adapter import KronosAdapter

                self._adapter = KronosAdapter(
                    variant=variant,
                    repository_path=Path(repo),
                    device=os.environ.get("KRONOS_DEVICE", "cpu"),
                )
            except Exception:
                self._adapter = None

    def predict(
        self,
        history: list[dict[str, Any]],
        horizon: int,
        ticker: str | None = None,
    ) -> list[float]:
        del ticker
        if self._adapter is None:
            # Deterministic placeholder so the job path is exercisable without Kronos installed.
            if not history:
                return [0.0] * horizon
            last = float(history[-1].get("close", history[-1].get("Close", 0.0)))
            return [last] * horizon
        future = [{"timestamp": i} for i in range(horizon)]
        return self._adapter.predict(history, future)


class CloudRunForecaster:
    """Enqueue Kronos inference on Cloud Run Jobs (not inline)."""

    name = "cloud-run"

    def __init__(self) -> None:
        require_env(
            "forecaster",
            "forecaster",
            {
                "GCP_PROJECT": os.environ.get("GCP_PROJECT", ""),
                "KRONOS_JOB_NAME": os.environ.get("KRONOS_JOB_NAME", ""),
                "CLOUD_RUN_REGION": os.environ.get("CLOUD_RUN_REGION", "us-central1"),
            },
        )
        self._project = os.environ["GCP_PROJECT"]
        self._job = os.environ["KRONOS_JOB_NAME"]
        self._region = os.environ.get("CLOUD_RUN_REGION", "us-central1")

    def predict(
        self,
        history: list[dict[str, Any]],
        horizon: int,
        ticker: str | None = None,
    ) -> list[float]:
        del history, horizon, ticker
        raise NotProvisionedError(
            "forecaster",
            [
                "Inline predict is unavailable for cloud-run; "
                "trigger the kronos_predict Cloud Run Job instead"
            ],
            "forecaster",
        )


def get_forecaster(adapter: str | None = None) -> ForecasterPort:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_forecaster).lower()
    if choice in {"local-cpu", "local", "cpu"}:
        return LocalCpuForecaster()
    if choice in {"cloud-run", "cloudrun", "gcp"}:
        return CloudRunForecaster()
    raise ValueError(f"Unknown WN_FORECASTER adapter: {choice}")

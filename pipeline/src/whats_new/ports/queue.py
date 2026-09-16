"""Task fan-out port: inline sync locally, Cloud Tasks when provisioned."""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from typing import Any, Protocol

from whats_new.ports.base import NotProvisionedError, require_env


class TaskQueue(Protocol):
    def enqueue(self, job_name: str, payload: dict[str, Any] | None = None) -> str: ...


class InlineQueue:
    """Run the job synchronously in-process."""

    def __init__(self, runner: Callable[[str, dict[str, Any]], None] | None = None) -> None:
        self._runner = runner

    def enqueue(self, job_name: str, payload: dict[str, Any] | None = None) -> str:
        body = payload or {}
        if self._runner is not None:
            self._runner(job_name, body)
            return f"inline:{job_name}"
        # Lazy import avoids circular deps at module load.
        from whats_new.jobs import run_job

        run_job(job_name, body)
        return f"inline:{job_name}"


class CloudTasksQueue:
    def __init__(self) -> None:
        require_env(
            "queue",
            "queue",
            {
                "GCP_PROJECT": os.environ.get("GCP_PROJECT", ""),
                "CLOUD_TASKS_QUEUE": os.environ.get("CLOUD_TASKS_QUEUE", ""),
                "CLOUD_TASKS_LOCATION": os.environ.get("CLOUD_TASKS_LOCATION", "us-central1"),
                "JOBS_HANDLER_URL": os.environ.get("JOBS_HANDLER_URL", ""),
            },
        )
        try:
            from google.cloud import tasks_v2  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise NotProvisionedError(
                "queue",
                ["google-cloud-tasks package"],
                "queue",
            ) from exc
        self._client = tasks_v2.CloudTasksClient()
        project = os.environ["GCP_PROJECT"]
        location = os.environ.get("CLOUD_TASKS_LOCATION", "us-central1")
        queue = os.environ["CLOUD_TASKS_QUEUE"]
        self._parent = self._client.queue_path(project, location, queue)
        self._handler = os.environ["JOBS_HANDLER_URL"]

    def enqueue(self, job_name: str, payload: dict[str, Any] | None = None) -> str:
        from google.cloud import tasks_v2  # type: ignore

        body = json.dumps({"job": job_name, "payload": payload or {}}).encode("utf-8")
        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": self._handler,
                "headers": {"Content-Type": "application/json"},
                "body": body,
            }
        }
        response = self._client.create_task(request={"parent": self._parent, "task": task})
        return response.name


def get_queue(adapter: str | None = None) -> TaskQueue:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_queue).lower()
    if choice in {"inline", "local", "sync"}:
        return InlineQueue()
    if choice in {"cloud-tasks", "tasks", "gcp"}:
        return CloudTasksQueue()
    raise ValueError(f"Unknown WN_QUEUE adapter: {choice}")

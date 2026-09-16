"""Secrets port: env file locally, Secret Manager in GCP."""

from __future__ import annotations

import os
from typing import Protocol

from whats_new.ports.base import NotProvisionedError, require_env


class SecretsPort(Protocol):
    def get(self, name: str, default: str | None = None) -> str | None: ...

    def require(self, name: str) -> str: ...


class EnvSecrets:
    """Read secrets from process environment / .env."""

    def get(self, name: str, default: str | None = None) -> str | None:
        value = os.environ.get(name)
        if value is None or value == "":
            return default
        return value

    def require(self, name: str) -> str:
        value = self.get(name)
        if value is None:
            raise KeyError(f"Missing required secret: {name}")
        return value


class SecretManagerSecrets:
    """Google Secret Manager adapter (requires GCP_PROJECT)."""

    def __init__(self) -> None:
        require_env(
            "secrets",
            "secrets",
            {"GCP_PROJECT": os.environ.get("GCP_PROJECT", "")},
        )
        try:
            from google.cloud import secretmanager  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise NotProvisionedError(
                "secrets",
                ["google-cloud-secret-manager package"],
                "secrets",
            ) from exc
        self._client = secretmanager.SecretManagerServiceClient()
        self._project = os.environ["GCP_PROJECT"]

    def get(self, name: str, default: str | None = None) -> str | None:
        path = f"projects/{self._project}/secrets/{name}/versions/latest"
        try:
            response = self._client.access_secret_version(request={"name": path})
            return response.payload.data.decode("utf-8")
        except Exception:
            return default

    def require(self, name: str) -> str:
        value = self.get(name)
        if value is None:
            raise KeyError(f"Missing secret in Secret Manager: {name}")
        return value


def get_secrets(adapter: str | None = None) -> SecretsPort:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_secrets).lower()
    if choice in {"env", "local"}:
        return EnvSecrets()
    if choice in {"gsm", "secret-manager", "gcp"}:
        return SecretManagerSecrets()
    raise ValueError(f"Unknown WN_SECRETS adapter: {choice}")

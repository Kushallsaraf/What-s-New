"""Blob storage port: local filesystem or GCS."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Protocol

from whats_new.ports.base import NotProvisionedError, require_env


class BlobStore(Protocol):
    def put_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str: ...

    def get_bytes(self, key: str) -> bytes | None: ...

    def put_text(self, key: str, text: str) -> str: ...

    def get_text(self, key: str) -> str | None: ...

    def exists(self, key: str) -> bool: ...


class LocalBlobStore:
    def __init__(self, root: Path | None = None) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.root = root or settings.outputs_dir
        self.root.mkdir(parents=True, exist_ok=True)
        settings.fixtures_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = self.root / key
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def put_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        del content_type
        path = self._path(key)
        path.write_bytes(data)
        return str(path)

    def get_bytes(self, key: str) -> bytes | None:
        path = self.root / key
        if not path.exists():
            return None
        return path.read_bytes()

    def put_text(self, key: str, text: str) -> str:
        return self.put_bytes(key, text.encode("utf-8"), "text/plain")

    def get_text(self, key: str) -> str | None:
        data = self.get_bytes(key)
        return None if data is None else data.decode("utf-8")

    def exists(self, key: str) -> bool:
        return (self.root / key).exists()


class GcsBlobStore:
    def __init__(self) -> None:
        require_env(
            "blobs",
            "blobs",
            {
                "GCS_BUCKET": os.environ.get("GCS_BUCKET", ""),
                "GCP_PROJECT": os.environ.get("GCP_PROJECT", ""),
            },
        )
        try:
            from google.cloud import storage  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise NotProvisionedError(
                "blobs",
                ["google-cloud-storage package"],
                "blobs",
            ) from exc
        self._client = storage.Client(project=os.environ["GCP_PROJECT"])
        self._bucket = self._client.bucket(os.environ["GCS_BUCKET"])

    def put_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        blob = self._bucket.blob(key)
        blob.upload_from_string(data, content_type=content_type)
        return f"gs://{self._bucket.name}/{key}"

    def get_bytes(self, key: str) -> bytes | None:
        blob = self._bucket.blob(key)
        if not blob.exists():
            return None
        return blob.download_as_bytes()

    def put_text(self, key: str, text: str) -> str:
        return self.put_bytes(key, text.encode("utf-8"), "text/plain")

    def get_text(self, key: str) -> str | None:
        data = self.get_bytes(key)
        return None if data is None else data.decode("utf-8")

    def exists(self, key: str) -> bool:
        return self._bucket.blob(key).exists()


def get_blobs(adapter: str | None = None) -> BlobStore:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_blobs).lower()
    if choice in {"local", "fs", "filesystem"}:
        return LocalBlobStore()
    if choice in {"gcs", "gcp"}:
        return GcsBlobStore()
    raise ValueError(f"Unknown WN_BLOBS adapter: {choice}")

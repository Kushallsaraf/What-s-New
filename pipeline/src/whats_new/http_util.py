"""HTTP helpers with fixture record/replay."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def _fixture_key(method: str, url: str, body: bytes | None) -> str:
    h = hashlib.sha256()
    h.update(method.upper().encode())
    h.update(b"|")
    h.update(url.encode())
    if body:
        h.update(b"|")
        h.update(body)
    return h.hexdigest()[:32]


def fixture_path(name: str) -> Path:
    from whats_new.config import get_settings

    settings = get_settings()
    settings.fixtures_dir.mkdir(parents=True, exist_ok=True)
    return settings.fixtures_dir / f"{name}.json"


def http_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
    timeout: float = 30.0,
    fixture_name: str | None = None,
) -> Any:
    """GET/POST JSON with optional fixture record/replay via WN_REPLAY / auto-record."""
    from whats_new.config import get_settings

    settings = get_settings()
    if params:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}{urlencode(params, doseq=True)}"
    raw_body = None if body is None else json.dumps(body).encode("utf-8")
    key = fixture_name or _fixture_key(method, url, raw_body)
    path = fixture_path(key)

    if settings.replay and path.exists():
        return json.loads(path.read_text(encoding="utf-8"))

    req = Request(url, data=raw_body, method=method.upper())
    req.add_header("Accept", "application/json")
    if raw_body is not None:
        req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)

    try:
        with urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {url}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error for {url}: {exc}") from exc

    # Always record on live fetch so --replay works later.
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return payload


def content_hash(*parts: str) -> str:
    h = hashlib.sha256()
    for part in parts:
        h.update(part.encode("utf-8", errors="replace"))
        h.update(b"\0")
    return h.hexdigest()

"""Push notification port: console logger or Expo Push."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol

from whats_new.ports.base import require_env


@dataclass
class PushMessage:
    title: str
    body: str
    data: dict[str, Any] | None = None
    to: str | None = None  # Expo push token


class PushSender(Protocol):
    def send(self, message: PushMessage) -> dict[str, Any]: ...


class ConsolePush:
    def send(self, message: PushMessage) -> dict[str, Any]:
        payload = {
            "to": message.to,
            "title": message.title,
            "body": message.body,
            "data": message.data or {},
        }
        print(f"[push:console] {json.dumps(payload, ensure_ascii=False)}")
        return {"status": "logged", "payload": payload}


class ExpoPush:
    ENDPOINT = "https://exp.host/--/api/v2/push/send"

    def __init__(self) -> None:
        # Expo push can work without an access token for basic delivery;
        # require EXPO_ACCESS_TOKEN when explicitly selecting this adapter so
        # misconfiguration is visible via doctor.
        require_env(
            "push",
            "push",
            {"EXPO_ACCESS_TOKEN": os.environ.get("EXPO_ACCESS_TOKEN", "optional-ok")},
        )
        # If the placeholder was used because env was empty, treat as missing.
        token = os.environ.get("EXPO_ACCESS_TOKEN", "").strip()
        if not token:
            from whats_new.ports.base import NotProvisionedError

            raise NotProvisionedError("push", ["EXPO_ACCESS_TOKEN"], "push")
        self._token = token

    def send(self, message: PushMessage) -> dict[str, Any]:
        if not message.to:
            return {"status": "skipped", "reason": "no recipient token"}
        body = {
            "to": message.to,
            "title": message.title,
            "sound": "default",
            "body": message.body,
            "data": message.data or {},
        }
        req = urllib.request.Request(
            self.ENDPOINT,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {self._token}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            return {"status": "error", "code": exc.code, "detail": detail}


def get_push(adapter: str | None = None) -> PushSender:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_push).lower()
    if choice in {"console", "log", "local"}:
        return ConsolePush()
    if choice in {"expo", "expo-push"}:
        return ExpoPush()
    raise ValueError(f"Unknown WN_PUSH adapter: {choice}")

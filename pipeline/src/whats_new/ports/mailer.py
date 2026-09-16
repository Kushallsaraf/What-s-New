"""Mailer port: console logger or Resend/SendGrid."""

from __future__ import annotations

import json
import os
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol

from whats_new.ports.base import NotProvisionedError, require_env


@dataclass
class EmailMessage:
    to: str
    subject: str
    body_text: str
    body_html: str | None = None


class MailerPort(Protocol):
    def send(self, message: EmailMessage) -> dict[str, Any]: ...


class ConsoleMailer:
    def send(self, message: EmailMessage) -> dict[str, Any]:
        payload = {
            "to": message.to,
            "subject": message.subject,
            "body_text": message.body_text,
        }
        print(f"[mail:console] {json.dumps(payload, ensure_ascii=False)}")
        return {"status": "logged", "payload": payload}


class ResendMailer:
    def __init__(self) -> None:
        require_env(
            "mailer",
            "mailer",
            {
                "RESEND_API_KEY": os.environ.get("RESEND_API_KEY", ""),
                "MAIL_FROM": os.environ.get("MAIL_FROM", ""),
            },
        )
        self._key = os.environ["RESEND_API_KEY"]
        self._from = os.environ["MAIL_FROM"]

    def send(self, message: EmailMessage) -> dict[str, Any]:
        payload = {
            "from": self._from,
            "to": [message.to],
            "subject": message.subject,
            "text": message.body_text,
        }
        if message.body_html:
            payload["html"] = message.body_html
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self._key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))


def get_mailer(adapter: str | None = None) -> MailerPort:
    from whats_new.config import get_settings

    choice = (adapter or get_settings().wn_mailer).lower()
    if choice in {"console", "log", "local"}:
        return ConsoleMailer()
    if choice in {"resend"}:
        return ResendMailer()
    if choice in {"sendgrid"}:
        raise NotProvisionedError(
            "mailer",
            ["SendGrid adapter not implemented; use resend or console"],
            "mailer",
        )
    raise ValueError(f"Unknown WN_MAILER adapter: {choice}")

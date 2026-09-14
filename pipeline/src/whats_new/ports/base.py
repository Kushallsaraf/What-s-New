"""Capability ports: Protocol definitions and shared helpers."""

from __future__ import annotations

from typing import Any


class NotProvisionedError(RuntimeError):
    """Raised when a cloud adapter is selected but credentials are missing."""

    def __init__(self, capability: str, missing: list[str], doc_section: str) -> None:
        self.capability = capability
        self.missing = missing
        self.doc_section = doc_section
        vars_list = ", ".join(missing) if missing else "(none listed)"
        super().__init__(
            f"Capability '{capability}' is not provisioned. "
            f"Missing: {vars_list}. "
            f"See docs/cloud-readiness.md#{doc_section}"
        )


def require_env(capability: str, doc_section: str, mapping: dict[str, str]) -> dict[str, str]:
    """Return env values or raise NotProvisionedError with missing keys."""
    import os

    resolved: dict[str, str] = {}
    missing: list[str] = []
    for key, value in mapping.items():
        val = (value or os.environ.get(key, "")).strip()
        if not val:
            missing.append(key)
        else:
            resolved[key] = val
    if missing:
        raise NotProvisionedError(capability, missing, doc_section)
    return resolved


CapabilityStatus = dict[str, Any]

"""Provider-agnostic LLM client."""

from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from typing import Any


@dataclass
class LlmResponse:
    text: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    cost_usd: float = 0.0
    raw: dict[str, Any] | None = None


# Rough USD per 1M tokens for budget accounting (approximate).
_PRICE = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
}


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    inp, out = _PRICE.get(model, (1.0, 3.0))
    return (prompt_tokens * inp + completion_tokens * out) / 1_000_000


class LlmClient:
    def __init__(
        self,
        provider: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.provider = (provider or settings.llm_provider).lower()
        self.api_key = api_key or settings.llm_api_key
        self.model = model or settings.llm_model_analysis

    def complete(self, system: str, user: str, *, model: str | None = None) -> LlmResponse:
        if not self.api_key:
            raise RuntimeError("LLM_API_KEY is not set")
        model_name = model or self.model
        if self.provider in {"openai", "openai-compatible"}:
            return self._openai(system, user, model_name)
        raise ValueError(f"Unsupported WN_LLM_PROVIDER: {self.provider}")

    def _openai(self, system: str, user: str, model: str) -> LlmResponse:
        base = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        req = urllib.request.Request(
            base,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage") or {}
        pt = int(usage.get("prompt_tokens") or 0)
        ct = int(usage.get("completion_tokens") or 0)
        return LlmResponse(
            text=text,
            model=model,
            prompt_tokens=pt,
            completion_tokens=ct,
            cost_usd=_estimate_cost(model, pt, ct),
            raw=data,
        )

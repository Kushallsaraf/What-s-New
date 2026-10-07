"""The Anthropic branch of LlmClient, with the SDK stubbed so no key is needed."""

from __future__ import annotations

import json
from types import SimpleNamespace

import anthropic
import pytest

from whats_new import config
from whats_new.llm.client import LlmClient


class FakeAnthropic:
    calls: list[dict] = []
    reply = ""
    stop_reason = "end_turn"

    def __init__(self, **kwargs) -> None:
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        FakeAnthropic.calls.append(kwargs)
        return SimpleNamespace(
            stop_reason=FakeAnthropic.stop_reason,
            stop_details=None,
            model=kwargs["model"],
            content=[SimpleNamespace(type="thinking"), SimpleNamespace(type="text", text=FakeAnthropic.reply)],
            usage=SimpleNamespace(input_tokens=1000, output_tokens=500),
            to_dict=lambda: {},
        )


@pytest.fixture
def fake_sdk(monkeypatch):
    monkeypatch.setenv("WN_LLM_PROVIDER", "anthropic")
    monkeypatch.delenv("LLM_MODEL_ANALYSIS", raising=False)
    monkeypatch.delenv("LLM_EFFORT", raising=False)
    monkeypatch.setattr(anthropic, "Anthropic", FakeAnthropic)
    FakeAnthropic.calls = []
    FakeAnthropic.stop_reason = "end_turn"
    config.reset_settings()
    yield
    config.reset_settings()


def test_returns_bare_json_from_a_fenced_reply(fake_sdk):
    FakeAnthropic.reply = 'Here you go:\n```json\n{"event": "x", "tickers": [], "confidence": 0.5}\n```'
    response = LlmClient(api_key="test").complete("sys", "user")

    assert json.loads(response.text)["event"] == "x"
    assert response.model == "claude-opus-5-5"
    assert response.cost_usd == pytest.approx((1000 * 4 + 500 * 20) / 1_000_000)
    call = FakeAnthropic.calls[0]
    assert call["system"] == "sys"
    assert call["fallbacks"] == "default"
    assert "output_config" not in call
    assert "temperature" not in call


def test_effort_is_passed_through(fake_sdk, monkeypatch):
    monkeypatch.setenv("LLM_EFFORT", "low")
    config.reset_settings()
    FakeAnthropic.reply = "{}"
    LlmClient(api_key="test").complete("sys", "user")

    assert FakeAnthropic.calls[0]["output_config"] == {"effort": "low"}


def test_refusal_raises_so_the_caller_falls_back(fake_sdk):
    FakeAnthropic.stop_reason = "refusal"
    FakeAnthropic.reply = ""
    with pytest.raises(RuntimeError, match="declined"):
        LlmClient(api_key="test").complete("sys", "user")

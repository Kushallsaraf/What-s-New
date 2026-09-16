"""Morning and closing report generation."""

from __future__ import annotations

import json
from typing import Any

from whats_new.llm.cache import REPORT_PROMPT_VERSION
from whats_new.llm.client import LlmClient

MORNING_SYSTEM = """You write a concise Morning Brief for equity investors.
Return JSON:
{
  "title": "...",
  "summary": "3-5 sentences",
  "confidence": 0.0,
  "overall_sentiment": "bullish|neutral|bearish",
  "overnight_events": ["..."],
  "important_stocks": [{"ticker": "NVDA", "note": "..."}],
  "sector_outlook": [{"sector": "Technology", "bias": "bullish", "note": "..."}],
  "economic_calendar": ["..."],
  "highest_confidence_signals": ["..."],
  "risks": ["..."],
  "scenarios": {"strengthening": "...", "weakening": "..."},
  "evidence": [{"claim": "..."}]
}
No buy/sell instructions.
"""

CLOSING_SYSTEM = """You write a concise Closing Report for equity investors.
Return JSON with keys:
title, summary, confidence, what_moved, why_it_moved, important_events,
prediction_performance, watch_tomorrow, risks, scenarios, evidence.
No buy/sell instructions.
"""


def generate_report(
    report_type: str,
    context: dict[str, Any],
    *,
    client: LlmClient | None = None,
) -> dict[str, Any]:
    from whats_new.config import get_settings

    settings = get_settings()
    client = client or LlmClient(model=settings.llm_model_reports)
    system = MORNING_SYSTEM if report_type == "morning" else CLOSING_SYSTEM
    user = json.dumps(context, default=str)[:12000]
    try:
        response = client.complete(system, user, model=settings.llm_model_reports)
        data = json.loads(response.text)
        data["_meta"] = {
            "llm_model": response.model,
            "prompt_version": REPORT_PROMPT_VERSION,
            "cost_usd": response.cost_usd,
            "tokens": response.prompt_tokens + response.completion_tokens,
        }
        return data
    except Exception as exc:
        return {
            "title": "Morning Brief" if report_type == "morning" else "Closing Report",
            "summary": f"Report generation unavailable: {exc}",
            "confidence": 0.2,
            "risks": ["LLM unavailable"],
            "scenarios": {"strengthening": "", "weakening": ""},
            "evidence": [],
            "_meta": {"llm_model": "fallback", "prompt_version": REPORT_PROMPT_VERSION},
        }

"""Structured LLM market-impact analysis."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from whats_new.ingest.cluster import ArticleCluster
from whats_new.llm.cache import PROMPT_VERSION, analysis_cache_key, get_cached, set_cached
from whats_new.llm.client import LlmClient, LlmResponse

SYSTEM = """You are a market intelligence analyst. Given news about public companies,
return ONLY valid JSON with this schema:
{
  "event": "short event title",
  "event_type": "earnings|m&a|regulation|macro|product|analyst|geopolitical|energy|other",
  "tickers": ["NVDA"],
  "direction": {"NVDA": "bullish"},
  "time_horizon": "1-5 trading days",
  "confidence": 0.0,
  "importance": 0.0,
  "reasoning_summary": "2-3 sentences",
  "bull_case": "one sentence",
  "bear_case": "one sentence",
  "risks": ["..."],
  "impacts": [{"ticker": "NVDA", "direction": "bullish", "impact_score": 0.8, "confidence": 0.7, "reason": "..."}]
}
Directions: bullish|mildly_bullish|neutral|mildly_bearish|bearish.
confidence and importance are 0..1. Never give buy/sell advice.
"""


@dataclass
class AnalysisResult:
    event: str
    event_type: str
    tickers: list[str]
    direction: dict[str, str]
    time_horizon: str
    confidence: float
    importance: float
    reasoning_summary: str
    bull_case: str = ""
    bear_case: str = ""
    risks: list[str] = field(default_factory=list)
    impacts: list[dict[str, Any]] = field(default_factory=list)
    llm_model: str = ""
    prompt_version: str = PROMPT_VERSION
    raw: dict[str, Any] = field(default_factory=dict)
    cost_usd: float = 0.0
    tokens: int = 0


def _parse(text: str) -> dict[str, Any]:
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("LLM response is not an object")
    required = ["event", "tickers", "confidence"]
    for key in required:
        if key not in data:
            raise ValueError(f"Missing key: {key}")
    return data


def analyze_cluster(
    cluster: ArticleCluster,
    *,
    client: LlmClient | None = None,
    budget_remaining: float | None = None,
) -> AnalysisResult | None:
    """Analyze a cluster; returns None if budget exhausted or parse fails twice."""
    cache_key = analysis_cache_key(cluster.cluster_key)
    cached = get_cached(cache_key)
    if isinstance(cached, dict) and cached.get("event"):
        return AnalysisResult(
            event=cached.get("event", cluster.headline),
            event_type=cached.get("event_type", "other"),
            tickers=list(cached.get("tickers") or cluster.tickers),
            direction=dict(cached.get("direction") or {}),
            time_horizon=cached.get("time_horizon", "1-5 trading days"),
            confidence=float(cached.get("confidence") or 0),
            importance=float(cached.get("importance") or 0),
            reasoning_summary=cached.get("reasoning_summary", ""),
            bull_case=cached.get("bull_case", ""),
            bear_case=cached.get("bear_case", ""),
            risks=list(cached.get("risks") or []),
            impacts=list(cached.get("impacts") or []),
            llm_model=cached.get("llm_model", "cache"),
            prompt_version=cached.get("prompt_version", PROMPT_VERSION),
            raw=cached,
            cost_usd=0.0,
            tokens=0,
        )

    client = client or LlmClient()
    headlines = "\n".join(
        f"- [{a.source}] {a.title} (tickers={','.join(a.tickers) or 'n/a'})"
        for a in cluster.articles[:8]
    )
    user = (
        f"Cluster key: {cluster.cluster_key}\n"
        f"Known tickers: {', '.join(cluster.tickers) or 'unknown'}\n"
        f"Articles:\n{headlines}\n"
        f"Primary summary: {cluster.articles[0].summary[:800] if cluster.articles else ''}"
    )

    last_error: Exception | None = None
    response: LlmResponse | None = None
    for _ in range(2):
        if budget_remaining is not None and budget_remaining <= 0:
            return None
        try:
            response = client.complete(SYSTEM, user)
            if budget_remaining is not None and response.cost_usd > budget_remaining:
                return None
            data = _parse(response.text)
            result = AnalysisResult(
                event=str(data.get("event") or cluster.headline),
                event_type=str(data.get("event_type") or "other"),
                tickers=list(data.get("tickers") or cluster.tickers),
                direction={str(k): str(v) for k, v in (data.get("direction") or {}).items()},
                time_horizon=str(data.get("time_horizon") or "1-5 trading days"),
                confidence=float(data.get("confidence") or 0),
                importance=float(data.get("importance") or 0),
                reasoning_summary=str(data.get("reasoning_summary") or ""),
                bull_case=str(data.get("bull_case") or ""),
                bear_case=str(data.get("bear_case") or ""),
                risks=[str(r) for r in (data.get("risks") or [])],
                impacts=list(data.get("impacts") or []),
                llm_model=response.model,
                prompt_version=PROMPT_VERSION,
                raw=data,
                cost_usd=response.cost_usd,
                tokens=response.prompt_tokens + response.completion_tokens,
            )
            to_store = {**data, "llm_model": response.model, "prompt_version": PROMPT_VERSION}
            set_cached(cache_key, to_store)
            return result
        except Exception as exc:
            last_error = exc
            continue
    if last_error:
        from whats_new.ports import get_telemetry

        get_telemetry().error("llm_analyze_failed", exc=last_error, cluster=cluster.cluster_key)
    return None


def heuristic_analysis(cluster: ArticleCluster, importance: float) -> AnalysisResult:
    """Fallback when LLM is unavailable — still produces structured events."""
    ticker = cluster.tickers[0] if cluster.tickers else "SPY"
    return AnalysisResult(
        event=cluster.headline[:180],
        event_type="other",
        tickers=list(cluster.tickers) or [ticker],
        direction={ticker: "neutral"},
        time_horizon="1-5 trading days",
        confidence=0.35,
        importance=importance,
        reasoning_summary="Heuristic placeholder pending LLM analysis.",
        impacts=[
            {
                "ticker": t,
                "direction": "neutral",
                "impact_score": importance,
                "confidence": 0.35,
                "reason": "Extracted from headline without LLM.",
            }
            for t in (cluster.tickers or [ticker])
        ],
        llm_model="heuristic",
        prompt_version=PROMPT_VERSION,
        raw={},
    )

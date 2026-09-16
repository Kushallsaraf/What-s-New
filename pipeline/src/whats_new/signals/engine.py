"""Combine news, quant, and market scores. Store components separately."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class CombinedSignal:
    ticker: str
    news_score: float
    quant_score: float
    market_score: float
    overall_score: float
    weights: dict[str, float]
    meta: dict[str, Any]


def combine(
    ticker: str,
    *,
    news_score: float = 0.0,
    quant_score: float = 0.0,
    market_score: float = 0.0,
    weights: dict[str, float] | None = None,
    meta: dict[str, Any] | None = None,
) -> CombinedSignal:
    from whats_new.config import get_settings

    settings = get_settings()
    w = weights or {
        "news": settings.signal_weight_news,
        "kronos": settings.signal_weight_kronos,
        "market": settings.signal_weight_market,
    }
    # Renormalize if kronos weight is 0 so news+market still sum sensibly.
    total_w = w["news"] + w["kronos"] + w["market"]
    if total_w <= 0:
        total_w = 1.0
    overall = (
        w["news"] * news_score + w["kronos"] * quant_score + w["market"] * market_score
    ) / total_w
    return CombinedSignal(
        ticker=ticker,
        news_score=news_score,
        quant_score=quant_score,
        market_score=market_score,
        overall_score=overall,
        weights=w,
        meta=meta or {},
    )


def news_score_from_direction(direction: str, impact: float, confidence: float) -> float:
    mapping = {
        "bullish": 1.0,
        "mildly_bullish": 0.5,
        "mildly bullish": 0.5,
        "neutral": 0.0,
        "mildly_bearish": -0.5,
        "mildly bearish": -0.5,
        "bearish": -1.0,
    }
    base = mapping.get(direction.lower().replace(" ", "_"), 0.0)
    return base * max(0.0, min(1.0, impact)) * max(0.0, min(1.0, confidence))

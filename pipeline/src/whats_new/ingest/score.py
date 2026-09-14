"""Heuristic importance / relevance scoring before LLM."""

from __future__ import annotations

import re

from whats_new.sources.base import RawArticle

HIGH_KEYWORDS = (
    "earnings",
    "beats",
    "misses",
    "guidance",
    "raises outlook",
    "cuts outlook",
    "acquisition",
    "acquires",
    "merger",
    "fed ",
    "federal reserve",
    "rate cut",
    "rate hike",
    "inflation",
    "cpi",
    "jobs report",
    "nonfarm",
    "sec ",
    "8-k",
    "10-k",
    "10-q",
    "downgrade",
    "upgrade",
    "lawsuit",
    "probe",
    "ban",
    "export control",
    "tariff",
    "opec",
    "crude",
    "semiconductor",
    "ai chip",
)

MEDIUM_KEYWORDS = (
    "partnership",
    "launch",
    "product",
    "analyst",
    "price target",
    "dividend",
    "buyback",
    "layoffs",
    "hiring",
)


def score_article(article: RawArticle) -> float:
    """Return 0..1 importance estimate."""
    text = f"{article.title} {article.summary}".lower()
    score = 0.15
    if article.tickers:
        score += min(0.25, 0.08 * len(article.tickers))
    for kw in HIGH_KEYWORDS:
        if kw in text:
            score += 0.12
    for kw in MEDIUM_KEYWORDS:
        if kw in text:
            score += 0.05
    if article.source.upper().startswith("SEC"):
        score += 0.2
    # Mega-cap boost
    megas = {"NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPY", "QQQ"}
    if megas.intersection(article.tickers):
        score += 0.1
    return max(0.0, min(1.0, score))


def is_important(article: RawArticle, threshold: float = 0.45) -> bool:
    return score_article(article) >= threshold

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
    """Return 0..1 importance estimate.

    Themes carry most of the weight for macro and world stories, which name no
    company and would otherwise score the same as a lifestyle feature: before
    this, a tariff repeal and a dental-tourism piece both landed on 0.27.
    """
    from whats_new.ingest.themes import classify, theme_score

    text = f"{article.title} {article.summary}".lower()
    score = 0.15

    # Count only companies the article actually names. news_ingest folds theme
    # proxies into `tickers` before clustering, and a proxy is a routing
    # decision — "look at XLE" — not evidence that the story matters. Counting
    # them re-scored every macro article upward on the second pass and put it
    # back at the 1.0 ceiling.
    proxies = set(article.proxy_tickers)
    named = [t for t in article.tickers if t not in proxies]
    if named:
        score += min(0.25, 0.08 * len(named))

    # Prefer themes already attached by enrich_article; classify here when the
    # article has not been enriched, so scoring is correct either way.
    if article.themes:
        from whats_new.ingest.themes import THEMES

        by_key = {t.key: t for t in THEMES}
        matches = [_match_from(by_key[k]) for k in article.themes if k in by_key]
    else:
        matches = classify(text)
    score += theme_score(matches)

    # Capped, and deliberately. These keywords overlap the theme patterns
    # heavily, so uncapped they double-counted the same signal: a Fed story
    # matching "fed ", "federal reserve", "rate hike" and "inflation" added
    # 0.48 on top of a 0.40 theme and pinned every macro headline at the 1.0
    # ceiling. That collapsed the breaking/recent split — 41 live events, all
    # of them "High" impact. Repeating a subject is not extra importance.
    high_hits = sum(1 for kw in HIGH_KEYWORDS if kw in text)
    medium_hits = sum(1 for kw in MEDIUM_KEYWORDS if kw in text)
    score += min(0.24, 0.12 * high_hits)
    score += min(0.10, 0.05 * medium_hits)
    if article.source.upper().startswith("SEC"):
        score += 0.2
    # Mega-cap boost
    megas = {"NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPY", "QQQ"}
    if megas.intersection(named):
        score += 0.1
    return max(0.0, min(1.0, score))


def _match_from(theme):
    from whats_new.ingest.themes import ThemeMatch

    return ThemeMatch(key=theme.key, label=theme.label, weight=theme.weight, assets=list(theme.assets))


def is_important(article: RawArticle, threshold: float = 0.45) -> bool:
    return score_article(article) >= threshold


def is_analysable(article: RawArticle) -> bool:
    """Whether the article has anything for the analysis stage to attach to.

    Previously this was `article.tickers` alone, which silently discarded every
    macro and world story — including a jobs-report preview that had already
    cleared the importance bar.
    """
    return bool(article.tickers or article.proxy_tickers)

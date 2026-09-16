"""Source registry."""

from __future__ import annotations

from whats_new.sources.alpaca_bars import AlpacaBarsSource
from whats_new.sources.alpaca_news import AlpacaNewsSource
from whats_new.sources.base import MarketDataSource, NewsSource, RawArticle, Bar
from whats_new.sources.finnhub import FinnhubNewsSource
from whats_new.sources.rss import RssNewsSource
from whats_new.sources.sec_edgar import SecEdgarNewsSource

NEWS_REGISTRY: dict[str, type] = {
    "rss": RssNewsSource,
    "sec_edgar": SecEdgarNewsSource,
    "finnhub": FinnhubNewsSource,
    "alpaca_news": AlpacaNewsSource,
}


def build_news_sources(names: tuple[str, ...] | None = None) -> list[NewsSource]:
    from whats_new.config import get_settings

    selected = names or get_settings().news_sources
    sources: list[NewsSource] = []
    for name in selected:
        cls = NEWS_REGISTRY.get(name)
        if cls is None:
            continue
        sources.append(cls())
    return sources


def build_market_source() -> MarketDataSource:
    return AlpacaBarsSource()


__all__ = [
    "AlpacaBarsSource",
    "AlpacaNewsSource",
    "Bar",
    "FinnhubNewsSource",
    "MarketDataSource",
    "NewsSource",
    "RawArticle",
    "RssNewsSource",
    "SecEdgarNewsSource",
    "build_market_source",
    "build_news_sources",
]

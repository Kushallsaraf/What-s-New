"""Source registry."""

from __future__ import annotations

from whats_new.sources.alpaca_bars import AlpacaBarsSource
from whats_new.sources.alpaca_news import AlpacaNewsSource
from whats_new.sources.base import (
    Bar,
    CompanyFact,
    MacroDataSource,
    MacroObservation,
    MarketDataSource,
    NewsSource,
    RawArticle,
)
from whats_new.sources.bls import BlsMacroSource
from whats_new.sources.eia import EiaMacroSource
from whats_new.sources.finnhub import FinnhubNewsSource
from whats_new.sources.fred import FredMacroSource
from whats_new.sources.rss import RssNewsSource
from whats_new.sources.sec_company_facts import SecCompanyFactsSource
from whats_new.sources.sec_edgar import SecEdgarNewsSource
from whats_new.sources.treasury import TreasuryMacroSource

NEWS_REGISTRY: dict[str, type] = {
    "rss": RssNewsSource,
    "sec_edgar": SecEdgarNewsSource,
    "finnhub": FinnhubNewsSource,
    "alpaca_news": AlpacaNewsSource,
}

MACRO_REGISTRY: dict[str, type] = {
    "treasury": TreasuryMacroSource,
    "bls": BlsMacroSource,
    "fred": FredMacroSource,
    "eia": EiaMacroSource,
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


def build_macro_sources(names: tuple[str, ...] | None = None) -> list[MacroDataSource]:
    from whats_new.config import get_settings

    selected = names or get_settings().macro_sources
    sources: list[MacroDataSource] = []
    for name in selected:
        cls = MACRO_REGISTRY.get(name)
        if cls is not None:
            sources.append(cls())
    return sources


__all__ = [
    "AlpacaBarsSource",
    "AlpacaNewsSource",
    "Bar",
    "BlsMacroSource",
    "CompanyFact",
    "EiaMacroSource",
    "FinnhubNewsSource",
    "FredMacroSource",
    "MacroDataSource",
    "MacroObservation",
    "MarketDataSource",
    "NewsSource",
    "RawArticle",
    "RssNewsSource",
    "SecCompanyFactsSource",
    "SecEdgarNewsSource",
    "TreasuryMacroSource",
    "build_macro_sources",
    "build_market_source",
    "build_news_sources",
]

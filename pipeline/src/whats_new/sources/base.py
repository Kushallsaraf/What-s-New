"""News and market data source protocols."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol


@dataclass
class RawArticle:
    title: str
    source: str
    url: str | None = None
    published_at: datetime | None = None
    summary: str = ""
    content: str = ""
    tickers: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)
    # Market themes matched when the text names no company, plus the liquid
    # proxies they route to. Kept separate from `tickers` so downstream code
    # can tell "this article named Exxon" from "this is an energy story".
    themes: list[str] = field(default_factory=list)
    proxy_tickers: list[str] = field(default_factory=list)


@dataclass
class Bar:
    ticker: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    feed: str = "iex"


@dataclass
class MacroObservation:
    """One official economic observation with enough context to cite it."""

    source: str
    series_id: str
    series_name: str
    period: datetime
    value: float
    unit: str
    frequency: str
    source_url: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class CompanyFact:
    """A normalized SEC XBRL fact for one reporting period."""

    ticker: str
    cik: str
    metric: str
    label: str
    period_end: datetime
    value: float
    unit: str
    form: str
    filed_at: datetime | None = None
    fiscal_year: int | None = None
    fiscal_period: str = ""
    accession: str = ""
    source_url: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


class NewsSource(Protocol):
    name: str

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]: ...


class MarketDataSource(Protocol):
    name: str

    def fetch_bars(
        self,
        tickers: list[str],
        *,
        timeframe: str = "1Day",
        limit: int = 30,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> list[Bar]: ...


class MacroDataSource(Protocol):
    name: str

    def fetch_observations(
        self,
        *,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[MacroObservation]: ...

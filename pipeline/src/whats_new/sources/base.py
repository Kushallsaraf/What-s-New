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

"""Finnhub free company news."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import RawArticle
from whats_new.universe import TICKERS


class FinnhubNewsSource:
    name = "finnhub"
    BASE = "https://finnhub.io/api/v1/company-news"

    def __init__(self, api_key: str | None = None, tickers: list[str] | None = None) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.api_key = api_key or settings.finnhub_api_key
        # Cap per-run calls on free tier.
        self.tickers = tickers or list(TICKERS[:40])

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]:
        if not self.api_key:
            return []
        end = datetime.now(timezone.utc).date()
        start = (since or (datetime.now(timezone.utc) - timedelta(days=2))).date()
        articles: list[RawArticle] = []
        for ticker in self.tickers:
            try:
                payload = http_json(
                    self.BASE,
                    params={
                        "symbol": ticker,
                        "from": start.isoformat(),
                        "to": end.isoformat(),
                        "token": self.api_key,
                    },
                    fixture_name=f"finnhub_{ticker}_{start}",
                )
            except Exception:
                continue
            if not isinstance(payload, list):
                continue
            for row in payload[:15]:
                ts = row.get("datetime")
                published = datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None
                if since and published and published < since:
                    continue
                articles.append(
                    RawArticle(
                        title=row.get("headline") or "",
                        source=row.get("source") or "finnhub",
                        url=row.get("url"),
                        published_at=published,
                        summary=row.get("summary") or "",
                        content=row.get("summary") or "",
                        tickers=[ticker],
                        raw=row,
                    )
                )
        return articles

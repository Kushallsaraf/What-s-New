"""Alpaca news adapter (optional; often 403 on Basic)."""

from __future__ import annotations

from datetime import datetime, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import RawArticle


class AlpacaNewsSource:
    name = "alpaca_news"
    URL = "https://data.alpaca.markets/v1beta1/news"

    def __init__(self, api_key: str | None = None, api_secret: str | None = None) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.api_key = api_key or settings.alpaca_api_key
        self.api_secret = api_secret or settings.alpaca_api_secret

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]:
        if not self.api_key or not self.api_secret:
            return []
        params: dict = {"limit": 50, "include_content": True, "sort": "desc"}
        if since:
            params["start"] = since.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        try:
            payload = http_json(
                self.URL,
                headers={
                    "APCA-API-KEY-ID": self.api_key,
                    "APCA-API-SECRET-KEY": self.api_secret,
                },
                params=params,
                fixture_name="alpaca_news",
            )
        except RuntimeError:
            return []
        articles: list[RawArticle] = []
        for row in payload.get("news") or []:
            published = None
            if row.get("created_at"):
                published = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            articles.append(
                RawArticle(
                    title=row.get("headline") or "",
                    source=row.get("source") or "alpaca",
                    url=row.get("url"),
                    published_at=published,
                    summary=row.get("summary") or "",
                    content=row.get("content") or "",
                    tickers=list(row.get("symbols") or []),
                    raw=row,
                )
            )
        return articles

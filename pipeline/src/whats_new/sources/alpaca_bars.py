"""Alpaca historical bars (Basic / IEX by default)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from whats_new.http_util import http_json
from whats_new.sources.base import Bar


class AlpacaBarsSource:
    name = "alpaca_bars"
    BASE = "https://data.alpaca.markets/v2/stocks"

    def __init__(
        self,
        api_key: str | None = None,
        api_secret: str | None = None,
        feed: str | None = None,
    ) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.api_key = api_key or settings.alpaca_api_key
        self.api_secret = api_secret or settings.alpaca_api_secret
        self.feed = feed or settings.alpaca_feed

    def _headers(self) -> dict[str, str]:
        if not self.api_key or not self.api_secret:
            raise RuntimeError("ALPACA_API_KEY and ALPACA_API_SECRET are required")
        return {
            "APCA-API-KEY-ID": self.api_key,
            "APCA-API-SECRET-KEY": self.api_secret,
        }

    def fetch_bars(
        self,
        tickers: list[str],
        *,
        timeframe: str = "1Day",
        limit: int = 30,
        start: datetime | None = None,
        end: datetime | None = None,
    ) -> list[Bar]:
        if not tickers:
            return []
        # Multi-symbol bars endpoint
        params: dict[str, Any] = {
            "symbols": ",".join(tickers),
            "timeframe": timeframe,
            "limit": limit,
            "adjustment": "raw",
            "feed": self.feed,
        }
        if start:
            params["start"] = start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        if end:
            params["end"] = end.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

        url = f"{self.BASE}/bars"
        payload = http_json(
            url,
            headers=self._headers(),
            params=params,
            fixture_name=f"alpaca_bars_{timeframe}_{len(tickers)}_{limit}",
        )
        bars: list[Bar] = []
        for symbol, rows in (payload.get("bars") or {}).items():
            for row in rows or []:
                ts = datetime.fromisoformat(row["t"].replace("Z", "+00:00"))
                bars.append(
                    Bar(
                        ticker=symbol,
                        timestamp=ts,
                        open=float(row["o"]),
                        high=float(row["h"]),
                        low=float(row["l"]),
                        close=float(row["c"]),
                        volume=float(row["v"]),
                        feed=self.feed,
                    )
                )
        return bars

    def fetch_latest_quotes(self, tickers: list[str]) -> dict[str, dict[str, Any]]:
        if not tickers:
            return {}
        payload = http_json(
            f"{self.BASE}/snapshots",
            headers=self._headers(),
            params={"symbols": ",".join(tickers), "feed": self.feed},
            fixture_name=f"alpaca_snapshots_{len(tickers)}",
        )
        return payload if isinstance(payload, dict) else {}

"""Shared SEC identity, ticker lookup, and fair-access throttling."""

from __future__ import annotations

import time
from dataclasses import dataclass

from whats_new.http_util import http_json


@dataclass(frozen=True)
class SecCompany:
    ticker: str
    cik: str
    title: str


FALLBACK_COMPANIES: dict[str, SecCompany] = {
    "AAPL": SecCompany("AAPL", "0000320193", "Apple Inc."),
    "MSFT": SecCompany("MSFT", "0000789019", "Microsoft Corporation"),
    "NVDA": SecCompany("NVDA", "0001045810", "NVIDIA Corporation"),
    "GOOGL": SecCompany("GOOGL", "0001652044", "Alphabet Inc."),
    "AMZN": SecCompany("AMZN", "0001018724", "Amazon.com, Inc."),
    "META": SecCompany("META", "0001326801", "Meta Platforms, Inc."),
    "TSLA": SecCompany("TSLA", "0001318605", "Tesla, Inc."),
    "JPM": SecCompany("JPM", "0000019617", "JPMorgan Chase & Co."),
    "XOM": SecCompany("XOM", "0000034088", "Exxon Mobil Corporation"),
    "JNJ": SecCompany("JNJ", "0000200406", "Johnson & Johnson"),
}


def sec_headers(user_agent: str) -> dict[str, str]:
    if "@" not in user_agent:
        raise ValueError("SEC_USER_AGENT must include a monitored contact email")
    return {
        "User-Agent": user_agent,
        "Accept-Encoding": "gzip, deflate",
    }


class SecTickerIndex:
    """Resolve any EDGAR-listed ticker instead of relying on a hard-coded CIK list."""

    URL = "https://www.sec.gov/files/company_tickers.json"

    def __init__(self, user_agent: str, timeout: float = 15.0) -> None:
        self.user_agent = user_agent
        self.timeout = timeout
        self._companies: dict[str, SecCompany] | None = None
        self.load_error = ""

    def load(self) -> dict[str, SecCompany]:
        if self._companies is not None:
            return self._companies
        companies = dict(FALLBACK_COMPANIES)
        try:
            payload = http_json(
                self.URL,
                headers=sec_headers(self.user_agent),
                fixture_name="sec_company_tickers",
                timeout=self.timeout,
            )
        except Exception as exc:
            # Known CIKs still work when www.sec.gov is temporarily unavailable;
            # unknown tickers wait for the next successful index refresh.
            self.load_error = str(exc)
            self._companies = companies
            return companies
        rows = payload.values() if isinstance(payload, dict) else []
        for row in rows:
            if not isinstance(row, dict):
                continue
            ticker = str(row.get("ticker") or "").upper().strip()
            try:
                cik = f"{int(row.get('cik_str')):010d}"
            except (TypeError, ValueError):
                continue
            if ticker:
                companies[ticker] = SecCompany(
                    ticker=ticker,
                    cik=cik,
                    title=str(row.get("title") or ticker),
                )
        self._companies = companies
        return companies

    def resolve(self, ticker: str) -> SecCompany | None:
        return self.load().get(ticker.upper())

    def resolve_many(self, tickers: list[str] | tuple[str, ...]) -> list[SecCompany]:
        companies = self.load()
        return [companies[ticker.upper()] for ticker in tickers if ticker.upper() in companies]


class RequestThrottle:
    """Small monotonic delay that keeps sequential SEC calls below 10/second."""

    def __init__(self, interval_seconds: float = 0.12) -> None:
        self.interval_seconds = max(0.0, interval_seconds)
        self._last_request = 0.0

    def wait(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < self.interval_seconds:
            time.sleep(self.interval_seconds - elapsed)
        self._last_request = time.monotonic()

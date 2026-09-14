"""Ticker / entity extraction from headlines and body text."""

from __future__ import annotations

import re

from whats_new.sources.base import RawArticle
from whats_new.universe import STOCKS, TICKERS, get_stock

_TICKER_RE = re.compile(r"\b\$?([A-Z]{1,5})\b")

# Company-name aliases → ticker
_ALIASES: dict[str, str] = {}
for stock in STOCKS:
    _ALIASES[stock.company_name.lower()] = stock.ticker
    # Short forms
    short = stock.company_name.split()[0].lower()
    if len(short) > 3:
        _ALIASES.setdefault(short, stock.ticker)

_ALIASES.update(
    {
        "nvidia": "NVDA",
        "apple": "AAPL",
        "microsoft": "MSFT",
        "google": "GOOGL",
        "alphabet": "GOOGL",
        "amazon": "AMZN",
        "meta": "META",
        "facebook": "META",
        "tesla": "TSLA",
        "broadcom": "AVGO",
        "jpmorgan": "JPM",
        "jp morgan": "JPM",
        "exxon": "XOM",
        "chevron": "CVX",
    }
)


def extract_tickers(article: RawArticle) -> list[str]:
    found: list[str] = []
    for t in article.tickers:
        up = t.upper()
        if up in TICKERS and up not in found:
            found.append(up)

    blob = f"{article.title} {article.summary} {article.content}".lower()
    for alias, ticker in _ALIASES.items():
        if alias in blob and ticker not in found:
            found.append(ticker)

    for match in _TICKER_RE.findall(f"{article.title} {article.summary}"):
        if match in TICKERS and match not in found:
            found.append(match)

    return found


def enrich_article(article: RawArticle) -> RawArticle:
    tickers = extract_tickers(article)
    article.tickers = tickers
    return article

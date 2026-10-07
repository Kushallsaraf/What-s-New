"""Ticker / entity extraction from headlines and body text."""

from __future__ import annotations

import re

from whats_new.sources.base import RawArticle
from whats_new.universe import STOCKS, TICKERS, get_stock

# A bare uppercase run is only a ticker when it is marked as one. Matching
# any 1-5 letter token against the universe turned "ICE", "NOW" and "CAT" in
# ordinary prose into company references.
_CASHTAG_RE = re.compile(r"\$([A-Z]{1,5})\b")
_PAREN_RE = re.compile(r"\(([A-Z]{2,5})(?:[:.][A-Z]+)?\)")
_BARE_RE = re.compile(r"\b([A-Z]{3,5})\b")

# Tickers that are also ordinary words. They still resolve from "$NOW" or
# "(NOW)" — only the unmarked form is refused.
_AMBIGUOUS_BARE = frozenset({"ALL", "CAT", "GAP", "ICE", "KEY", "NOW", "ONE", "OUT", "WELL"})

# First words too generic to stand in for a company. Deriving a short alias
# from these is what mapped "energy prices" to XLE, "the bank" to BAC,
# "Boris Johnson" to JNJ, "Taiwan" to TSM and "U.S. drone" to USB. The full
# company name still matches, so nothing real is lost.
_GENERIC_FIRST_WORDS = frozenset(
    {
        "advanced", "airlines", "american", "analog", "applied", "bank",
        "booking", "cadence", "canadian", "capital", "charles",
        "communication", "consumer", "digital", "duke", "energy",
        "equinox", "financial", "first", "general", "global", "health",
        "industrial", "intercontinental", "international", "intuitive",
        "johnson", "marathon", "materials", "morgan", "national", "northern",
        "palo", "phillips", "public", "real", "rocket", "royal", "select",
        "southern", "standard", "taiwan", "technology", "texas", "thermo",
        "u.s.", "union",
        "united", "universal", "utilities", "visa", "wells", "williams",
    }
)

# Company-name aliases → ticker
_ALIASES: dict[str, str] = {}
for stock in STOCKS:
    _ALIASES[stock.company_name.lower()] = stock.ticker
    if stock.sector == "ETF":
        # "Energy Select Sector SPDR", "Utilities Select Sector SPDR" — every
        # first word is a common noun. Only the full name may match.
        continue
    short = stock.company_name.split()[0].lower()
    if len(short) > 3 and short not in _GENERIC_FIRST_WORDS:
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

# Places that share a company's name. Blanked before alias matching so
# "Amazon deforestation" in a Brazil election story stops naming AMZN.
_NOT_COMPANY_RE = re.compile(
    r"\bthe amazon\b|\bamazon(?:ian)?\s+(?:rainforest|forest|river|basin|region|deforestation|jungle)\b"
)

# Whole-token matching. A plain `alias in text` check fired on "advanced" in
# "advanced drone" and "american" in "American officials".
_ALIAS_RE = re.compile(
    "(?<![a-z0-9])(?:"
    + "|".join(re.escape(a) for a in sorted(_ALIASES, key=len, reverse=True))
    + ")(?![a-z0-9])"
)


def extract_tickers(article: RawArticle) -> list[str]:
    found: list[str] = []
    for t in article.tickers:
        up = t.upper()
        if up in TICKERS and up not in found:
            found.append(up)

    blob = _NOT_COMPANY_RE.sub(" ", f"{article.title} {article.summary} {article.content}".lower())
    for alias in _ALIAS_RE.findall(blob):
        ticker = _ALIASES[alias]
        if ticker not in found:
            found.append(ticker)

    headline = f"{article.title} {article.summary}"
    marked = _CASHTAG_RE.findall(headline) + _PAREN_RE.findall(headline)
    bare = [m for m in _BARE_RE.findall(headline) if m not in _AMBIGUOUS_BARE]
    for match in marked + bare:
        if match in TICKERS and match not in found:
            found.append(match)

    return found


def enrich_article(article: RawArticle) -> RawArticle:
    """Attach named tickers, and market themes for anything that names none.

    An article about a tariff or a jobs report mentions no company, so ticker
    extraction alone leaves it invisible to the rest of the pipeline. Themes
    give it a market handle without inventing a company reference.
    """
    from whats_new.ingest.themes import classify, theme_assets

    article.tickers = extract_tickers(article)

    matches = classify(f"{article.title} {article.summary}")
    article.themes = [m.key for m in matches]
    article.proxy_tickers = [
        t for t in theme_assets(matches) if t not in article.tickers
    ]
    return article


def analysis_tickers(article: RawArticle) -> list[str]:
    """What the analysis stage should look at: named companies first, then
    theme proxies to cover the macro leg of the story."""
    out = list(article.tickers)
    for t in article.proxy_tickers:
        if t not in out:
            out.append(t)
    return out

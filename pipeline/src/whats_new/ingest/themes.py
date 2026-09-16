"""Market-theme classification for news that names no ticker.

The pipeline could only ever analyse an article that mentioned a company in
`universe.STOCKS`. World news names countries, ministers and commodities, so
a tariff announcement, a jobs report or a shipping blockade was stored and
never looked at — measured against live feeds, 218 world articles produced
4 analysable events.

This module supplies the missing step. It decides whether an untickered story
is market-relevant at all, and if so which liquid instruments it plausibly
touches, using the sector and macro ETFs already present in the universe. A
theme match is a *routing* decision, not a forecast: it says "this is an
energy story, look at XLE", and leaves direction and magnitude to the LLM
stage that follows.

Precision matters more than recall here. Every article promoted from this
module costs LLM budget downstream, and the product promise is signal rather
than volume, so ambiguous single words ("strike", "ban") require supporting
context before they count.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Theme:
    """One market-relevant class of event.

    `patterns` are matched against the lowercased title + summary. `context`,
    when present, must ALSO match — it disambiguates words that are common in
    non-market writing ("strike", "ban", "probe").

    `assets` are liquid proxies from universe.STOCKS. They are a starting
    point for analysis, never a claim that the instrument will move.
    """

    key: str
    label: str
    patterns: tuple[str, ...]
    assets: tuple[str, ...]
    weight: float
    context: tuple[str, ...] = ()


# Ordered roughly by how reliably the class moves a broad market.
THEMES: tuple[Theme, ...] = (
    Theme(
        key="monetary_policy",
        label="Monetary policy",
        patterns=(
            "federal reserve", "the fed", "fomc", "rate cut", "rate hike",
            "interest rate decision", "policy rate", "central bank",
            "european central bank", "bank of japan", "bank of england",
            "quantitative tightening", "quantitative easing", "basis point",
            "monetary policy", "fed chair", "rate decision",
        ),
        assets=("TLT", "XLF", "SPY", "GLD"),
        weight=0.40,
    ),
    Theme(
        key="inflation_data",
        label="Inflation",
        patterns=(
            "consumer price index", "cpi report", "producer price index",
            "inflation rate", "inflation data", "inflation print",
            "core inflation", "cost of living", "price pressures",
            "inflation expectations", "disinflation",
        ),
        assets=("TLT", "XLP", "SPY"),
        weight=0.38,
    ),
    Theme(
        key="labor_data",
        label="Labour market",
        patterns=(
            "jobs report", "nonfarm payroll", "non-farm payroll", "payrolls",
            "unemployment rate", "jobless claims", "labor market",
            "labour market", "hiring slowdown", "wage growth", "employment report",
        ),
        assets=("SPY", "TLT", "XLY"),
        weight=0.36,
    ),
    Theme(
        key="trade_policy",
        label="Trade and tariffs",
        patterns=(
            "tariff", "trade war", "import duty", "export control",
            "export ban", "trade deal", "trade agreement", "customs duty",
            "import quota", "trade barrier", "protectionis", "wto ",
        ),
        assets=("XLI", "XLB", "XLY", "SPY"),
        weight=0.36,
    ),
    Theme(
        key="sanctions",
        label="Sanctions",
        patterns=(
            "sanction", "asset freeze", "embargo", "blacklist",
            "entity list", "export restriction", "secondary sanctions",
        ),
        assets=("XLE", "XLF", "GLD"),
        weight=0.34,
    ),
    Theme(
        key="energy_supply",
        label="Energy supply",
        patterns=(
            "opec", "crude oil", "oil production", "oil output", "barrel",
            "refinery", "refining capacity", "natural gas", "pipeline",
            "lng ", "gasoline price", "fuel cost", "oil price",
            "petroleum", "crack spread", "energy price",
        ),
        assets=("XLE", "USO"),
        weight=0.34,
    ),
    Theme(
        key="conflict",
        label="Conflict and security",
        patterns=(
            "invasion", "airstrike", "air strike", "missile strike",
            "ceasefire", "war in", "military strike", "drone attack",
            "troops", "armed conflict", "peace deal", "escalation",
        ),
        assets=("XLE", "GLD", "XLI"),
        weight=0.32,
    ),
    Theme(
        key="shipping",
        label="Shipping and logistics",
        patterns=(
            "suez", "panama canal", "strait of hormuz", "red sea",
            "port strike", "shipping route", "freight rate", "container ship",
            "supply chain disruption", "blockade", "shipping lane",
        ),
        assets=("XLI", "XLE", "XLY"),
        weight=0.32,
    ),
    Theme(
        key="financial_stability",
        label="Credit and financial stability",
        patterns=(
            "bank failure", "bailout", "sovereign default", "debt ceiling",
            "credit spread", "liquidity crisis", "bank run", "deposit flight",
            "credit downgrade", "default risk",
        ),
        assets=("XLF", "HYG", "TLT"),
        weight=0.34,
    ),
    Theme(
        key="elections",
        label="Elections and politics",
        patterns=(
            "election", "referendum", "parliamentary vote", "coalition government",
            "government shutdown", "impeach", "budget bill", "fiscal package",
            "presidential race", "no-confidence vote",
        ),
        assets=("SPY", "GLD", "TLT"),
        weight=0.26,
    ),
    Theme(
        key="regulation",
        label="Regulation and antitrust",
        patterns=(
            "antitrust", "regulator", "regulatory probe", "competition authority",
            "fine of", "court ruling", "class action", "consent decree",
            "investigation into",
        ),
        assets=("XLK", "XLC", "XLF"),
        weight=0.26,
        context=("company", "firm", "corp", "inc", "group", "maker", "giant", "platform"),
    ),
    Theme(
        key="semiconductor_policy",
        label="Semiconductor policy",
        patterns=(
            "chip export", "semiconductor export", "chip ban", "chip curbs",
            "foundry", "fab capacity", "chipmaking", "advanced chips",
        ),
        assets=("SMH", "XLK"),
        weight=0.34,
    ),
    Theme(
        key="commodities",
        label="Commodities and materials",
        patterns=(
            "gold price", "copper price", "lithium", "rare earth",
            "iron ore", "wheat price", "commodity price", "mining output",
            "metal price",
        ),
        assets=("GLD", "XLB"),
        weight=0.28,
    ),
    Theme(
        key="disaster",
        label="Disaster and weather",
        patterns=(
            "hurricane", "earthquake", "typhoon", "wildfire", "flooding",
            "drought", "severe storm", "natural disaster",
        ),
        assets=("XLU", "XLE", "XLRE"),
        weight=0.26,
    ),
    Theme(
        key="labor_action",
        label="Labour action",
        patterns=(
            "workers strike", "union strike", "walkout", "picket line",
            "labor dispute", "labour dispute", "mass layoffs", "job cuts",
        ),
        assets=("XLI", "XLY"),
        weight=0.26,
    ),
    Theme(
        key="public_health",
        label="Public health",
        patterns=(
            "outbreak", "pandemic", "epidemic", "vaccine rollout",
            "drug approval", "fda approval", "clinical trial",
        ),
        assets=("XLV",),
        weight=0.26,
    ),
)

_COMPILED: tuple[tuple[Theme, re.Pattern[str], re.Pattern[str] | None], ...] = tuple(
    (
        theme,
        re.compile("|".join(re.escape(p) for p in theme.patterns)),
        re.compile("|".join(re.escape(c) for c in theme.context)) if theme.context else None,
    )
    for theme in THEMES
)


@dataclass
class ThemeMatch:
    key: str
    label: str
    weight: float
    assets: list[str] = field(default_factory=list)


def classify(text: str) -> list[ThemeMatch]:
    """Return every theme the text matches, strongest first."""
    blob = text.lower()
    matches: list[ThemeMatch] = []
    for theme, pattern, context in _COMPILED:
        if not pattern.search(blob):
            continue
        if context is not None and not context.search(blob):
            # Ambiguous outside a corporate setting — skip rather than guess.
            continue
        matches.append(
            ThemeMatch(key=theme.key, label=theme.label, weight=theme.weight, assets=list(theme.assets))
        )
    matches.sort(key=lambda m: m.weight, reverse=True)
    return matches


def theme_assets(matches: list[ThemeMatch], limit: int = 4) -> list[str]:
    """Liquid proxies for the matched themes, strongest theme first.

    These stand in for "what could this move" when no company is named. They
    are inputs to analysis, not predictions.
    """
    out: list[str] = []
    for match in matches:
        for asset in match.assets:
            if asset not in out:
                out.append(asset)
            if len(out) >= limit:
                return out
    return out


def theme_score(matches: list[ThemeMatch]) -> float:
    """Importance contribution from themes.

    The strongest theme dominates; additional themes add a little, because a
    story that is simultaneously about sanctions and energy supply is more
    likely to matter than one that is only about either.
    """
    if not matches:
        return 0.0
    score = matches[0].weight
    score += min(0.10, 0.05 * (len(matches) - 1))
    return round(score, 4)

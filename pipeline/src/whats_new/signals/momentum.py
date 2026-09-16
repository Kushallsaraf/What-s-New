"""Conventional momentum / market signals from OHLCV."""

from __future__ import annotations

from typing import Sequence


def _closes(rows: Sequence[dict]) -> list[float]:
    out: list[float] = []
    for row in rows:
        c = row.get("close")
        if c is not None:
            out.append(float(c))
    return out


def momentum_score(closes: Sequence[float]) -> float:
    """Return -1..1 score from short/medium returns and simple RSI-ish pressure."""
    if len(closes) < 5:
        return 0.0
    last = closes[-1]
    r5 = (last / closes[-5] - 1.0) if closes[-5] else 0.0
    r20 = (last / closes[-20] - 1.0) if len(closes) >= 20 and closes[-20] else r5
    # Clip and blend
    def clip(x: float, lim: float = 0.08) -> float:
        return max(-1.0, min(1.0, x / lim))

    score = 0.6 * clip(r5) + 0.4 * clip(r20, 0.15)
    return max(-1.0, min(1.0, score))


def volatility_score(closes: Sequence[float]) -> float:
    """0..1 realized vol proxy (higher = more volatile)."""
    if len(closes) < 6:
        return 0.5
    rets = []
    for i in range(1, len(closes)):
        if closes[i - 1]:
            rets.append(abs(closes[i] / closes[i - 1] - 1.0))
    if not rets:
        return 0.5
    avg = sum(rets) / len(rets)
    return max(0.0, min(1.0, avg / 0.03))


def score_from_rows(rows: Sequence[dict]) -> dict[str, float]:
    closes = _closes(rows)
    return {
        "market_score": momentum_score(closes),
        "volatility": volatility_score(closes),
        "last_close": closes[-1] if closes else 0.0,
    }

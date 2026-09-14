"""Evaluate stored predictions by signal combination and confidence calibration."""

from __future__ import annotations

from collections import defaultdict
from typing import Any


def load_resolved_predictions() -> list[dict[str, Any]]:
    from whats_new import db

    return db.fetch_all(
        """
        SELECT
          p.id,
          p.ticker,
          p.model,
          p.horizon,
          p.horizon_days,
          p.predicted_return,
          p.direction,
          p.confidence,
          p.as_of,
          o.actual_return,
          o.direction_correct,
          o.absolute_error
        FROM predictions p
        JOIN prediction_outcomes o ON o.prediction_id = p.id
        ORDER BY p.as_of DESC
        LIMIT 5000
        """
    )


def _directional_hit(predicted_return: float | None, actual_return: float | None) -> bool | None:
    if predicted_return is None or actual_return is None:
        return None
    if abs(predicted_return) < 0.002 and abs(actual_return) < 0.002:
        return True
    return (predicted_return >= 0) == (actual_return >= 0)


def summarize_by_model(rows: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get("model") or "unknown")].append(row)
    out: dict[str, dict[str, float]] = {}
    for model, items in grouped.items():
        hits = [1.0 if r.get("direction_correct") else 0.0 for r in items]
        maes = [float(r["absolute_error"]) for r in items if r.get("absolute_error") is not None]
        out[model] = {
            "n": float(len(items)),
            "directional_accuracy": sum(hits) / len(hits) if hits else 0.0,
            "mae": sum(maes) / len(maes) if maes else 0.0,
        }
    return out


def confidence_calibration(
    rows: list[dict[str, Any]],
    buckets: tuple[tuple[float, float], ...] = (
        (0.0, 0.5),
        (0.5, 0.7),
        (0.7, 0.8),
        (0.8, 0.9),
        (0.9, 1.01),
    ),
) -> list[dict[str, Any]]:
    """Reliability curve: stated confidence bucket → realized hit rate."""
    result: list[dict[str, Any]] = []
    for lo, hi in buckets:
        bucket_rows = [
            r
            for r in rows
            if r.get("confidence") is not None and lo <= float(r["confidence"]) < hi
        ]
        if not bucket_rows:
            result.append(
                {
                    "bucket": f"{lo:.2f}-{hi:.2f}",
                    "n": 0,
                    "stated_mid": (lo + min(hi, 1.0)) / 2,
                    "hit_rate": None,
                }
            )
            continue
        hits = sum(1 for r in bucket_rows if r.get("direction_correct"))
        result.append(
            {
                "bucket": f"{lo:.2f}-{min(hi, 1.0):.2f}",
                "n": len(bucket_rows),
                "stated_mid": (lo + min(hi, 1.0)) / 2,
                "hit_rate": hits / len(bucket_rows),
            }
        )
    return result


def signal_combo_report() -> dict[str, Any]:
    """Compare news-only / quant-only / market-only / combined using stored signals near prediction time."""
    from whats_new import db

    try:
        rows = db.fetch_all(
            """
            SELECT
              p.ticker,
              p.predicted_return,
              p.direction,
              p.confidence,
              p.model,
              o.actual_return,
              o.direction_correct,
              s.news_score,
              s.quant_score,
              s.market_score,
              s.overall_score
            FROM predictions p
            JOIN prediction_outcomes o ON o.prediction_id = p.id
            LEFT JOIN LATERAL (
              SELECT news_score, quant_score, market_score, overall_score
              FROM signals
              WHERE ticker = p.ticker AND timestamp <= p.as_of
              ORDER BY timestamp DESC
              LIMIT 1
            ) s ON true
            ORDER BY p.as_of DESC
            LIMIT 2000
            """
        )
    except Exception:
        rows = []

    def score_direction(score: float | None) -> str:
        if score is None:
            return "neutral"
        if score > 0.05:
            return "bullish"
        if score < -0.05:
            return "bearish"
        return "neutral"

    combos = {
        "news_only": [],
        "kronos_only": [],
        "market_only": [],
        "combined": [],
        "prediction_model": [],
    }
    for row in rows:
        actual = row.get("actual_return")
        if actual is None:
            continue
        actual_dir = "bullish" if actual > 0.002 else "bearish" if actual < -0.002 else "neutral"
        news_dir = score_direction(row.get("news_score"))
        quant_dir = score_direction(row.get("quant_score"))
        market_dir = score_direction(row.get("market_score"))
        combined_dir = score_direction(row.get("overall_score"))
        combos["news_only"].append(news_dir == actual_dir or actual_dir == "neutral")
        combos["kronos_only"].append(quant_dir == actual_dir or actual_dir == "neutral")
        combos["market_only"].append(market_dir == actual_dir or actual_dir == "neutral")
        combos["combined"].append(combined_dir == actual_dir or actual_dir == "neutral")
        combos["prediction_model"].append(bool(row.get("direction_correct")))

    summary = {}
    for name, flags in combos.items():
        summary[name] = {
            "n": len(flags),
            "directional_accuracy": (sum(1 for f in flags if f) / len(flags)) if flags else None,
        }
    return summary


def full_evaluation_report() -> dict[str, Any]:
    try:
        rows = load_resolved_predictions()
    except Exception as exc:
        return {"status": "error", "error": str(exc)}
    high_conf = [r for r in rows if float(r.get("confidence") or 0) >= 0.8]
    high_hit = (
        sum(1 for r in high_conf if r.get("direction_correct")) / len(high_conf)
        if high_conf
        else None
    )
    return {
        "status": "ok",
        "n_resolved": len(rows),
        "by_model": summarize_by_model(rows),
        "calibration": confidence_calibration(rows),
        "signal_combos": signal_combo_report(),
        "high_confidence": {
            "threshold": 0.8,
            "n": len(high_conf),
            "directional_accuracy": high_hit,
            "statement": (
                f"Signals with confidence >80% were directionally correct "
                f"{int(round((high_hit or 0) * 100))}% of the time over "
                f"{len(high_conf)} resolved predictions."
                if high_conf and high_hit is not None
                else "Not enough high-confidence resolved predictions yet."
            ),
        },
    }

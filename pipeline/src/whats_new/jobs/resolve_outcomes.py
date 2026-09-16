"""Resolve immutable predictions against subsequent market returns."""

from __future__ import annotations

from typing import Any

from whats_new.jobs import job


@job("resolve_outcomes")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.ports import get_telemetry

    telemetry = get_telemetry()
    job_id = ""
    try:
        job_id = db.start_job_run("resolve_outcomes", payload)
    except Exception as exc:
        telemetry.error("resolve_db_unavailable", exc=exc)

    try:
        open_preds = db.fetch_all(
            """
            SELECT p.*
            FROM predictions p
            LEFT JOIN prediction_outcomes o ON o.prediction_id = p.id
            WHERE o.id IS NULL
              AND p.as_of < now() - (p.horizon_days || ' days')::interval
            ORDER BY p.as_of ASC
            LIMIT 500
            """
        )
    except Exception as exc:
        telemetry.error("resolve_query_failed", exc=exc)
        return {"status": "error", "error": str(exc)}

    rows_out = 0
    for pred in open_preds:
        ticker = pred["ticker"]
        as_of = pred["as_of"]
        horizon_days = int(pred["horizon_days"] or 1)
        try:
            start = db.fetch_one(
                """
                SELECT close FROM market_data
                WHERE ticker = %s AND timestamp <= %s
                ORDER BY timestamp DESC LIMIT 1
                """,
                (ticker, as_of),
            )
            end = db.fetch_one(
                """
                SELECT close FROM market_data
                WHERE ticker = %s AND timestamp >= %s + (%s || ' days')::interval
                ORDER BY timestamp ASC LIMIT 1
                """,
                (ticker, as_of, horizon_days),
            )
        except Exception:
            continue
        if not start or not end or not start["close"]:
            continue
        actual_return = float(end["close"]) / float(start["close"]) - 1.0
        predicted = float(pred.get("predicted_return") or 0)
        pred_dir = pred.get("direction") or "neutral"

        def sign(x: float) -> str:
            if x > 0.002:
                return "bullish"
            if x < -0.002:
                return "bearish"
            return "neutral"

        actual_dir = sign(actual_return)
        direction_correct = (
            pred_dir == actual_dir
            or (pred_dir in {"bullish", "mildly_bullish"} and actual_dir == "bullish")
            or (pred_dir in {"bearish", "mildly_bearish"} and actual_dir == "bearish")
        )
        abs_err = abs(predicted - actual_return)
        try:
            db.execute(
                """
                INSERT INTO prediction_outcomes
                  (prediction_id, actual_return, actual_close, direction_correct, absolute_error)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (prediction_id) DO NOTHING
                """,
                (pred["id"], actual_return, float(end["close"]), direction_correct, abs_err),
            )
            rows_out += 1
            # Outcome card
            db.execute(
                """
                INSERT INTO feed_items
                  (card_type, payload, importance, confidence, tickers, section)
                VALUES ('outcome', %s::jsonb, 0.4, %s, %s, 'outcomes')
                """,
                (
                    db.to_jsonb(
                        {
                            "ticker": ticker,
                            "predicted_return": predicted,
                            "actual_return": actual_return,
                            "direction": pred_dir,
                            "direction_correct": direction_correct,
                            "horizon": pred.get("horizon"),
                            "as_of": str(as_of),
                        }
                    ),
                    float(pred.get("confidence") or 0.5),
                    [ticker],
                ),
            )
        except Exception as exc:
            telemetry.error("outcome_insert_failed", exc=exc)

    try:
        db.finish_job_run(job_id, status="ok", rows_in=len(open_preds), rows_out=rows_out)
    except Exception:
        pass
    return {"status": "ok", "rows_in": len(open_preds), "rows_out": rows_out}

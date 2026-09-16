"""Kronos / quant prediction job. Weight stays 0 until retention gate passes."""

from __future__ import annotations

from typing import Any

from whats_new.jobs import job


@job("kronos_predict")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.ports import get_forecaster, get_telemetry
    from whats_new.universe import TICKERS

    telemetry = get_telemetry()
    job_id = ""
    try:
        job_id = db.start_job_run("kronos_predict", payload)
    except Exception as exc:
        telemetry.error("kronos_db_unavailable", exc=exc)

    horizons = payload.get("horizons") or [1, 5]
    tickers = list(payload.get("tickers") or TICKERS[:80])
    forecaster = get_forecaster()
    rows_out = 0

    for ticker in tickers:
        try:
            rows = db.fetch_all(
                """
                SELECT timestamp, open, high, low, close, volume
                FROM market_data
                WHERE ticker = %s
                ORDER BY timestamp ASC
                LIMIT 120
                """,
                (ticker,),
            )
        except Exception:
            rows = []
        if len(rows) < 20:
            continue
        history = [
            {
                "timestamp": r["timestamp"],
                "open": r["open"],
                "high": r["high"],
                "low": r["low"],
                "close": r["close"],
                "volume": r["volume"],
            }
            for r in rows
        ]
        last_close = float(history[-1]["close"] or 0)
        for horizon in horizons:
            try:
                preds = forecaster.predict(history, int(horizon), ticker=ticker)
            except Exception as exc:
                telemetry.error("kronos_predict_failed", exc=exc, ticker=ticker)
                continue
            if not preds:
                continue
            pred_close = float(preds[-1])
            predicted_return = (pred_close / last_close - 1.0) if last_close else 0.0
            direction = (
                "bullish"
                if predicted_return > 0.005
                else "bearish"
                if predicted_return < -0.005
                else "neutral"
            )
            confidence = max(0.2, min(0.7, 0.5 + abs(predicted_return) * 5))
            try:
                pred = db.insert_returning(
                    """
                    INSERT INTO predictions
                      (ticker, model, model_version, horizon, horizon_days,
                       predicted_return, direction, confidence, predicted_close, payload)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    RETURNING id
                    """,
                    (
                        ticker,
                        forecaster.name,
                        "v0",
                        f"{horizon}d",
                        int(horizon),
                        predicted_return,
                        direction,
                        confidence,
                        pred_close,
                        db.to_jsonb({"path": preds}),
                    ),
                )
                if pred:
                    rows_out += 1
                    # Prediction card for notable moves
                    if abs(predicted_return) >= 0.01:
                        db.execute(
                            """
                            INSERT INTO feed_items
                              (card_type, payload, importance, confidence, tickers, section)
                            VALUES ('prediction', %s::jsonb, %s, %s, %s, 'predictions')
                            """,
                            (
                                db.to_jsonb(
                                    {
                                        "ticker": ticker,
                                        "horizon": f"{horizon}d",
                                        "direction": direction,
                                        "predicted_return": predicted_return,
                                        "quant_signal": int(round(confidence * 100)),
                                        "model": forecaster.name,
                                    }
                                ),
                                abs(predicted_return) * 5,
                                confidence,
                                [ticker],
                            ),
                        )
            except Exception as exc:
                telemetry.error("prediction_insert_failed", exc=exc, ticker=ticker)

    try:
        db.finish_job_run(job_id, status="ok", rows_in=len(tickers), rows_out=rows_out)
    except Exception:
        pass
    return {"status": "ok", "rows_in": len(tickers), "rows_out": rows_out, "model": forecaster.name}

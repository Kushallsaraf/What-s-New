"""Ingest OHLCV bars for the tracked universe."""

from __future__ import annotations

from typing import Any

from whats_new.jobs import job


@job("market_data")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.ports import get_telemetry
    from whats_new.sources import build_market_source
    from whats_new.universe import STOCKS, TICKERS

    telemetry = get_telemetry()
    job_id = ""
    try:
        db.seed_universe()
        job_id = db.start_job_run("market_data", payload)
    except Exception as exc:
        telemetry.error("market_data_db_unavailable", exc=exc)

    source = build_market_source()
    batch_size = int(payload.get("batch_size") or 50)
    timeframe = str(payload.get("timeframe") or "1Day")
    limit = int(payload.get("limit") or 40)
    tickers = list(payload.get("tickers") or TICKERS)
    rows_out = 0
    errors: list[str] = []

    for i in range(0, len(tickers), batch_size):
        batch = tickers[i : i + batch_size]
        try:
            bars = source.fetch_bars(batch, timeframe=timeframe, limit=limit)
        except Exception as exc:
            errors.append(str(exc))
            telemetry.error("market_data_batch_failed", exc=exc, batch_start=batch[0])
            continue
        for bar in bars:
            try:
                db.execute(
                    """
                    INSERT INTO market_data
                      (ticker, timestamp, open, high, low, close, volume, feed)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ticker, timestamp) DO UPDATE
                    SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                        close = EXCLUDED.close, volume = EXCLUDED.volume, feed = EXCLUDED.feed,
                        observed_at = now()
                    """,
                    (
                        bar.ticker,
                        bar.timestamp,
                        bar.open,
                        bar.high,
                        bar.low,
                        bar.close,
                        bar.volume,
                        bar.feed,
                    ),
                )
                rows_out += 1
            except Exception as exc:
                errors.append(f"{bar.ticker}: {exc}")

    status = "ok" if not errors else ("partial" if rows_out else "error")
    try:
        db.finish_job_run(
            job_id,
            status=status,
            rows_in=len(tickers),
            rows_out=rows_out,
            error="; ".join(errors[:5]) if errors else None,
        )
    except Exception:
        pass
    return {"status": status, "rows_in": len(tickers), "rows_out": rows_out, "errors": errors[:5]}

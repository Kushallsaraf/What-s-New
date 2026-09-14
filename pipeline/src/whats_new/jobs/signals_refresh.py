"""Recompute per-ticker combined signals and optional sector cards."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from whats_new.jobs import job


@job("signals_refresh")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.ports import get_telemetry
    from whats_new.signals import combine, news_score_from_direction, score_from_rows
    from whats_new.universe import STOCKS, TICKERS

    telemetry = get_telemetry()
    job_id = ""
    try:
        job_id = db.start_job_run("signals_refresh", payload)
    except Exception as exc:
        telemetry.error("signals_db_unavailable", exc=exc)

    tickers = list(payload.get("tickers") or TICKERS)
    rows_out = 0
    sector_scores: dict[str, list[float]] = defaultdict(list)

    for ticker in tickers:
        try:
            bars = db.fetch_all(
                """
                SELECT close FROM market_data
                WHERE ticker = %s ORDER BY timestamp ASC LIMIT 40
                """,
                (ticker,),
            )
            market = score_from_rows(bars)
            latest_event = db.fetch_one(
                """
                SELECT es.direction, es.impact_score, es.confidence
                FROM event_stocks es
                JOIN events e ON e.id = es.event_id
                WHERE es.ticker = %s
                ORDER BY e.created_at DESC
                LIMIT 1
                """,
                (ticker,),
            )
            latest_pred = db.fetch_one(
                """
                SELECT predicted_return, confidence, direction
                FROM predictions
                WHERE ticker = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (ticker,),
            )
        except Exception as exc:
            telemetry.error("signals_ticker_failed", exc=exc, ticker=ticker)
            continue

        news = 0.0
        if latest_event:
            news = news_score_from_direction(
                str(latest_event.get("direction") or "neutral"),
                float(latest_event.get("impact_score") or 0),
                float(latest_event.get("confidence") or 0),
            )
        quant = 0.0
        if latest_pred and latest_pred.get("predicted_return") is not None:
            # Map return to -1..1
            quant = max(-1.0, min(1.0, float(latest_pred["predicted_return"]) / 0.05))

        signal = combine(
            ticker,
            news_score=news,
            quant_score=quant,
            market_score=float(market.get("market_score") or 0),
            meta={"volatility": market.get("volatility")},
        )
        try:
            db.execute(
                """
                INSERT INTO signals
                  (ticker, news_score, quant_score, market_score, overall_score, weights, meta)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb)
                """,
                (
                    ticker,
                    signal.news_score,
                    signal.quant_score,
                    signal.market_score,
                    signal.overall_score,
                    db.to_jsonb(signal.weights),
                    db.to_jsonb(signal.meta),
                ),
            )
            rows_out += 1
        except Exception as exc:
            telemetry.error("signal_insert_failed", exc=exc, ticker=ticker)
            continue

        stock = next((s for s in STOCKS if s.ticker == ticker), None)
        if stock:
            sector_scores[stock.sector].append(signal.overall_score)

    # Sector cards
    for sector, scores in sector_scores.items():
        if sector in {"ETF", ""} or len(scores) < 3:
            continue
        avg = sum(scores) / len(scores)
        # Build top movers in sector from latest signals
        try:
            movers = db.fetch_all(
                """
                SELECT DISTINCT ON (s.ticker) s.ticker, s.overall_score
                FROM signals s
                JOIN stocks st ON st.ticker = s.ticker
                WHERE st.sector = %s
                ORDER BY s.ticker, s.timestamp DESC
                """,
                (sector,),
            )
            movers = sorted(movers, key=lambda r: abs(float(r["overall_score"])), reverse=True)[:5]
            db.execute(
                """
                INSERT INTO feed_items
                  (card_type, payload, importance, confidence, tickers, section)
                VALUES ('sector', %s::jsonb, %s, 0.5, %s, 'today')
                """,
                (
                    db.to_jsonb(
                        {
                            "sector": sector,
                            "sentiment": int(round((avg + 1) * 50)),
                            "movers": [
                                {
                                    "ticker": m["ticker"],
                                    "score": round(float(m["overall_score"]), 3),
                                    "direction": "up" if float(m["overall_score"]) >= 0 else "down",
                                }
                                for m in movers
                            ],
                        }
                    ),
                    abs(avg),
                    [m["ticker"] for m in movers],
                ),
            )
        except Exception:
            pass

    try:
        db.finish_job_run(job_id, status="ok", rows_in=len(tickers), rows_out=rows_out)
    except Exception:
        pass
    return {"status": "ok", "rows_in": len(tickers), "rows_out": rows_out}

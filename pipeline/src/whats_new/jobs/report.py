"""Morning Brief and Closing Report jobs + selective push notifications."""

from __future__ import annotations

from typing import Any

from whats_new.jobs import job


def _build_context(limit: int = 20) -> dict[str, Any]:
    from whats_new import db

    try:
        events = db.fetch_all(
            """
            SELECT headline, summary, importance, confidence, event_type, created_at
            FROM events ORDER BY created_at DESC LIMIT %s
            """,
            (limit,),
        )
        signals = db.fetch_all(
            """
            SELECT DISTINCT ON (ticker) ticker, overall_score, news_score, quant_score, market_score
            FROM signals ORDER BY ticker, timestamp DESC
            """
        )
        signals = sorted(signals, key=lambda r: abs(float(r["overall_score"])), reverse=True)[:15]
    except Exception:
        events, signals = [], []
    return {"events": events, "top_signals": signals}


def _store_report(report_type: str, content: dict[str, Any]) -> str | None:
    from whats_new import db

    meta = content.pop("_meta", {})
    row = db.insert_returning(
        """
        INSERT INTO reports (type, title, content, llm_model, prompt_version)
        VALUES (%s, %s, %s::jsonb, %s, %s)
        RETURNING id
        """,
        (
            report_type,
            content.get("title") or report_type,
            db.to_jsonb(content),
            meta.get("llm_model"),
            meta.get("prompt_version"),
        ),
    )
    return str(row["id"]) if row else None


def _maybe_notify_high_impact() -> int:
    """Send push for high-importance recent events via PushSender port."""
    from whats_new import db
    from whats_new.ports.push import PushMessage, get_push

    sent = 0
    try:
        events = db.fetch_all(
            """
            SELECT e.id, e.headline, e.importance, e.confidence, e.summary,
                   array_agg(es.ticker) AS tickers
            FROM events e
            LEFT JOIN event_stocks es ON es.event_id = e.id
            WHERE e.created_at > now() - interval '2 hours'
              AND e.importance > 0.8 AND e.confidence > 0.7
            GROUP BY e.id
            LIMIT 10
            """
        )
        users = db.fetch_all(
            "SELECT id, push_token, preferences FROM users WHERE push_token IS NOT NULL"
        )
    except Exception:
        return 0

    push = get_push()
    for event in events:
        tickers = [t for t in (event.get("tickers") or []) if t]
        for user in users:
            prefs = user.get("preferences") or {}
            watch = set(prefs.get("watchlist") or [])
            # Relevant if overlap with watchlist, or no watchlist set (broadcast high impact)
            if watch and not watch.intersection(tickers):
                continue
            title = f"{(tickers[0] if tickers else 'MARKET')} · HIGH IMPACT"
            body = event["headline"][:140]
            push.send(
                PushMessage(
                    title=title,
                    body=body,
                    data={"event_id": str(event["id"]), "tickers": tickers},
                    to=user.get("push_token"),
                )
            )
            sent += 1
    return sent


def _run_report(report_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.llm.reports import generate_report
    from whats_new.ports import get_telemetry

    telemetry = get_telemetry()
    job_id = ""
    try:
        job_id = db.start_job_run(f"{report_type}_report", payload)
    except Exception as exc:
        telemetry.error("report_db_unavailable", exc=exc)

    context = _build_context()
    content = generate_report(report_type, context)
    report_id = None
    try:
        report_id = _store_report(report_type, dict(content))
        # Feed card
        db.execute(
            """
            INSERT INTO feed_items
              (card_type, payload, importance, confidence, tickers, section)
            VALUES ('report', %s::jsonb, 0.9, %s, '{}', %s)
            """,
            (
                db.to_jsonb(
                    {
                        "type": report_type,
                        "title": content.get("title"),
                        "summary": content.get("summary"),
                        "confidence": content.get("confidence"),
                        "risks": content.get("risks"),
                        "scenarios": content.get("scenarios"),
                        "report_id": report_id,
                    }
                ),
                float(content.get("confidence") or 0.5),
                "briefing" if report_type == "morning" else "today",
            ),
        )
    except Exception as exc:
        telemetry.error("report_store_failed", exc=exc)

    notified = 0
    if report_type == "morning":
        notified = _maybe_notify_high_impact()

    meta = content.get("_meta") or {}
    try:
        db.finish_job_run(
            job_id,
            status="ok",
            rows_out=1 if report_id else 0,
            llm_tokens=int(meta.get("tokens") or 0),
            estimated_cost_usd=float(meta.get("cost_usd") or 0),
            meta={"report_id": report_id, "notified": notified},
        )
    except Exception:
        pass
    return {"status": "ok", "report_id": report_id, "notified": notified}


@job("morning_report")
def morning(payload: dict[str, Any]) -> dict[str, Any]:
    return _run_report("morning", payload)


@job("closing_report")
def closing(payload: dict[str, Any]) -> dict[str, Any]:
    return _run_report("closing", payload)


# Alias module name expected by plan
@job("report")
def report_alias(payload: dict[str, Any]) -> dict[str, Any]:
    kind = str(payload.get("type") or "morning")
    return _run_report(kind, payload)

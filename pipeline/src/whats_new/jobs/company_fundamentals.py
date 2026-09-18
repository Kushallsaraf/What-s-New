"""Ingest normalized SEC Company Facts/XBRL fundamentals."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from whats_new.jobs import job


@job("company_fundamentals")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.ports import get_telemetry
    from whats_new.sources import SecCompanyFactsSource

    telemetry = get_telemetry()
    dry_run = bool(payload.get("dry_run"))
    since_days = int(payload.get("since_days") or 550)
    limit_per_metric = int(payload.get("limit_per_metric") or 8)
    tickers = [str(value).upper() for value in payload.get("tickers") or []]
    source = SecCompanyFactsSource(tickers=tickers or None)
    since = datetime.now(timezone.utc) - timedelta(days=since_days)

    job_id = ""
    if not dry_run:
        try:
            db.seed_universe()
            job_id = db.start_job_run("company_fundamentals", payload)
        except Exception as exc:
            telemetry.error("company_fundamentals_db_unavailable", exc=exc)

    errors: list[str] = []
    try:
        facts = source.fetch_facts(since=since, limit_per_metric=limit_per_metric)
    except Exception as exc:
        telemetry.error("company_fundamentals_source_failed", exc=exc)
        facts = []
        errors.append(str(exc))

    rows_out = 0
    if not dry_run:
        for fact in facts:
            try:
                row = db.insert_returning(
                    """
                    INSERT INTO company_facts
                      (ticker, cik, metric, label, period_end, value, unit, form,
                       filed_at, fiscal_year, fiscal_period, accession, source_url, raw_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (ticker, metric, period_end, form, accession) DO UPDATE
                    SET value = EXCLUDED.value,
                        unit = EXCLUDED.unit,
                        filed_at = EXCLUDED.filed_at,
                        source_url = EXCLUDED.source_url,
                        raw_json = EXCLUDED.raw_json,
                        observed_at = now()
                    RETURNING id
                    """,
                    (
                        fact.ticker,
                        fact.cik,
                        fact.metric,
                        fact.label,
                        fact.period_end,
                        fact.value,
                        fact.unit,
                        fact.form,
                        fact.filed_at,
                        fact.fiscal_year,
                        fact.fiscal_period,
                        fact.accession,
                        fact.source_url,
                        db.to_jsonb(fact.raw),
                    ),
                )
                rows_out += 1 if row else 0
            except Exception as exc:
                errors.append(f"{fact.ticker}/{fact.metric}: {exc}")

    status = "ok" if not errors else ("partial" if facts else "error")
    if not dry_run:
        try:
            db.finish_job_run(
                job_id,
                status=status,
                rows_in=len(facts),
                rows_out=rows_out,
                error="; ".join(errors[:5]) if errors else None,
            )
        except Exception:
            pass
    preview = [
        {
            "ticker": fact.ticker,
            "metric": fact.metric,
            "period_end": fact.period_end.isoformat(),
            "value": fact.value,
            "unit": fact.unit,
            "form": fact.form,
            "filed_at": fact.filed_at.isoformat() if fact.filed_at else None,
            "source_url": fact.source_url,
        }
        for fact in facts
    ]
    return {
        "status": status,
        "dry_run": dry_run,
        "rows_in": len(facts),
        "rows_out": rows_out,
        "tickers": sorted({fact.ticker for fact in facts}),
        "facts": preview if dry_run else [],
        "errors": errors[:5],
    }

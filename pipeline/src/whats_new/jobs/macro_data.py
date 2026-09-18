"""Ingest official macro observations from Treasury, BLS, FRED, and EIA."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from whats_new.jobs import job


def _preview(observation) -> dict[str, Any]:
    return {
        "source": observation.source,
        "series_id": observation.series_id,
        "series_name": observation.series_name,
        "period": observation.period.isoformat(),
        "value": observation.value,
        "unit": observation.unit,
        "frequency": observation.frequency,
        "source_url": observation.source_url,
    }


@job("macro_data")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.ports import get_telemetry
    from whats_new.sources import build_macro_sources

    telemetry = get_telemetry()
    dry_run = bool(payload.get("dry_run"))
    since_days = int(payload.get("since_days") or 730)
    limit = int(payload.get("limit") or 40)
    since = datetime.now(timezone.utc) - timedelta(days=since_days)

    job_id = ""
    if not dry_run:
        try:
            job_id = db.start_job_run("macro_data", payload)
        except Exception as exc:
            telemetry.error("macro_data_db_unavailable", exc=exc)

    observations = []
    errors: list[str] = []
    for source in build_macro_sources():
        try:
            observations.extend(source.fetch_observations(since=since, limit=limit))
        except Exception as exc:
            source_name = getattr(source, "name", "unknown")
            errors.append(f"{source_name}: {exc}")
            telemetry.error("macro_source_failed", exc=exc, source=source_name)

    rows_out = 0
    if not dry_run:
        for item in observations:
            try:
                row = db.insert_returning(
                    """
                    INSERT INTO macro_observations
                      (source, series_id, series_name, period, value, unit,
                       frequency, source_url, raw_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (source, series_id, period, value) DO NOTHING
                    RETURNING id
                    """,
                    (
                        item.source,
                        item.series_id,
                        item.series_name,
                        item.period,
                        item.value,
                        item.unit,
                        item.frequency,
                        item.source_url,
                        db.to_jsonb(item.raw),
                    ),
                )
                rows_out += 1 if row else 0
            except Exception as exc:
                errors.append(f"{item.source}/{item.series_id}: {exc}")

    status = "ok" if not errors else ("partial" if observations else "error")
    if not dry_run:
        try:
            db.finish_job_run(
                job_id,
                status=status,
                rows_in=len(observations),
                rows_out=rows_out,
                error="; ".join(errors[:5]) if errors else None,
            )
        except Exception:
            pass
    return {
        "status": status,
        "dry_run": dry_run,
        "rows_in": len(observations),
        "rows_out": rows_out,
        "sources": sorted({item.source for item in observations}),
        "observations": [_preview(item) for item in observations] if dry_run else [],
        "errors": errors[:5],
    }

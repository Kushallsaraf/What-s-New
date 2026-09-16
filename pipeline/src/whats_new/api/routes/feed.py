from datetime import datetime, timezone

from fastapi import APIRouter, Query

router = APIRouter()

SECTION_ORDER = [
    "breaking",
    "briefing",
    "recent",
    "today",
    "watchlist",
    "predictions",
    "outcomes",
]


def _as_datetime(value) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def _rank(rows: list[dict], watched: set[str], limit: int) -> list[dict]:
    """Score, sort and trim feed rows. Shared by the database and preview paths
    so a preview is ordered exactly the way the real feed will be."""
    items = []
    for row in rows:
        tickers = list(row.get("tickers") or [])
        relevance = 1.0
        if watched:
            overlap = watched.intersection(tickers)
            relevance = 1.35 if overlap else 0.7
        created = _as_datetime(row.get("created_at"))
        age_hours = 1.0
        if created is not None:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age_hours = max(
                0.25,
                (datetime.now(timezone.utc) - created).total_seconds() / 3600,
            )
        recency = 1.0 / (1.0 + age_hours / 6.0)
        feed_score = (
            float(row.get("importance") or 0)
            * relevance
            * recency
            * max(0.2, float(row.get("confidence") or 0.5))
        )
        items.append(
            {
                "id": str(row["id"]),
                "card_type": row["card_type"],
                "payload": row["payload"],
                "importance": row["importance"],
                "confidence": row["confidence"],
                "tickers": tickers,
                "section": row.get("section") or "recent",
                "created_at": created.isoformat() if created else str(row.get("created_at")),
                "feed_score": feed_score,
            }
        )

    items.sort(key=lambda x: x["feed_score"], reverse=True)
    return items[:limit]


def _preview_rows() -> list[dict] | None:
    """Feed rows from a dry-run file, when one is configured.

    This exists so the app can be built against real pipeline output before
    Supabase is provisioned:

        python -m whats_new.jobs run news_ingest --dry-run --out preview.json
        WN_FEED_PREVIEW_FILE=preview.json uvicorn whats_new.api.main:app

    It is opt-in, only consulted when the database is unreachable, and every
    response it produces is flagged `preview`. Leave the variable unset
    anywhere a user can reach.
    """
    import json

    from whats_new.config import get_settings

    path = get_settings().feed_preview_file
    if not path or not path.exists():
        return None
    try:
        rows = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return rows if isinstance(rows, list) else None


@router.get("/feed")
def feed(
    limit: int = Query(50, ge=1, le=200),
    watchlist: str | None = Query(None, description="Comma-separated tickers"),
) -> dict:
    watched = {t.strip().upper() for t in (watchlist or "").split(",") if t.strip()}
    preview = False
    try:
        from whats_new import db

        rows = db.fetch_all(
            """
            SELECT id, card_type, payload, importance, confidence, tickers, section, created_at
            FROM feed_items
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit * 2,),
        )
    except Exception:
        rows = _preview_rows()
        if rows is None:
            return {
                "items": [],
                "quiet": True,
                "message": "Feed unavailable — database not configured.",
            }
        preview = True

    items = _rank(rows, watched, limit)
    quiet = len(items) < 3

    sections: dict[str, list] = {s: [] for s in SECTION_ORDER}
    for item in items:
        sections.setdefault(item["section"], []).append(item)

    message = None
    if preview:
        message = "Preview data from a dry pipeline run — no database is connected."
    elif quiet:
        message = "Markets were relatively quiet — fewer high-signal items cleared the bar."

    return {
        "items": items,
        "sections": sections,
        "quiet": quiet,
        "preview": preview,
        "message": message,
    }

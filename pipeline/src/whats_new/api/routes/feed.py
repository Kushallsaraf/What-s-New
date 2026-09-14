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


@router.get("/feed")
def feed(
    limit: int = Query(50, ge=1, le=200),
    watchlist: str | None = Query(None, description="Comma-separated tickers"),
) -> dict:
    watched = {t.strip().upper() for t in (watchlist or "").split(",") if t.strip()}
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
        return {"items": [], "quiet": True, "message": "Feed unavailable — database not configured."}

    items = []
    for row in rows:
        tickers = list(row.get("tickers") or [])
        relevance = 1.0
        if watched:
            overlap = watched.intersection(tickers)
            relevance = 1.35 if overlap else 0.7
        age_hours = 1.0
        created = row.get("created_at")
        if isinstance(created, datetime):
            age_hours = max(
                0.25,
                (datetime.now(timezone.utc) - created.astimezone(timezone.utc)).total_seconds()
                / 3600,
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
                "created_at": created.isoformat() if isinstance(created, datetime) else str(created),
                "feed_score": feed_score,
            }
        )

    items.sort(key=lambda x: x["feed_score"], reverse=True)
    items = items[:limit]
    quiet = len(items) < 3
    # Group by section for client convenience
    sections: dict[str, list] = {s: [] for s in SECTION_ORDER}
    for item in items:
        sections.setdefault(item["section"], []).append(item)

    return {
        "items": items,
        "sections": sections,
        "quiet": quiet,
        "message": "Markets were relatively quiet — fewer high-signal items cleared the bar."
        if quiet
        else None,
    }

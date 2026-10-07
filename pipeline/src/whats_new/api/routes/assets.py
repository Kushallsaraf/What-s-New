from fastapi import APIRouter

router = APIRouter()


@router.get("/assets")
def assets() -> dict:
    """Compatible with mobile researchApi.ts snapshot loader."""
    try:
        from whats_new import db

        rows = db.fetch_all(
            """
            SELECT DISTINCT ON (ticker) ticker, close, timestamp
            FROM market_data
            ORDER BY ticker, timestamp DESC
            """
        )
        prev = {}
        for row in rows:
            earlier = db.fetch_one(
                """
                SELECT close FROM market_data
                WHERE ticker = %s AND timestamp < %s
                ORDER BY timestamp DESC LIMIT 1
                """,
                (row["ticker"], row["timestamp"]),
            )
            prev[row["ticker"]] = earlier["close"] if earlier else row["close"]
        assets_out = []
        for row in rows:
            close = float(row["close"] or 0)
            prior = float(prev.get(row["ticker"]) or close)
            move = ((close / prior) - 1.0) * 100 if prior else 0.0
            assets_out.append(
                {
                    "symbol": row["ticker"],
                    "value": round(close, 4),
                    "move": round(move, 4),
                    "freshness": str(row["timestamp"]),
                }
            )
        if assets_out:
            return {"status": "ok", "delayed": True, "assets": assets_out}
    except Exception:
        pass

    # No market data yet. Say so, rather than inventing a $100.00 price that
    # the app would show beside a real news event.
    return {"status": "unavailable", "delayed": True, "assets": []}

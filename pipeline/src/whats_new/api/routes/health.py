from fastapi import APIRouter

from whats_new.config import get_settings
from whats_new.ports import capability_status

router = APIRouter()


@router.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "mode": "fastapi",
        "kronos_enabled": settings.signal_weight_kronos > 0,
        "signal_weights": {
            "news": settings.signal_weight_news,
            "kronos": settings.signal_weight_kronos,
            "market": settings.signal_weight_market,
        },
        "capabilities": capability_status(),
        "database_configured": bool(settings.database_url),
        "news_sources": list(settings.news_sources),
        "alpaca_feed": settings.alpaca_feed,
    }

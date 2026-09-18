from fastapi import APIRouter

from whats_new.config import get_settings

router = APIRouter()


@router.get("/sources")
def sources() -> dict:
    settings = get_settings()
    return {
        "policy": "narrow-high-value",
        "news_sources": list(settings.news_sources),
        "market_data": {
            "provider": "alpaca",
            "feed": settings.alpaca_feed,
            "delayed": settings.alpaca_feed == "iex",
        },
        "macro": list(settings.macro_sources),
        "company_fundamentals": "sec_company_facts",
        "restricted": ["london_strategic_edge"],
        "docs": [
            "docs/data-sources.md",
            "docs/official-data-pipeline.md",
            "docs/cloud-readiness.md",
        ],
    }

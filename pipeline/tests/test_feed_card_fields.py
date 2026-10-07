"""Card fields news_ingest derives for the app: source labels and sections."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from whats_new.jobs.news_ingest import _cluster_sources, _section
from whats_new.sources.base import RawArticle

NOW = datetime(2026, 10, 7, 15, 0, tzinfo=timezone.utc)


def test_syndicated_copies_of_one_story_count_once():
    url = "https://www.cnbc.com/2026/10/07/chevron-ceo-diesel-export-ban.html"
    articles = [
        RawArticle(title="Chevron CEO warns", source=name, url=url)
        for name in ("CNBC Top News", "CNBC Energy", "CNBC World")
    ]
    sources = _cluster_sources(articles)

    assert len(sources) == 1
    assert sources[0]["label"] == "CNBC Top News"


def test_news_outlets_are_not_labelled_company_sources():
    articles = [
        RawArticle(title="t", source="Guardian World", url="https://a"),
        RawArticle(title="t", source="SEC EDGAR", url="https://b"),
        RawArticle(title="t", source="EIA Today in Energy", url="https://c"),
    ]
    assert [s["type"] for s in _cluster_sources(articles)] == ["news", "official", "official"]


def test_breaking_needs_weight_and_freshness():
    assert _section(0.65, NOW - timedelta(hours=1), NOW) == "breaking"
    assert _section(0.65, NOW - timedelta(hours=20), NOW) == "recent"
    assert _section(0.40, NOW - timedelta(minutes=5), NOW) == "recent"
    assert _section(0.90, None, NOW) == "recent"

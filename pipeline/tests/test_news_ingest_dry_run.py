"""The news_ingest job must run its whole funnel without a database.

This exists so the ingest path can be developed and reviewed before Supabase
is provisioned, and so the preview a reviewer looks at comes from the real
code path rather than a parallel one that can drift.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from whats_new import db
from whats_new.jobs.news_ingest import run
from whats_new.sources.base import RawArticle


class DatabaseTouched(BaseException):
    """Not an Exception, so it escapes the job's `except Exception` handlers.

    A dry run that quietly swallowed a database call would still look green.
    """


class StubSource:
    name = "stub"

    def __init__(self, articles: list[RawArticle]) -> None:
        self.articles = articles

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]:
        return list(self.articles)


@pytest.fixture
def no_database(monkeypatch):
    def explode(*args, **kwargs):
        raise DatabaseTouched("dry run must not reach the database")

    monkeypatch.setattr(db, "_connect", explode)
    monkeypatch.setattr(db, "seed_universe", explode)
    monkeypatch.setattr(db, "start_job_run", explode)
    monkeypatch.setattr(db, "finish_job_run", explode)


@pytest.fixture
def no_llm(monkeypatch):
    """Keep the run deterministic and free regardless of the local .env."""
    from whats_new import config

    monkeypatch.setenv("LLM_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    config.reset_settings()
    yield
    config.reset_settings()


@pytest.fixture
def articles(monkeypatch):
    rows = [
        RawArticle(
            title="OPEC signals it will hold crude output steady through the quarter",
            source="Test Wire",
            url="https://example.invalid/opec",
            summary="Ministers meet in Vienna as oil prices hold.",
            published_at=datetime.now(timezone.utc),
        ),
        RawArticle(
            title="Federal Reserve holds rates as inflation data cools",
            source="Test Wire",
            url="https://example.invalid/fed",
            summary="The rate decision leaves the policy rate unchanged.",
            published_at=datetime.now(timezone.utc),
        ),
        RawArticle(
            title="'Tirana teeth': Albania hopes to be the new Turkey for dental work",
            source="Test Wire",
            url="https://example.invalid/dental",
            summary="Clinics report a rise in visitors.",
            published_at=datetime.now(timezone.utc),
        ),
    ]
    import whats_new.sources as sources

    monkeypatch.setattr(sources, "build_news_sources", lambda *a, **k: [StubSource(rows)])
    return rows


def test_dry_run_completes_without_a_database(no_database, no_llm, articles):
    result = run({"dry_run": True})

    assert result["status"] == "ok"
    assert result["dry_run"] is True
    assert result["rows_out"] == 0, "a dry run writes nothing"
    assert result["articles_new"] == 3


def test_dry_run_returns_the_cards_the_app_would_receive(no_database, no_llm, articles):
    result = run({"dry_run": True})

    assert result["events"], "the funnel should reach the event stage"
    headlines = " ".join(e["payload"]["headline"] for e in result["events"])
    assert "OPEC" in headlines
    assert "dental" not in headlines.lower(), "lifestyle copy must not reach analysis"

    card = result["events"][0]["payload"]
    for key in ("headline", "summary", "impact", "sentiment", "confidence", "tickers"):
        assert key in card, f"feed card is missing {key}"
    assert card["tickers"], "an event needs something to attach to"


def test_dry_run_reports_the_themes_behind_each_event(no_database, no_llm, articles):
    result = run({"dry_run": True})

    themes = {t["key"] for e in result["events"] for t in e["payload"]["themes"]}
    assert {"energy_supply", "monetary_policy"} & themes, (
        "theme routing is what lets untickered news through, so the card must carry it"
    )

    labelled = [t for e in result["events"] for t in e["payload"]["themes"]]
    assert all(t["label"] and t["label"] != t["key"] for t in labelled), (
        "the label travels with the key so the client keeps no copy of the taxonomy"
    )


def test_preview_rows_match_the_feed_row_shape(no_database, no_llm, articles):
    """The preview file is served straight through /api/feed, so a row that
    drifts from the database shape breaks the app rather than the pipeline."""
    result = run({"dry_run": True})

    row = result["events"][0]
    for key in ("id", "card_type", "payload", "importance", "confidence", "tickers", "section", "created_at"):
        assert key in row, f"preview row is missing {key}"
    assert row["card_type"] == "event"
    assert row["section"] in {"breaking", "recent"}
    assert isinstance(row["tickers"], list)


def test_dry_run_writes_a_preview_file(no_database, no_llm, articles, tmp_path):
    import json

    out = tmp_path / "nested" / "preview.json"
    result = run({"dry_run": True, "out": str(out)})

    assert result["out"] == str(out)
    rows = json.loads(out.read_text(encoding="utf-8"))
    assert rows == json.loads(json.dumps(result["events"], default=str))

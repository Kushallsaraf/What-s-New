"""News ingestion funnel: fetch → dedupe → extract → score → cluster → LLM → events/feed."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from whats_new.jobs import job


def _direction_label(direction: str) -> str:
    return direction.replace("_", " ")


def _theme_labels(articles: list) -> list[dict[str, str]]:
    """Themes across a cluster, as {key, label}, strongest theme first."""
    from whats_new.ingest.themes import THEMES

    keys = {t for a in articles for t in a.themes}
    return [{"key": t.key, "label": t.label} for t in THEMES if t.key in keys]


@job("news_ingest")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    from whats_new import db
    from whats_new.config import get_settings
    from whats_new.ingest import (
        analysis_tickers,
        article_hash,
        cluster_articles,
        enrich_article,
        filter_new_articles,
        is_analysable,
        is_important,
        score_article,
    )
    from whats_new.llm import analyze_cluster, heuristic_analysis
    from whats_new.llm.client import LlmClient
    from whats_new.ports import get_telemetry
    from whats_new.sources import build_news_sources
    from whats_new.universe import get_stock

    settings = get_settings()
    telemetry = get_telemetry()

    # dry_run exercises the whole pipeline — fetch, enrich, theme-route, score,
    # cluster, analyse — and stops before persistence, so the ingest path can be
    # developed and reviewed before Supabase exists. Same code path either way.
    dry_run = bool(payload.get("dry_run"))
    preview: list[dict[str, Any]] = []

    job_id = ""
    if not dry_run:
        try:
            db.seed_universe()
            job_id = db.start_job_run("news_ingest", payload)
        except Exception as exc:
            telemetry.error("news_ingest_db_unavailable", exc=exc)

    since_hours = int(payload.get("since_hours") or 36)
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    sources = build_news_sources()
    raw_articles = []
    for source in sources:
        try:
            raw_articles.extend(source.fetch_since(since))
        except Exception as exc:
            telemetry.error("news_source_failed", exc=exc, source=getattr(source, "name", "?"))

    enriched = [enrich_article(a) for a in raw_articles]
    if dry_run:
        # filter_new_articles dedupes against news_articles; with no database
        # the best available is dedupe within this batch.
        seen: set[str] = set()
        new_items = []
        for a in enriched:
            h = article_hash(a)
            if h not in seen:
                seen.add(h)
                new_items.append((a, h))
    else:
        new_items = filter_new_articles(enriched)
    rows_in = len(raw_articles)
    stored = 0
    analyzed = 0
    cost = 0.0
    tokens = 0
    budget = settings.llm_budget_usd_per_run

    # Persist all new articles (even low importance)
    important_articles = []
    for article, content_hash in new_items:
        rel = score_article(article)
        if not dry_run:
            try:
                db.execute(
                    """
                    INSERT INTO news_articles
                      (title, source, url, published_at, processed_at, content_hash,
                       raw_json, relevance_score, summary, tickers)
                    VALUES (%s, %s, %s, %s, now(), %s, %s::jsonb, %s, %s, %s)
                    ON CONFLICT (content_hash) DO NOTHING
                    """,
                    (
                        article.title,
                        article.source,
                        article.url,
                        article.published_at,
                        content_hash,
                        db.to_jsonb(article.raw),
                        rel,
                        article.summary[:2000],
                        article.tickers,
                    ),
                )
                stored += 1
            except Exception as exc:
                # A failed row must not also drop the article from analysis.
                telemetry.error("news_article_insert_failed", exc=exc)
        if is_important(article) and is_analysable(article):
            # Clustering and analysis need something to attach to. For a macro
            # or world story that is the theme proxy rather than a company.
            article.tickers = analysis_tickers(article)
            important_articles.append(article)

    clusters = cluster_articles(important_articles)
    client = None
    if settings.llm_api_key:
        try:
            client = LlmClient()
        except Exception:
            client = None

    for cluster in clusters:
        importance_guess = max(score_article(a) for a in cluster.articles)
        if client and budget - cost > 0:
            result = analyze_cluster(cluster, client=client, budget_remaining=budget - cost)
            if result is None:
                result = heuristic_analysis(cluster, importance_guess)
            else:
                cost += result.cost_usd
                tokens += result.tokens
                analyzed += 1
        else:
            result = heuristic_analysis(cluster, importance_guess)

        impacts = result.impacts or [
            {
                "ticker": t,
                "direction": result.direction.get(t, "neutral"),
                "impact_score": result.importance,
                "confidence": result.confidence,
                "reason": result.reasoning_summary,
            }
            for t in result.tickers
        ]
        # Which of these tickers the stories actually named. The rest are
        # theme proxies the pipeline routed to, and a card that presents the
        # two identically is claiming the article mentioned XLF when it did
        # not. `proxy_tickers` survives the merge in analysis_tickers, so the
        # distinction is still recoverable here.
        named = {t for a in cluster.articles for t in a.tickers if t not in a.proxy_tickers}

        payload_card = {
            "headline": result.event,
            "summary": result.reasoning_summary,
            "impact": "High" if result.importance >= 0.75 else "Medium" if result.importance >= 0.45 else "Low",
            "sentiment": _direction_label(
                next(iter(result.direction.values()), "neutral")
            ),
            "confidence": int(round(result.confidence * 100)),
            "tickers": [
                {
                    "ticker": i.get("ticker"),
                    "direction": _direction_label(str(i.get("direction") or "neutral")),
                    "score": int(round(float(i.get("impact_score") or 0) * 100)),
                    "proxy": str(i.get("ticker") or "").upper() not in named,
                }
                for i in impacts
            ],
            "bull_case": result.bull_case,
            "bear_case": result.bear_case,
            "risks": result.risks,
            "sources": [
                {"label": a.source, "url": a.url, "type": "company"}
                for a in cluster.articles
                if a.url
            ][:5],
            "time_horizon": result.time_horizon,
            # Which market themes routed this story here. Empty for an event
            # that named a company outright; the app uses it to distinguish
            # "Exxon said X" from "a shipping story that touches energy".
            # Key and label travel together so the client never has to keep
            # its own copy of the taxonomy in sync.
            "themes": _theme_labels(cluster.articles),
        }
        section = "breaking" if result.importance >= 0.8 else "recent"

        if dry_run:
            # Everything above is the real pipeline; only persistence is
            # skipped. Rows carry the same shape /api/feed returns, so the
            # preview file can be served to the app unchanged.
            published = [a.published_at for a in cluster.articles if a.published_at]
            created_at = max(published) if published else datetime.now(timezone.utc)
            preview.append(
                {
                    "id": cluster.cluster_key,
                    "card_type": "event",
                    "payload": payload_card,
                    "importance": result.importance,
                    "confidence": result.confidence,
                    "tickers": result.tickers,
                    "section": section,
                    "created_at": created_at.isoformat(),
                    "source_count": cluster.source_count,
                    "model": result.llm_model or "heuristic",
                }
            )
            continue

        # Ensure tickers exist in stocks
        for t in result.tickers:
            stock = get_stock(t)
            if stock:
                try:
                    db.upsert_stock(stock.ticker, stock.company_name, stock.sector, stock.industry)
                except Exception:
                    pass

        try:
            event_row = db.insert_returning(
                """
                INSERT INTO events
                  (event_type, headline, summary, importance, confidence,
                   cluster_key, source_count, llm_model, prompt_version, analysis_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (
                    result.event_type,
                    result.event,
                    result.reasoning_summary,
                    result.importance,
                    result.confidence,
                    cluster.cluster_key,
                    cluster.source_count,
                    result.llm_model,
                    result.prompt_version,
                    db.to_jsonb(result.raw or result.__dict__),
                ),
            )
        except Exception as exc:
            telemetry.error("event_insert_failed", exc=exc)
            continue
        if not event_row:
            continue
        event_id = event_row["id"]

        for impact in impacts:
            ticker = str(impact.get("ticker") or "").upper()
            if not ticker or not get_stock(ticker):
                continue
            try:
                db.execute(
                    """
                    INSERT INTO event_stocks
                      (event_id, ticker, impact_score, confidence, direction, reason)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (event_id, ticker) DO UPDATE
                    SET impact_score = EXCLUDED.impact_score,
                        confidence = EXCLUDED.confidence,
                        direction = EXCLUDED.direction,
                        reason = EXCLUDED.reason
                    """,
                    (
                        event_id,
                        ticker,
                        float(impact.get("impact_score") or 0),
                        float(impact.get("confidence") or 0),
                        str(impact.get("direction") or "neutral"),
                        str(impact.get("reason") or "")[:500],
                    ),
                )
            except Exception as exc:
                telemetry.error("event_stock_insert_failed", exc=exc, ticker=ticker)

        # Link articles
        try:
            db.execute(
                "UPDATE news_articles SET event_id = %s WHERE content_hash = ANY(%s)",
                (
                    event_id,
                    [article_hash(a) for a in cluster.articles],
                ),
            )
        except Exception:
            pass

        try:
            db.execute(
                """
                INSERT INTO feed_items
                  (card_type, payload, importance, confidence, tickers, section, event_id)
                VALUES ('event', %s::jsonb, %s, %s, %s, %s, %s)
                """,
                (
                    db.to_jsonb(payload_card),
                    result.importance,
                    result.confidence,
                    result.tickers,
                    section,
                    event_id,
                ),
            )
        except Exception as exc:
            telemetry.error("feed_item_insert_failed", exc=exc)

    if not dry_run:
        try:
            db.finish_job_run(
                job_id,
                status="ok",
                rows_in=rows_in,
                rows_out=stored,
                llm_tokens=tokens,
                estimated_cost_usd=cost,
                meta={"clusters": len(clusters), "analyzed": analyzed},
            )
        except Exception:
            pass

    summary = {
        "status": "ok",
        "rows_in": rows_in,
        "rows_out": stored,
        "clusters": len(clusters),
        "analyzed": analyzed,
        "cost_usd": cost,
    }
    if dry_run:
        # Nothing was written, so report what the funnel did instead of row counts.
        summary.update(
            {
                "dry_run": True,
                "articles_new": len(new_items),
                "articles_analysable": len(important_articles),
                "events": preview,
            }
        )
        out = payload.get("out")
        if out:
            import json
            from pathlib import Path

            path = Path(str(out)).expanduser()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(preview, indent=2, default=str), encoding="utf-8")
            summary["out"] = str(path)
    return summary

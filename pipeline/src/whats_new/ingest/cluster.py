"""Cluster near-duplicate articles into one event key."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from whats_new.http_util import content_hash
from whats_new.ingest.dedupe import is_duplicate_title, normalize_title
from whats_new.sources.base import RawArticle


@dataclass
class ArticleCluster:
    cluster_key: str
    articles: list[RawArticle] = field(default_factory=list)
    tickers: list[str] = field(default_factory=list)

    @property
    def headline(self) -> str:
        return self.articles[0].title if self.articles else ""

    @property
    def source_count(self) -> int:
        return len({a.source for a in self.articles})


def cluster_key_for(article: RawArticle) -> str:
    tickers = ",".join(sorted(article.tickers)[:3]) or "none"
    # Bucket by day + normalized title tokens
    day = ""
    if article.published_at:
        day = article.published_at.strftime("%Y-%m-%d")
    title_norm = normalize_title(article.title)[:80]
    return content_hash(day, tickers, title_norm)[:24]


def cluster_articles(
    articles: list[RawArticle],
    window: timedelta = timedelta(hours=18),
) -> list[ArticleCluster]:
    clusters: list[ArticleCluster] = []
    for article in articles:
        placed = False
        for cluster in clusters:
            if not _compatible(cluster.articles[0], article, window):
                continue
            if is_duplicate_title(cluster.articles[0].title, article.title) or (
                set(cluster.tickers) & set(article.tickers)
                and is_duplicate_title(cluster.articles[0].title, article.title, 0.6)
            ):
                cluster.articles.append(article)
                for t in article.tickers:
                    if t not in cluster.tickers:
                        cluster.tickers.append(t)
                placed = True
                break
        if not placed:
            clusters.append(
                ArticleCluster(
                    cluster_key=cluster_key_for(article),
                    articles=[article],
                    tickers=list(article.tickers),
                )
            )
    return clusters


def _compatible(a: RawArticle, b: RawArticle, window: timedelta) -> bool:
    if a.published_at and b.published_at:
        return abs(a.published_at - b.published_at) <= window
    return True

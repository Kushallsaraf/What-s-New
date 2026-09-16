"""Article deduplication via content hash and near-duplicate titles."""

from __future__ import annotations

import re

from whats_new.http_util import content_hash
from whats_new.sources.base import RawArticle


def normalize_title(title: str) -> str:
    text = title.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def article_hash(article: RawArticle) -> str:
    return content_hash(
        normalize_title(article.title),
        article.url or "",
        article.source,
        ",".join(sorted(article.tickers)),
    )


def is_duplicate_title(a: str, b: str, threshold: float = 0.85) -> bool:
    """Simple token Jaccard similarity for clustering / dedupe."""
    ta = set(normalize_title(a).split())
    tb = set(normalize_title(b).split())
    if not ta or not tb:
        return False
    inter = len(ta & tb)
    union = len(ta | tb)
    return (inter / union) >= threshold


def filter_new_articles(articles: list[RawArticle]) -> list[tuple[RawArticle, str]]:
    """Return articles whose content_hash is not already in news_articles."""
    from whats_new import db

    out: list[tuple[RawArticle, str]] = []
    seen_local: set[str] = set()
    for article in articles:
        h = article_hash(article)
        if h in seen_local:
            continue
        seen_local.add(h)
        try:
            existing = db.fetch_one(
                "SELECT id FROM news_articles WHERE content_hash = %s",
                (h,),
            )
        except Exception:
            existing = None
        if existing:
            continue
        out.append((article, h))
    return out

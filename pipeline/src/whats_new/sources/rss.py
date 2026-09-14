"""Publisher RSS news source."""

from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Iterable
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

from whats_new.sources.base import RawArticle

# Narrow allowlist of financial RSS feeds.
DEFAULT_FEEDS: tuple[tuple[str, str], ...] = (
    ("Reuters Business", "https://feeds.reuters.com/reuters/businessNews"),
    ("CNBC Top News", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
)


class RssNewsSource:
    name = "rss"

    def __init__(self, feeds: Iterable[tuple[str, str]] | None = None) -> None:
        self.feeds = list(feeds or DEFAULT_FEEDS)

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]:
        from whats_new.config import get_settings
        from whats_new.http_util import content_hash, fixture_path

        settings = get_settings()
        articles: list[RawArticle] = []
        for source_name, url in self.feeds:
            key = f"rss_{content_hash(url)[:16]}"
            path = fixture_path(key)
            try:
                if settings.replay and path.exists():
                    xml_text = path.read_text(encoding="utf-8")
                else:
                    req = Request(url, headers={"User-Agent": "WhatsNewMVP/0.1"})
                    with urlopen(req, timeout=20) as resp:
                        xml_text = resp.read().decode("utf-8", errors="replace")
                    path.write_text(xml_text, encoding="utf-8")
            except Exception:
                continue
            articles.extend(self._parse(source_name, xml_text, since))
        return articles

    def _parse(self, source_name: str, xml_text: str, since: datetime | None) -> list[RawArticle]:
        out: list[RawArticle] = []
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return out
        items = root.findall(".//item")
        for item in items:
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip() or None
            summary = (item.findtext("description") or "").strip()
            pub_raw = item.findtext("pubDate")
            published = None
            if pub_raw:
                try:
                    published = parsedate_to_datetime(pub_raw)
                    if published.tzinfo is None:
                        published = published.replace(tzinfo=timezone.utc)
                except Exception:
                    published = None
            if since and published and published < since:
                continue
            if not title:
                continue
            out.append(
                RawArticle(
                    title=title,
                    source=source_name,
                    url=link,
                    published_at=published,
                    summary=summary,
                    content=summary,
                    raw={"source": source_name},
                )
            )
        return out

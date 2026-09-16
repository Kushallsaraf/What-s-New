"""Publisher RSS news source."""

from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Iterable
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

from whats_new.sources.base import RawArticle

# Free, no-key feeds covering the news that actually moves a broad market:
# general business, the macro/policy cycle, and the sectors whose data is
# published on a schedule. Every entry below was verified reachable; the
# Reuters business feed that used to head this list was retired upstream and
# had been failing silently for some time.
DEFAULT_FEEDS: tuple[tuple[str, str], ...] = (
    # General market and business
    ("CNBC Top News", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
    ("CNBC Markets", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135"),
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
    ("MarketWatch Top Stories", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    # Macro and policy — the official series, not commentary about them
    ("Federal Reserve", "https://www.federalreserve.gov/feeds/press_all.xml"),
    ("BLS Releases", "https://www.bls.gov/feed/bls_latest.rss"),
    ("CNBC Economy", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258"),
    # Sector data published on a cadence
    ("EIA Today in Energy", "https://www.eia.gov/rss/todayinenergy.xml"),
    ("CNBC Energy", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19836768"),
    ("CNBC Health", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000108"),
    # World news. Most market-moving events — tariffs, sanctions, conflict,
    # elections, shipping disruption — are reported here first and name no
    # company at all, so these only became useful once ingest/themes.py could
    # route an untickered story to an affected sector.
    ("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("Guardian World", "https://www.theguardian.com/world/rss"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
    ("UN News", "https://news.un.org/feed/subscribe/en/news/all/rss.xml"),
    ("CNBC World", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362"),
)


class RssNewsSource:
    name = "rss"

    def __init__(self, feeds: Iterable[tuple[str, str]] | None = None) -> None:
        self.feeds = list(feeds or DEFAULT_FEEDS)

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]:
        from whats_new.config import get_settings
        from whats_new.http_util import content_hash, fixture_path

        from whats_new.ports import get_telemetry

        settings = get_settings()
        telemetry = get_telemetry()
        # Government feeds expect a contact address in the user agent, and the
        # SEC requires one; reuse the address already configured for EDGAR.
        user_agent = settings.sec_user_agent or "WhatsNewMVP/0.1"

        articles: list[RawArticle] = []
        failed: list[str] = []
        for source_name, url in self.feeds:
            key = f"rss_{content_hash(url)[:16]}"
            path = fixture_path(key)
            try:
                if settings.replay and path.exists():
                    xml_text = path.read_text(encoding="utf-8")
                else:
                    req = Request(url, headers={"User-Agent": user_agent})
                    with urlopen(req, timeout=20) as resp:
                        xml_text = resp.read().decode("utf-8", errors="replace")
                    path.write_text(xml_text, encoding="utf-8")
            except Exception as exc:
                # A feed that dies upstream must not disappear quietly — that is
                # how the retired Reuters feed went unnoticed.
                failed.append(source_name)
                telemetry.error("rss_feed_failed", exc=exc, source=source_name, url=url)
                continue
            parsed = self._parse(source_name, xml_text, since)
            if not parsed:
                telemetry.info("rss_feed_empty", source=source_name)
            articles.extend(parsed)

        if failed:
            telemetry.info(
                "rss_feeds_degraded",
                failed=",".join(failed),
                ok=len(self.feeds) - len(failed),
                total=len(self.feeds),
            )
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

"""SEC EDGAR recent filings as news-like events."""

from __future__ import annotations

from datetime import datetime, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import RawArticle
from whats_new.universe import STOCKS

# Map a few well-known CIKs for high-signal filers in the universe.
CIK_BY_TICKER: dict[str, str] = {
    "AAPL": "0000320193",
    "MSFT": "0000789019",
    "NVDA": "0001045810",
    "GOOGL": "0001652044",
    "AMZN": "0001018724",
    "META": "0001326801",
    "TSLA": "0001318605",
    "JPM": "0000019617",
    "XOM": "0000034088",
    "JNJ": "0000200406",
}


class SecEdgarNewsSource:
    name = "sec_edgar"

    def __init__(
        self,
        user_agent: str | None = None,
        tickers: list[str] | None = None,
        timeout: float = 10.0,
    ) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.user_agent = user_agent or settings.sec_user_agent
        self.tickers = tickers or list(CIK_BY_TICKER.keys())
        self.timeout = timeout

    def fetch_since(self, since: datetime | None = None) -> list[RawArticle]:
        from whats_new.ports import get_telemetry

        telemetry = get_telemetry()
        articles: list[RawArticle] = []
        failures = 0
        for ticker in self.tickers:
            cik = CIK_BY_TICKER.get(ticker)
            if not cik:
                continue
            url = f"https://data.sec.gov/submissions/CIK{cik}.json"
            try:
                payload = http_json(
                    url,
                    headers={"User-Agent": self.user_agent, "Accept-Encoding": "gzip, deflate"},
                    fixture_name=f"sec_{ticker}",
                    timeout=self.timeout,
                )
            except Exception as exc:
                # data.sec.gov fails as a host, not per filer: an unset
                # SEC_USER_AGENT, a rate limit or a DNS block hits every
                # request alike. Retrying all ten costs minutes and returns
                # nothing, so stop after the second failure.
                failures += 1
                if failures >= 2:
                    telemetry.error("sec_source_unreachable", exc=exc, tried=failures)
                    break
                continue
            recent = (payload.get("filings") or {}).get("recent") or {}
            forms = recent.get("form") or []
            accessions = recent.get("accessionNumber") or []
            filings_dates = recent.get("filingDate") or []
            primary_docs = recent.get("primaryDocument") or []
            descriptions = recent.get("primaryDocDescription") or []
            for i, form in enumerate(forms[:20]):
                if form not in {"8-K", "10-K", "10-Q", "6-K", "4", "S-1", "SC 13D", "SC 13G"}:
                    continue
                filing_date = filings_dates[i] if i < len(filings_dates) else None
                published = None
                if filing_date:
                    published = datetime.fromisoformat(filing_date).replace(tzinfo=timezone.utc)
                if since and published and published < since:
                    continue
                accession = accessions[i] if i < len(accessions) else ""
                doc = primary_docs[i] if i < len(primary_docs) else ""
                desc = descriptions[i] if i < len(descriptions) else form
                acc_nodash = accession.replace("-", "")
                link = (
                    f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_nodash}/{doc}"
                    if accession and doc
                    else None
                )
                company = next((s.company_name for s in STOCKS if s.ticker == ticker), ticker)
                articles.append(
                    RawArticle(
                        title=f"{company} files Form {form}: {desc}",
                        source="SEC EDGAR",
                        url=link,
                        published_at=published,
                        summary=f"{ticker} filed {form} on {filing_date}",
                        content=desc or "",
                        tickers=[ticker],
                        raw={"form": form, "accession": accession, "cik": cik},
                    )
                )
        return articles

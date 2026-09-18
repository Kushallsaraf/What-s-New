"""SEC Company Facts/XBRL adapter for normalized company fundamentals."""

from __future__ import annotations

from datetime import datetime, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import CompanyFact
from whats_new.sources.sec_common import RequestThrottle, SecTickerIndex, sec_headers


# Preferred concept first. Canadian and other foreign issuers often report
# `ifrs-full` rather than `us-gaap`, so both taxonomies map to the same metric.
METRICS: dict[str, tuple[str, dict[str, tuple[str, ...]]]] = {
    "revenue": (
        "Revenue",
        {
            "us-gaap": ("RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"),
            "ifrs-full": ("Revenue",),
        },
    ),
    "net_income": (
        "Net income",
        {"us-gaap": ("NetIncomeLoss",), "ifrs-full": ("ProfitLoss",)},
    ),
    "operating_income": (
        "Operating income",
        {"us-gaap": ("OperatingIncomeLoss",), "ifrs-full": ("OperatingProfitLoss",)},
    ),
    "diluted_eps": (
        "Diluted earnings per share",
        {
            "us-gaap": ("EarningsPerShareDiluted",),
            "ifrs-full": ("DilutedEarningsLossPerShare",),
        },
    ),
    "assets": (
        "Total assets",
        {"us-gaap": ("Assets",), "ifrs-full": ("Assets",)},
    ),
    "liabilities": (
        "Total liabilities",
        {"us-gaap": ("Liabilities",), "ifrs-full": ("Liabilities",)},
    ),
    "cash": (
        "Cash and cash equivalents",
        {
            "us-gaap": ("CashAndCashEquivalentsAtCarryingValue",),
            "ifrs-full": ("CashAndCashEquivalents",),
        },
    ),
    "operating_cash_flow": (
        "Cash from operating activities",
        {
            "us-gaap": ("NetCashProvidedByUsedInOperatingActivities",),
            "ifrs-full": ("CashFlowsFromUsedInOperatingActivities",),
        },
    ),
}

ALLOWED_FORMS = {"10-Q", "10-K", "20-F", "40-F", "6-K"}


def _date(value: object) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


class SecCompanyFactsSource:
    name = "sec_company_facts"

    def __init__(
        self,
        user_agent: str | None = None,
        tickers: list[str] | None = None,
        timeout: float = 20.0,
        request_interval: float = 0.12,
    ) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.user_agent = user_agent or settings.sec_user_agent
        self.tickers = tickers or list(settings.sec_tickers)
        self.timeout = timeout
        self.index = SecTickerIndex(self.user_agent, timeout=timeout)
        self.throttle = RequestThrottle(request_interval)

    def fetch_facts(
        self,
        *,
        since: datetime | None = None,
        limit_per_metric: int = 12,
    ) -> list[CompanyFact]:
        companies = self.index.resolve_many(self.tickers)
        facts: list[CompanyFact] = []
        for company in companies:
            self.throttle.wait()
            payload = http_json(
                f"https://data.sec.gov/api/xbrl/companyfacts/CIK{company.cik}.json",
                headers=sec_headers(self.user_agent),
                fixture_name=f"sec_companyfacts_{company.ticker}",
                timeout=self.timeout,
            )
            taxonomies = payload.get("facts") or {}
            for metric, (label, concepts_by_taxonomy) in METRICS.items():
                concept_row = None
                taxonomy = ""
                concept = ""
                for candidate_taxonomy, concepts in concepts_by_taxonomy.items():
                    taxonomy_rows = taxonomies.get(candidate_taxonomy) or {}
                    concept = next((name for name in concepts if taxonomy_rows.get(name)), "")
                    if concept:
                        taxonomy = candidate_taxonomy
                        concept_row = taxonomy_rows[concept]
                        break
                if not concept_row:
                    continue
                units = concept_row.get("units") or {}
                candidates: list[CompanyFact] = []
                for unit, rows in units.items():
                    for row in rows or []:
                        form = str(row.get("form") or "")
                        if form not in ALLOWED_FORMS:
                            continue
                        period_end = _date(row.get("end"))
                        filed_at = _date(row.get("filed"))
                        if not period_end or (since and filed_at and filed_at < since):
                            continue
                        try:
                            value = float(row["val"])
                        except (KeyError, TypeError, ValueError):
                            continue
                        accession = str(row.get("accn") or "")
                        acc_nodash = accession.replace("-", "")
                        candidates.append(
                            CompanyFact(
                                ticker=company.ticker,
                                cik=company.cik,
                                metric=metric,
                                label=str(concept_row.get("label") or label),
                                period_end=period_end,
                                value=value,
                                unit=str(unit),
                                form=form,
                                filed_at=filed_at,
                                fiscal_year=int(row["fy"]) if row.get("fy") else None,
                                fiscal_period=str(row.get("fp") or ""),
                                accession=accession,
                                source_url=(
                                    f"https://www.sec.gov/Archives/edgar/data/{int(company.cik)}/{acc_nodash}/"
                                    if accession
                                    else f"https://data.sec.gov/api/xbrl/companyfacts/CIK{company.cik}.json"
                                ),
                                raw={**row, "_taxonomy": taxonomy, "_concept": concept},
                            )
                        )
                candidates.sort(
                    key=lambda item: (item.filed_at or item.period_end, item.period_end),
                    reverse=True,
                )
                facts.extend(candidates[: max(1, limit_per_metric)])
        return facts

"""Official U.S. Treasury daily par-yield observations."""

from __future__ import annotations

from datetime import datetime, timezone
from xml.etree import ElementTree

from whats_new.http_util import http_text
from whats_new.sources.base import MacroObservation


TREASURY_SERIES: dict[str, tuple[str, str]] = {
    "BC_2YEAR": ("2-year Treasury par yield", "DGS2"),
    "BC_10YEAR": ("10-year Treasury par yield", "DGS10"),
    "BC_30YEAR": ("30-year Treasury par yield", "DGS30"),
}


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


class TreasuryMacroSource:
    name = "treasury"
    BASE = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml"

    def __init__(self, user_agent: str | None = None) -> None:
        from whats_new.config import get_settings

        self.user_agent = user_agent or get_settings().sec_user_agent

    def fetch_observations(
        self,
        *,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[MacroObservation]:
        year = (since or datetime.now(timezone.utc)).year
        text = http_text(
            self.BASE,
            headers={"User-Agent": self.user_agent},
            params={
                "data": "daily_treasury_yield_curve",
                "field_tdr_date_value": str(year),
            },
            fixture_name=f"treasury_yields_{year}",
        )
        root = ElementTree.fromstring(text)
        observations: list[MacroObservation] = []
        for properties in (node for node in root.iter() if _local_name(node.tag) == "properties"):
            values = {_local_name(child.tag): (child.text or "").strip() for child in properties}
            raw_date = values.get("NEW_DATE") or values.get("Date")
            if not raw_date:
                continue
            try:
                period = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                if period.tzinfo is None:
                    period = period.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            if since and period < since:
                continue
            for field, (name, series_id) in TREASURY_SERIES.items():
                raw_value = values.get(field, "")
                if not raw_value:
                    continue
                try:
                    value = float(raw_value)
                except ValueError:
                    continue
                observations.append(
                    MacroObservation(
                        source="U.S. Treasury",
                        series_id=series_id,
                        series_name=name,
                        period=period,
                        value=value,
                        unit="percent",
                        frequency="daily",
                        source_url=(
                            "https://home.treasury.gov/resource-center/data-chart-center/"
                            "interest-rates/TextView?type=daily_treasury_yield_curve"
                        ),
                        raw={"field": field, "date": raw_date, "value": raw_value},
                    )
                )
        observations.sort(key=lambda item: item.period, reverse=True)
        return observations[: max(1, limit) * len(TREASURY_SERIES)]

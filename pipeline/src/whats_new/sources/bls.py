"""BLS inflation and labor observations using the public API."""

from __future__ import annotations

import calendar
from datetime import datetime, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import MacroObservation


BLS_SERIES: dict[str, tuple[str, str, str]] = {
    "CUSR0000SA0": ("Consumer Price Index for All Urban Consumers", "index 1982-84=100", "monthly"),
    "CES0000000001": ("Total nonfarm payroll employment", "thousands of persons", "monthly"),
    "LNS14000000": ("Civilian unemployment rate", "percent", "monthly"),
}


class BlsMacroSource:
    name = "bls"
    BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

    def __init__(self, api_key: str | None = None, series: tuple[str, ...] | None = None) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.api_key = api_key or settings.bls_api_key
        self.series = series or settings.bls_series

    def fetch_observations(
        self,
        *,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[MacroObservation]:
        now = datetime.now(timezone.utc)
        start_year = since.year if since else max(now.year - 2, 1913)
        body: dict[str, object] = {
            "seriesid": list(self.series),
            "startyear": str(start_year),
            "endyear": str(now.year),
        }
        if self.api_key:
            body["registrationkey"] = self.api_key
        payload = http_json(
            self.BASE,
            method="POST",
            body=body,
            fixture_name=f"bls_{start_year}_{now.year}_{len(self.series)}",
        )
        if str(payload.get("status") or "").upper() != "REQUEST_SUCCEEDED":
            messages = "; ".join(payload.get("message") or [])
            raise RuntimeError(f"BLS request failed: {messages or 'unknown response'}")

        observations: list[MacroObservation] = []
        for series_row in (payload.get("Results") or {}).get("series") or []:
            series_id = str(series_row.get("seriesID") or "")
            meta = BLS_SERIES.get(series_id, (series_id, "", "monthly"))
            rows: list[MacroObservation] = []
            for row in series_row.get("data") or []:
                period_code = str(row.get("period") or "")
                if not period_code.startswith("M") or period_code == "M13":
                    continue
                try:
                    year = int(row["year"])
                    month = int(period_code[1:])
                    day = calendar.monthrange(year, month)[1]
                    period = datetime(year, month, day, tzinfo=timezone.utc)
                    value = float(str(row["value"]).replace(",", ""))
                except (KeyError, TypeError, ValueError):
                    continue
                if since and period < since:
                    continue
                rows.append(
                    MacroObservation(
                        source="BLS",
                        series_id=series_id,
                        series_name=meta[0],
                        period=period,
                        value=value,
                        unit=meta[1],
                        frequency=meta[2],
                        source_url=f"https://data.bls.gov/timeseries/{series_id}",
                        raw=row,
                    )
                )
            observations.extend(sorted(rows, key=lambda item: item.period, reverse=True)[:limit])
        return observations

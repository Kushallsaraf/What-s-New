"""FRED observations for supplementary, non-duplicative macro context."""

from __future__ import annotations

from datetime import datetime, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import MacroObservation


FRED_SERIES: dict[str, tuple[str, str, str]] = {
    "FEDFUNDS": ("Effective federal funds rate", "percent", "monthly"),
    "GDPC1": ("Real gross domestic product", "billions of chained 2017 dollars", "quarterly"),
    "INDPRO": ("Industrial production index", "index 2017=100", "monthly"),
    "RSAFS": ("Advance retail and food services sales", "millions of dollars", "monthly"),
}


class FredMacroSource:
    name = "fred"
    BASE = "https://api.stlouisfed.org/fred/series/observations"

    def __init__(self, api_key: str | None = None, series: tuple[str, ...] | None = None) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.api_key = api_key or settings.fred_api_key
        self.series = series or settings.fred_series

    def fetch_observations(
        self,
        *,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[MacroObservation]:
        if not self.api_key:
            raise RuntimeError("FRED_API_KEY is required")

        observations: list[MacroObservation] = []
        for series_id in self.series:
            meta = FRED_SERIES.get(series_id, (series_id, "", "unknown"))
            params: dict[str, object] = {
                "series_id": series_id,
                "api_key": self.api_key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": max(1, limit),
            }
            if since:
                params["observation_start"] = since.date().isoformat()
            payload = http_json(
                self.BASE,
                params=params,
                fixture_name=f"fred_{series_id}",
            )
            for row in payload.get("observations") or []:
                raw_value = str(row.get("value") or "").strip()
                if not raw_value or raw_value == ".":
                    continue
                try:
                    period = datetime.fromisoformat(str(row["date"])).replace(tzinfo=timezone.utc)
                    value = float(raw_value)
                except (KeyError, TypeError, ValueError):
                    continue
                observations.append(
                    MacroObservation(
                        source="FRED",
                        series_id=series_id,
                        series_name=meta[0],
                        period=period,
                        value=value,
                        unit=meta[1],
                        frequency=meta[2],
                        source_url=f"https://fred.stlouisfed.org/series/{series_id}",
                        raw=row,
                    )
                )
        return observations

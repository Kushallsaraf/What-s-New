"""EIA energy inventory and production observations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from whats_new.http_util import http_json
from whats_new.sources.base import MacroObservation


@dataclass(frozen=True)
class EiaSeries:
    route: str
    name: str
    frequency: str = "weekly"


EIA_SERIES: dict[str, EiaSeries] = {
    "WCESTUS1": EiaSeries("petroleum/stoc/wstk", "U.S. crude oil stocks excluding SPR"),
    "WGTSTUS1": EiaSeries("petroleum/stoc/wstk", "U.S. total motor gasoline stocks"),
    "WCRFPUS2": EiaSeries("petroleum/sum/sndw", "U.S. field production of crude oil"),
    "NW2_EPG0_SWO_R48_BCF": EiaSeries(
        "natural-gas/stor/wkly",
        "Lower 48 working natural gas in underground storage",
    ),
}


def _parse_period(value: str) -> datetime | None:
    for candidate in (value, f"{value}-01", f"{value}-01-01"):
        try:
            parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


class EiaMacroSource:
    name = "eia"
    BASE = "https://api.eia.gov/v2"

    def __init__(self, api_key: str | None = None, series: tuple[str, ...] | None = None) -> None:
        from whats_new.config import get_settings

        settings = get_settings()
        self.api_key = api_key or settings.eia_api_key
        self.series = series or settings.eia_series

    def fetch_observations(
        self,
        *,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[MacroObservation]:
        if not self.api_key:
            raise RuntimeError("EIA_API_KEY is required")
        observations: list[MacroObservation] = []
        for series_id in self.series:
            spec = EIA_SERIES.get(series_id)
            if spec is None:
                continue
            params: dict[str, object] = {
                "api_key": self.api_key,
                "frequency": spec.frequency,
                "data[0]": "value",
                "facets[series][]": series_id,
                "sort[0][column]": "period",
                "sort[0][direction]": "desc",
                "length": max(1, limit),
            }
            if since:
                params["start"] = since.date().isoformat()
            url = f"{self.BASE}/{spec.route}/data/"
            payload = http_json(
                url,
                params=params,
                fixture_name=f"eia_{series_id}",
            )
            response = payload.get("response") or {}
            for row in response.get("data") or []:
                period = _parse_period(str(row.get("period") or ""))
                try:
                    value = float(str(row.get("value") or "").replace(",", ""))
                except ValueError:
                    continue
                if not period or (since and period < since):
                    continue
                observations.append(
                    MacroObservation(
                        source="EIA",
                        series_id=series_id,
                        series_name=str(row.get("series-description") or spec.name),
                        period=period,
                        value=value,
                        unit=str(row.get("units") or ""),
                        frequency=spec.frequency,
                        source_url=f"https://www.eia.gov/opendata/browser/{spec.route}",
                        raw=row,
                    )
                )
        return observations

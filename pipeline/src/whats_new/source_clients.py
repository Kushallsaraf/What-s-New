"""Small clients for free, official sources. No paid service is required."""

from __future__ import annotations

import csv
import io
import json
import urllib.parse
import urllib.request
from typing import Any


def fetch_fred_series(series_id: str, timeout: float = 20.0) -> list[dict[str, str]]:
    """Fetch a public FRED graph CSV without requiring an API key."""
    safe_id = urllib.parse.quote(series_id, safe="")
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={safe_id}"
    request = urllib.request.Request(url, headers={"User-Agent": "whats-new-mvp/0.1"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        text = response.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def fetch_sec_submissions(cik: str, user_agent: str, timeout: float = 20.0) -> dict[str, Any]:
    """Fetch company submission metadata while respecting SEC identification rules."""
    if "@" not in user_agent:
        raise ValueError("SEC user_agent must identify the project and include a contact email")
    digits = "".join(character for character in cik if character.isdigit())
    if not digits:
        raise ValueError("CIK must contain digits")
    normalized = f"{int(digits):010d}"
    request = urllib.request.Request(
        f"https://data.sec.gov/submissions/CIK{normalized}.json",
        headers={"User-Agent": user_agent},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_bls_series(series_ids: list[str], start_year: int, end_year: int, timeout: float = 20.0) -> dict[str, Any]:
    """Use the public BLS v2 endpoint within its unauthenticated limits."""
    if not series_ids:
        raise ValueError("at least one BLS series id is required")
    payload = json.dumps(
        {
            "seriesid": series_ids,
            "startyear": str(start_year),
            "endyear": str(end_year),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.bls.gov/publicAPI/v2/timeseries/data/",
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "whats-new-mvp/0.1"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))

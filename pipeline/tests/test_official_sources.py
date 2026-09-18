"""Contract tests for free official macro and SEC source adapters."""

from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from whats_new.sources.base import MacroObservation
from whats_new.sources.bls import BlsMacroSource
from whats_new.sources.eia import EiaMacroSource
from whats_new.sources.fred import FredMacroSource
from whats_new.sources.sec_common import SecCompany, SecTickerIndex
from whats_new.sources.sec_company_facts import SecCompanyFactsSource
from whats_new.sources.treasury import TreasuryMacroSource
from whats_new.http_util import _redact_url


class MacroSourceTests(unittest.TestCase):
    def test_query_credentials_are_redacted_from_errors(self):
        safe = _redact_url(
            "https://example.test/data?series=x&api_key=super-secret&token=also-secret"
        )
        self.assertIn("series=x", safe)
        self.assertNotIn("super-secret", safe)
        self.assertNotIn("also-secret", safe)

    @patch("whats_new.sources.fred.http_json")
    def test_fred_parses_observations_and_missing_values(self, request):
        request.return_value = {
            "observations": [
                {"date": "2026-08-01", "value": "4.25"},
                {"date": "2026-07-01", "value": "."},
            ]
        }
        rows = FredMacroSource(api_key="test", series=("FEDFUNDS",)).fetch_observations()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].series_id, "FEDFUNDS")
        self.assertEqual(rows[0].value, 4.25)

    @patch("whats_new.sources.bls.http_json")
    def test_bls_parses_monthly_series(self, request):
        request.return_value = {
            "status": "REQUEST_SUCCEEDED",
            "Results": {
                "series": [
                    {
                        "seriesID": "LNS14000000",
                        "data": [
                            {"year": "2026", "period": "M08", "value": "4.1"},
                            {"year": "2025", "period": "M13", "value": "4.0"},
                        ],
                    }
                ]
            },
        }
        rows = BlsMacroSource(series=("LNS14000000",)).fetch_observations()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].unit, "percent")
        self.assertEqual(rows[0].period.month, 8)

    @patch("whats_new.sources.eia.http_json")
    def test_eia_parses_inventory_series(self, request):
        request.return_value = {
            "response": {
                "data": [
                    {
                        "period": "2026-09-11",
                        "series": "WCESTUS1",
                        "series-description": "Crude stocks",
                        "value": "414700",
                        "units": "thousand barrels",
                    }
                ]
            }
        }
        rows = EiaMacroSource(api_key="test", series=("WCESTUS1",)).fetch_observations()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].value, 414700.0)
        self.assertEqual(rows[0].frequency, "weekly")

    @patch("whats_new.sources.treasury.http_text")
    def test_treasury_parses_namespaced_xml(self, request):
        request.return_value = """<?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom"
              xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
              xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">
          <entry><content><m:properties>
            <d:NEW_DATE>2026-09-17T00:00:00</d:NEW_DATE>
            <d:BC_2YEAR>3.81</d:BC_2YEAR>
            <d:BC_10YEAR>4.19</d:BC_10YEAR>
            <d:BC_30YEAR>4.84</d:BC_30YEAR>
          </m:properties></content></entry>
        </feed>"""
        rows = TreasuryMacroSource(user_agent="What's New test@example.com").fetch_observations()
        self.assertEqual({row.series_id for row in rows}, {"DGS2", "DGS10", "DGS30"})
        self.assertEqual(next(row.value for row in rows if row.series_id == "DGS10"), 4.19)


class SecSourceTests(unittest.TestCase):
    @patch("whats_new.sources.sec_common.http_json")
    def test_sec_index_resolves_any_published_ticker(self, request):
        request.return_value = {
            "0": {"cik_str": 1234, "ticker": "TEST", "title": "Test Company"}
        }
        company = SecTickerIndex("What's New test@example.com").resolve("test")
        self.assertIsNotNone(company)
        self.assertEqual(company.cik, "0000001234")

    @patch("whats_new.sources.sec_company_facts.http_json")
    def test_company_facts_normalizes_xbrl_concepts(self, request):
        request.return_value = {
            "facts": {
                "us-gaap": {
                    "NetIncomeLoss": {
                        "label": "Net Income (Loss)",
                        "units": {
                            "USD": [
                                {
                                    "end": "2026-06-30",
                                    "val": 125000000,
                                    "form": "10-Q",
                                    "filed": "2026-08-01",
                                    "fy": 2026,
                                    "fp": "Q2",
                                    "accn": "0000001234-26-000001",
                                }
                            ]
                        },
                    }
                }
            }
        }
        source = SecCompanyFactsSource(
            user_agent="What's New test@example.com",
            tickers=["TEST"],
            request_interval=0,
        )
        source.index.resolve_many = lambda tickers: [SecCompany("TEST", "0000001234", "Test Company")]
        rows = source.fetch_facts()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].metric, "net_income")
        self.assertEqual(rows[0].ticker, "TEST")
        self.assertIn("000000123426000001", rows[0].source_url)

    @patch("whats_new.sources.sec_company_facts.http_json")
    def test_company_facts_supports_ifrs_foreign_issuers(self, request):
        request.return_value = {
            "facts": {
                "ifrs-full": {
                    "Revenue": {
                        "label": "Revenue",
                        "units": {
                            "CAD": [
                                {
                                    "end": "2025-12-31",
                                    "val": 42000000,
                                    "form": "40-F",
                                    "filed": "2026-03-01",
                                    "fy": 2025,
                                    "fp": "FY",
                                    "accn": "0000001234-26-000002",
                                }
                            ]
                        },
                    }
                }
            }
        }
        source = SecCompanyFactsSource(
            user_agent="What's New test@example.com",
            tickers=["TEST"],
            request_interval=0,
        )
        source.index.resolve_many = lambda tickers: [SecCompany("TEST", "0000001234", "Test Company")]
        rows = source.fetch_facts()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].metric, "revenue")
        self.assertEqual(rows[0].unit, "CAD")
        self.assertEqual(rows[0].raw["_taxonomy"], "ifrs-full")


class MacroJobTests(unittest.TestCase):
    def test_macro_job_dry_run_never_requires_database(self):
        from whats_new.jobs.macro_data import run

        class StubSource:
            name = "stub"

            def fetch_observations(self, *, since=None, limit=100):
                return [
                    MacroObservation(
                        source="Test",
                        series_id="TEST1",
                        series_name="Test series",
                        period=datetime(2026, 9, 1, tzinfo=timezone.utc),
                        value=1.5,
                        unit="percent",
                        frequency="monthly",
                        source_url="https://example.invalid",
                    )
                ]

        with patch("whats_new.sources.build_macro_sources", return_value=[StubSource()]):
            result = run({"dry_run": True})
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["rows_in"], 1)
        self.assertEqual(result["rows_out"], 0)
        self.assertEqual(result["observations"][0]["series_id"], "TEST1")


if __name__ == "__main__":
    unittest.main()

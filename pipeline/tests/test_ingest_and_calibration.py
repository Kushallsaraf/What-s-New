"""Tests for calibration helpers and ingest heuristics (stdlib)."""

from __future__ import annotations

import unittest

from whats_new.ingest.score import score_article
from whats_new.metrics import calibration_buckets
from whats_new.sources.base import RawArticle
from whats_new.universe import TICKERS, get_stock


class CalibrationTests(unittest.TestCase):
    def test_calibration_buckets(self) -> None:
        stated = [0.4, 0.55, 0.75, 0.85, 0.95]
        hits = [False, True, True, True, False]
        rows = calibration_buckets(stated, hits)
        self.assertEqual(len(rows), 5)
        high = next(r for r in rows if r["bucket_low"] == 0.8)
        self.assertEqual(high["n"], 1)
        self.assertEqual(high["hit_rate"], 1.0)


class UniverseTests(unittest.TestCase):
    def test_universe_size(self) -> None:
        self.assertGreaterEqual(len(TICKERS), 100)
        self.assertIsNotNone(get_stock("NVDA"))
        self.assertIsNotNone(get_stock("SPY"))


class ScoreTests(unittest.TestCase):
    def test_sec_filing_scores_higher(self) -> None:
        plain = RawArticle(title="Market opens quietly", source="RSS", tickers=[])
        filing = RawArticle(
            title="NVIDIA files Form 8-K: earnings",
            source="SEC EDGAR",
            tickers=["NVDA"],
        )
        self.assertGreater(score_article(filing), score_article(plain))


if __name__ == "__main__":
    unittest.main()

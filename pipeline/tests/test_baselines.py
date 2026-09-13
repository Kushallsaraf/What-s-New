import unittest

from whats_new.baselines import drift, last_value, moving_average
from whats_new.benchmark import run_benchmark
from whats_new.metrics import FoldResult, assess_candidate, score_forecast


class BaselineTests(unittest.TestCase):
    def test_last_value(self) -> None:
        self.assertEqual(last_value([1.0, 2.0, 3.0], 2), [3.0, 3.0])

    def test_drift(self) -> None:
        self.assertEqual(drift([1.0, 2.0, 3.0], 2), [4.0, 5.0])

    def test_moving_average(self) -> None:
        self.assertEqual(moving_average([1.0, 2.0, 3.0], 1, window=2), [2.5])

    def test_metrics(self) -> None:
        mae, rmse, direction = score_forecast([11.0, 12.0], [11.0, 12.0], 10.0)
        self.assertEqual(mae, 0.0)
        self.assertEqual(rmse, 0.0)
        self.assertEqual(direction, 1.0)

    def test_rolling_benchmark(self) -> None:
        rows = [
            {
                "timestamp": f"2026-01-{index + 1:02d}",
                "open": float(index),
                "high": float(index + 1),
                "low": float(index - 1),
                "close": float(index),
            }
            for index in range(20)
        ]
        results = run_benchmark(rows, [1, 2], lookback=5, maximum_folds=3)
        self.assertEqual(len(results), 18)

    def test_candidate_requires_repeated_wins(self) -> None:
        results = []
        for horizon in (1, 5):
            for fold in (1, 2, 3):
                results.extend(
                    [
                        FoldResult("last_value", horizon, fold, 1.0, 1.0, 0.5),
                        FoldResult("drift", horizon, fold, 1.1, 1.1, 0.5),
                        FoldResult("moving_average", horizon, fold, 1.2, 1.2, 0.5),
                        FoldResult("kronos-mini", horizon, fold, 0.9, 0.9, 0.6),
                    ]
                )
        assessment = assess_candidate(results, "kronos-mini")
        self.assertTrue(assessment["retained"])


if __name__ == "__main__":
    unittest.main()

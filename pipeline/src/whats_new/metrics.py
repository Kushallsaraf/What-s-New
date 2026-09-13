"""Transparent forecasting metrics and the Kronos retention rule."""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class FoldResult:
    model: str
    horizon: int
    fold: int
    mae: float
    rmse: float
    directional_accuracy: float


def score_forecast(
    actual: Sequence[float], predicted: Sequence[float], last_observed: float
) -> tuple[float, float, float]:
    if len(actual) != len(predicted) or not actual:
        raise ValueError("actual and predicted must be non-empty and equally sized")

    errors = [float(forecast) - float(observation) for observation, forecast in zip(actual, predicted)]
    mae = sum(abs(error) for error in errors) / len(errors)
    rmse = math.sqrt(sum(error * error for error in errors) / len(errors))

    correct = 0
    anchor = float(last_observed)
    for observation, forecast in zip(actual, predicted):
        actual_direction = _sign(float(observation) - anchor)
        predicted_direction = _sign(float(forecast) - anchor)
        correct += actual_direction == predicted_direction
        anchor = float(observation)

    return mae, rmse, correct / len(actual)


def summarize(results: Iterable[FoldResult]) -> dict[str, dict[str, float]]:
    grouped: dict[str, list[FoldResult]] = defaultdict(list)
    for result in results:
        grouped[result.model].append(result)

    return {
        model: {
            "folds": float(len(items)),
            "mae": _mean(item.mae for item in items),
            "rmse": _mean(item.rmse for item in items),
            "directional_accuracy": _mean(item.directional_accuracy for item in items),
        }
        for model, items in grouped.items()
    }


def assess_candidate(
    results: Sequence[FoldResult],
    candidate: str,
    minimum_error_improvement: float = 0.02,
    minimum_win_rate: float = 0.60,
) -> dict[str, object]:
    """Retain a model only when improvements repeat across folds and horizons."""
    candidate_rows = [row for row in results if row.model == candidate]
    baseline_names = {"last_value", "drift", "moving_average"}
    baselines = [row for row in results if row.model in baseline_names]

    wins = 0
    comparisons = 0
    horizons_passed: set[int] = set()
    detail: list[dict[str, object]] = []

    for row in candidate_rows:
        matching = [
            baseline
            for baseline in baselines
            if baseline.fold == row.fold and baseline.horizon == row.horizon
        ]
        if not matching:
            continue
        best = min(matching, key=lambda item: (item.rmse + item.mae) / 2)
        mae_gain = (best.mae - row.mae) / best.mae if best.mae else 0.0
        rmse_gain = (best.rmse - row.rmse) / best.rmse if best.rmse else 0.0
        direction_ok = row.directional_accuracy >= best.directional_accuracy
        passed = (
            mae_gain >= minimum_error_improvement
            and rmse_gain >= minimum_error_improvement
            and direction_ok
        )
        comparisons += 1
        if passed:
            wins += 1
            horizons_passed.add(row.horizon)
        detail.append(
            {
                "fold": row.fold,
                "horizon": row.horizon,
                "baseline": best.model,
                "mae_improvement": round(mae_gain, 6),
                "rmse_improvement": round(rmse_gain, 6),
                "direction_not_worse": direction_ok,
                "passed": passed,
            }
        )

    win_rate = wins / comparisons if comparisons else 0.0
    retained = comparisons >= 3 and win_rate >= minimum_win_rate and len(horizons_passed) >= 2
    return {
        "candidate": candidate,
        "retained": retained,
        "rule": {
            "minimum_error_improvement": minimum_error_improvement,
            "minimum_fold_win_rate": minimum_win_rate,
            "minimum_distinct_horizons": 2,
            "minimum_comparisons": 3,
        },
        "comparisons": comparisons,
        "wins": wins,
        "win_rate": round(win_rate, 6),
        "horizons_passed": sorted(horizons_passed),
        "detail": detail,
    }


def result_to_dict(result: FoldResult) -> dict[str, object]:
    return asdict(result)


def _mean(values: Iterable[float]) -> float:
    items = list(values)
    return sum(items) / len(items) if items else 0.0


def _sign(value: float) -> int:
    return 1 if value > 0 else -1 if value < 0 else 0

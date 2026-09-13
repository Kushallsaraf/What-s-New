"""Rolling-origin benchmark for baselines and optional zero-shot Kronos models."""

from __future__ import annotations

import argparse
import csv
import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from whats_new.baselines import drift, last_value, moving_average
from whats_new.metrics import FoldResult, assess_candidate, result_to_dict, score_forecast, summarize


def load_ohlcv(path: Path) -> list[dict[str, Any]]:
    with path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    required = {"timestamp", "open", "high", "low", "close"}
    missing = required - set(rows[0] if rows else [])
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")

    numeric = {"open", "high", "low", "close", "volume", "amount"}
    normalized: list[dict[str, Any]] = []
    for row in rows:
        normalized.append(
            {
                key: float(value) if key in numeric and value not in (None, "") else value
                for key, value in row.items()
            }
        )
    return sorted(normalized, key=lambda row: str(row["timestamp"]))


def run_benchmark(
    rows: list[dict[str, Any]],
    horizons: list[int],
    lookback: int,
    maximum_folds: int,
    candidate_predictors: dict[str, Callable[[list[dict[str, Any]], list[dict[str, Any]]], list[float]]] | None = None,
) -> list[FoldResult]:
    if len(rows) < lookback + max(horizons):
        raise ValueError("not enough rows for the requested lookback and horizons")

    predictors = {
        "last_value": lambda values, horizon: last_value(values, horizon),
        "drift": lambda values, horizon: drift(values, horizon),
        "moving_average": lambda values, horizon: moving_average(values, horizon),
    }
    candidates = candidate_predictors or {}
    results: list[FoldResult] = []

    for horizon in horizons:
        final_origin = len(rows) - horizon
        origins = list(range(lookback, final_origin + 1))[-maximum_folds:]
        for fold, origin in enumerate(origins, start=1):
            history = rows[origin - lookback : origin]
            future = rows[origin : origin + horizon]
            closes = [float(row["close"]) for row in history]
            actual = [float(row["close"]) for row in future]

            for name, predictor in predictors.items():
                predicted = predictor(closes, horizon)
                mae, rmse, direction = score_forecast(actual, predicted, closes[-1])
                results.append(FoldResult(name, horizon, fold, mae, rmse, direction))

            for name, predictor in candidates.items():
                predicted = predictor(history, future)
                mae, rmse, direction = score_forecast(actual, predicted, closes[-1])
                results.append(FoldResult(name, horizon, fold, mae, rmse, direction))

    return results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Evaluate zero-shot forecasts; baselines run without third-party packages."
    )
    parser.add_argument("--input", required=True, type=Path, help="CSV with timestamp and OHLC columns")
    parser.add_argument("--output", type=Path, default=Path("benchmark-results.json"))
    parser.add_argument("--horizons", default="1,5", help="Comma-separated forecast horizons")
    parser.add_argument("--lookback", type=int, default=64)
    parser.add_argument("--folds", type=int, default=12)
    parser.add_argument(
        "--models",
        default="baselines",
        help="baselines, kronos-mini, kronos-small (comma-separated)",
    )
    parser.add_argument("--kronos-repo", type=Path)
    parser.add_argument("--device", default="cpu")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    selected = {item.strip() for item in args.models.split(",") if item.strip()}
    candidates: dict[str, Callable[..., list[float]]] = {}

    kronos_variants = selected & {"kronos-mini", "kronos-small"}
    if kronos_variants:
        if args.kronos_repo is None:
            raise SystemExit("--kronos-repo is required when a Kronos model is selected")
        from whats_new.kronos_adapter import KronosAdapter

        for variant in sorted(kronos_variants):
            adapter = KronosAdapter(variant, args.kronos_repo, device=args.device)
            candidates[variant] = adapter.predict

    rows = load_ohlcv(args.input)
    horizons = [int(value) for value in args.horizons.split(",")]
    results = run_benchmark(rows, horizons, args.lookback, args.folds, candidates)
    report = {
        "input": str(args.input),
        "policy": "zero-shot-only; no fine-tuning",
        "summary": summarize(results),
        "retention": {
            candidate: assess_candidate(results, candidate) for candidate in sorted(candidates)
        },
        "folds": [result_to_dict(result) for result in results],
    }
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    if candidates:
        print(json.dumps(report["retention"], indent=2))


if __name__ == "__main__":
    main()

"""Job runner: python -m whats_new.jobs run <name>"""

from __future__ import annotations

import argparse
import sys
from typing import Any, Callable

JobFn = Callable[[dict[str, Any]], dict[str, Any]]

REGISTRY: dict[str, JobFn] = {}


def job(name: str) -> Callable[[JobFn], JobFn]:
    def decorator(fn: JobFn) -> JobFn:
        REGISTRY[name] = fn
        return fn

    return decorator


def run_job(name: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    # Import side effects register jobs.
    from whats_new.jobs import (  # noqa: F401
        kronos_predict,
        market_data,
        news_ingest,
        report,
        resolve_outcomes,
        signals_refresh,
    )

    if name not in REGISTRY:
        raise KeyError(f"Unknown job: {name}. Known: {sorted(REGISTRY)}")
    from whats_new.ports import get_telemetry

    telemetry = get_telemetry()
    telemetry.info("job_start", job=name)
    try:
        result = REGISTRY[name](payload or {})
        telemetry.info("job_done", job=name, **{k: result.get(k) for k in ("rows_in", "rows_out", "status") if k in result})
        return result
    except Exception as exc:
        telemetry.error("job_failed", exc=exc, job=name)
        raise


def main(argv: list[str] | None = None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass

    parser = argparse.ArgumentParser(prog="whats_new.jobs")
    sub = parser.add_subparsers(dest="cmd")
    run_p = sub.add_parser("run", help="Run a named job")
    run_p.add_argument("name")
    run_p.add_argument("--replay", action="store_true", help="Force WN_REPLAY=1")
    run_p.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the full funnel but write nothing (no database required)",
    )
    run_p.add_argument("--since-hours", type=int, help="Look-back window for source fetches")
    run_p.add_argument("--payload", help="Extra payload as a JSON object")
    sub.add_parser("list", help="List jobs")
    args = parser.parse_args(argv)

    if args.cmd == "list" or args.cmd is None:
        # Ensure registry populated
        from whats_new.jobs import (  # noqa: F401
            kronos_predict,
            market_data,
            news_ingest,
            report,
            resolve_outcomes,
            signals_refresh,
        )

        for name in sorted(REGISTRY):
            print(name)
        return

    if args.cmd == "run":
        if args.replay:
            import os

            os.environ["WN_REPLAY"] = "1"
            from whats_new.config import reset_settings

            reset_settings()
        payload: dict[str, Any] = {}
        if args.payload:
            import json

            payload.update(json.loads(args.payload))
        if args.dry_run:
            payload["dry_run"] = True
        if args.since_hours:
            payload["since_hours"] = args.since_hours

        result = run_job(args.name, payload)
        if args.dry_run:
            import json

            print(json.dumps(result, indent=2, default=str))
        else:
            print(result)
        return

    parser.print_help()


if __name__ == "__main__":
    main()

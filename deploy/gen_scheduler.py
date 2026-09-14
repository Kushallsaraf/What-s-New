#!/usr/bin/env python3
"""Generate or apply Cloud Scheduler jobs from deploy/schedule.toml."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    import tomli as tomllib  # type: ignore


ROOT = Path(__file__).resolve().parents[1]
SCHEDULE = ROOT / "deploy" / "schedule.toml"


def load_schedule() -> dict:
    with SCHEDULE.open("rb") as fh:
        return tomllib.load(fh)


def commands(project: str, region: str, job_prefix: str) -> list[str]:
    data = load_schedule()
    tz = data.get("timezone", "America/New_York")
    lines: list[str] = []
    for entry in data.get("job", []):
        name = entry["name"]
        cron = entry["cron"]
        sched_name = f"{job_prefix}-{name}".replace("_", "-")
        # Cloud Scheduler invokes Cloud Run Jobs via HTTP target placeholder.
        # Replace RUN_JOB_URI after first deploy.
        uri = os.environ.get(
            "SCHEDULER_TARGET_URI",
            f"https://run.googleapis.com/apis/run.googleapis.com/v1/namespaces/{project}/jobs/{name.replace('_', '-')}:run",
        )
        cmd = (
            f"gcloud scheduler jobs create http {sched_name} "
            f"--project={project} --location={region} "
            f"--schedule='{cron}' --time-zone='{tz}' "
            f"--uri='{uri}' --http-method=POST "
            f"--oauth-service-account-email=scheduler@{project}.iam.gserviceaccount.com "
            f"--attempt-deadline={entry.get('timeout_seconds', 900)}s"
        )
        lines.append(cmd)
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--print", action="store_true", dest="do_print", help="Print gcloud commands")
    parser.add_argument("--apply", action="store_true", help="Execute gcloud commands")
    parser.add_argument("--project", default=os.environ.get("GCP_PROJECT", ""))
    parser.add_argument("--region", default=os.environ.get("CLOUD_RUN_REGION", "us-central1"))
    parser.add_argument("--prefix", default="wn")
    args = parser.parse_args()
    if not args.project:
        print("Set --project or GCP_PROJECT", file=sys.stderr)
        sys.exit(1)
    cmds = commands(args.project, args.region, args.prefix)
    if args.do_print or not args.apply:
        for c in cmds:
            print(c)
    if args.apply:
        for c in cmds:
            print(f"+ {c}")
            subprocess.run(c, shell=True, check=False)


if __name__ == "__main__":
    main()

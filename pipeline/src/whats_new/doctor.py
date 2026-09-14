"""Print capability adapter status for local and cloud ports."""

from __future__ import annotations

import json
import sys


def main(argv: list[str] | None = None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    as_json = "--json" in argv
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass

    from whats_new.config import get_settings
    from whats_new.ports import capability_status

    settings = get_settings()
    rows = capability_status()
    extra = {
        "llm_provider": settings.llm_provider,
        "news_sources": list(settings.news_sources),
        "alpaca_feed": settings.alpaca_feed,
        "signal_weights": {
            "news": settings.signal_weight_news,
            "kronos": settings.signal_weight_kronos,
            "market": settings.signal_weight_market,
        },
        "database_configured": bool(settings.database_url),
        "replay": settings.replay,
    }
    if as_json:
        print(json.dumps({"capabilities": rows, "config": extra}, indent=2))
        return

    print("What's New — capability doctor\n")
    for row in rows:
        flag = {
            "local-default": "·",
            "ready": "✓",
            "missing-credentials": "!",
            "error": "x",
        }.get(row["status"], "?")
        line = f"  [{flag}] {row['capability']:12} adapter={row['adapter']:14} status={row['status']}"
        print(line)
        if row["detail"]:
            print(f"         {row['detail'][:120]}")
    print("\nConfig")
    print(f"  llm_provider      {extra['llm_provider']}")
    print(f"  news_sources      {','.join(extra['news_sources'])}")
    print(f"  alpaca_feed       {extra['alpaca_feed']}")
    print(f"  signal_weights    {extra['signal_weights']}")
    print(f"  database          {'yes' if extra['database_configured'] else 'no'}")
    print(f"  replay            {extra['replay']}")
    print("\nSee docs/cloud-readiness.md for provisioning steps.")


if __name__ == "__main__":
    main()

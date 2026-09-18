# MVP architecture

## Runtime boundary

```text
News / SEC filings     Official macro sources       Alpaca bars
        │              Treasury/BLS/FRED/EIA             │
        ▼                       ▼                        ▼
 Cloud Run / local jobs  macro_observations   market_data + momentum
        │                       │                        │
        ▼                       └─────────┐              │
 filter → cluster → LLM                  │              │
        │                                ▼              ▼
        ▼                         report context   signal engine ◄── Kronos (weight 0)
     events ──────────────────────────────┴──────────────┘
              │                    │
              ▼                    ▼
         feed_items / reports / alerts
              │
              ▼
         FastAPI (Supabase)
              │
              ▼
     Expo / React Native mobile app
```

The phone renders precomputed results and stores lightweight preferences. It does not download model weights, parse large filing archives, or run forecasting inference.

Cloud capabilities (GCS, Secret Manager, Cloud Tasks, Expo Push, PostHog, Memorystore, etc.) are reached through `whats_new.ports` adapters. Local defaults work without GCP; see [cloud-readiness.md](cloud-readiness.md).

## Product cycles

1. **Morning brief** — once per morning after scheduled source pulls.
2. **Event-driven alerts** — only when importance, confidence, and user relevance thresholds are met.
3. **Periodic watchlist digest** — delivered when tracked assets have meaningful changes.
4. **End-of-day / closing report** — after market close.
5. **Outcome resolution** — nightly, for immutable prediction audit.

## Compact API contracts

- `GET /api/health` reports runtime mode, capability adapters, and whether Kronos weight is non-zero.
- `GET /api/briefings` returns evidence/scenario/risk/confidence briefings.
- `GET /api/assets` returns delayed (or live when provisioned) asset quotes.
- `GET /api/sources` exposes source policy and access class.
- `GET /api/feed` returns ranked feed cards from `feed_items`.

The native client points `EXPO_PUBLIC_RESEARCH_API_URL` at the FastAPI backend.

## Persistence

- Supabase PostgreSQL holds events, predictions, signals, feed cards, and watchlists.
- Device AsyncStorage remains a local cache / offline fallback; authenticated users sync watchlists to the server.
- Jobs are append-oriented with `observed_at` / `as_of` for point-in-time honesty.

## Job entrypoint

All jobs share one command so local and Cloud Run stay identical:

```bash
python -m whats_new.jobs run <name>
```

Official source ingestion is split by data shape:

- `macro_data` normalizes Treasury, BLS, FRED and EIA observations.
- `company_fundamentals` normalizes SEC Company Facts/XBRL data.
- `news_ingest` continues to handle SEC filing events and publisher headlines.

Schedule source of truth: [deploy/schedule.toml](../deploy/schedule.toml).

`news_ingest` also runs without a database, which is how the funnel is
reviewed before Supabase exists:

```bash
python -m whats_new.jobs run news_ingest --dry-run --since-hours 24
```

Fetch, enrich, theme-route, score, cluster and analyse all happen; only
persistence is skipped, so it is the same code path that will write to
Supabase. The result is the feed cards the app would have received. See
[ingest.md](ingest.md).

Jobs print their result to stdout and their structured logs to stderr, so
`run ... > result.json` is safe to parse.

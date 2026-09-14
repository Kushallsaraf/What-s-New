# MVP architecture

## Runtime boundary

```text
News sources (RSS / SEC / Finnhub)     Alpaca bars
              │                              │
              ▼                              ▼
     Cloud Run / local jobs          market_data + momentum
              │                              │
              ▼                              │
     filter → cluster → LLM                  │
              │                              │
              ▼                              ▼
           events ◄──────── signal engine ◄── Kronos (weight 0 until retained)
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

Schedule source of truth: [deploy/schedule.toml](../deploy/schedule.toml).

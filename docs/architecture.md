# MVP architecture

## Runtime boundary

```text
Free official sources
        │
        ▼
Scheduled Python worker ──► validation / provenance / confidence
        │
        ├──► baseline forecasts
        └──► optional Kronos Mini/Small zero-shot evaluation
                          │
                          ▼
                 compact JSON payloads
                          │
                          ▼
               mobile-first TypeScript PWA
```

The phone renders precomputed results and stores lightweight preferences. It does not download model weights, parse large filing archives, or run forecasting inference.

## Product cycles

1. **Morning brief** — once per morning after scheduled source pulls.
2. **Event-driven alerts** — only when a filing, official release, or watchlist event crosses the relevance and evidence thresholds.
3. **Periodic watchlist digest** — delivered when tracked assets have meaningful changes.
4. **End-of-day supplement** — optional and secondary.

## Web contracts

- `GET /api/health` reports the runtime mode and whether Kronos is enabled.
- `GET /api/briefings` demonstrates the evidence/scenario/risk/confidence contract.
- `GET /api/assets` returns clearly delayed demo assets.
- `GET /api/sources` exposes source policy and access class.

For the hosted MVP these endpoints are stateless and Cloudflare-compatible. A later phase can add a small D1/SQLite store for generated briefings, watchlists, and delivery state.

## Persistence

Watchlist and briefing preferences currently use browser local storage. This is deliberate for a zero-cost, single-device validation build. Account sync is deferred until user retention justifies authentication and server storage.

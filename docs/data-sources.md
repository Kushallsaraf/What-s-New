# Data-source policy

## Market data

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| Alpaca Basic (IEX) | OHLCV bars, delayed quotes | Free paper account | Default feed is `iex`. SIP requires Algo Trader Plus (`ALPACA_FEED=sip`). Always label quotes as delayed when using free tier. Historical SIP queries must end ≥15 minutes ago on Basic. |

Market prices are no longer demo-only. The mobile app falls back to bundled delayed snapshots only when the API is unreachable.

## News and events

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| SEC EDGAR | Filings and filing events | No key; identify client with email user-agent | Highest-signal free source. Link every filing. Respect request limits. |
| Publisher RSS | Headlines from selected financial outlets | Free | Narrow allowlist only. Deduplicate aggressively. |
| Finnhub free news | Market headlines for tracked tickers | Free API key | Rate-limit carefully. Treat as secondary to filings. |
| Alpaca news | Benzinga headlines | Often gated on Basic (403) | Optional adapter behind `NewsSource`. Not required for MVP. |

Paid news providers plug in via the same `NewsSource` interface (`WN_NEWS_SOURCES`). Do not rewrite the pipeline to add a vendor.

## Macro / official series (retained)

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| U.S. Treasury | Yield and fiscal series | No key | Keep timestamp and official link |
| BLS | Inflation and labor releases | Limited no-key API | Pull on release cadence, not continuously |
| FRED | Macro series normalization | Free key for API; selected CSV without one | Preserve original-series attribution |
| EIA | Energy inventories and production | Free key | Preserve frequency and units |
| BEA / CFTC | Economic accounts and positioning | Free access subject to limits | Add only when a briefing needs the series |

## London Strategic Edge

Treat London Strategic Edge as an internal research/reference source only unless its owner grants written permission for product redistribution. Do not scrape it into customer-facing briefings by default.

## OpenTerminal

OpenTerminal is an architecture reference and possible adapter source, not a hard runtime dependency. Every endpoint still needs an independent reliability and terms review before production use.

## Freshness and failures

- Every evidence item carries source and observation time.
- A failed pull preserves the last good item but marks it stale.
- Staleness lowers confidence and can suppress an alert.
- Conflicting sources remain visible; they are not averaged into false certainty.
- Source text is summarized and linked rather than reproduced wholesale.
- Raw provider responses are recorded to fixtures for offline replay.

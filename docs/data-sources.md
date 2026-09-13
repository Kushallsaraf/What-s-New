# Free-data policy

## Sources selected for the MVP

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| SEC EDGAR | Filings and filing events | No key | Identify the client, respect SEC request limits, link every filing |
| U.S. Treasury | Yield and fiscal series | No key | Keep timestamp and official link |
| BLS | Inflation and labor releases | Limited no-key API | Pull on release cadence, not continuously |
| FRED | Macro series normalization | Free key for API; selected CSV series can be fetched without one | Preserve the original-series attribution |
| EIA | Energy inventories and production | Free key | Preserve frequency and units |
| BEA / CFTC | Economic accounts and positioning | Free access subject to source limits | Add only when a briefing needs the series |

Market prices require a provider whose terms permit the intended display. Until one is selected, the app uses fixed delayed examples and says so plainly.

## London Strategic Edge

Treat London Strategic Edge as an internal research/reference source only unless its owner grants written permission for product redistribution. Do not scrape it into customer-facing briefings by default. This restriction is encoded in `/api/sources`.

## OpenTerminal

OpenTerminal is an architecture reference and possible adapter source, not a hard runtime dependency. Its use of free endpoints is helpful, but every endpoint still needs an independent reliability and terms review before production use. The official MVP connectors above are safer as the primary path.

## Freshness and failures

- Every evidence item carries source and observation time.
- A failed pull preserves the last good item but marks it stale.
- Staleness lowers confidence and can suppress an alert.
- Conflicting sources remain visible; they are not averaged into false certainty.
- Source text is summarized and linked rather than reproduced wholesale.

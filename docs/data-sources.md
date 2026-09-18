# Data-source policy

## Market data

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| Alpaca Basic (IEX) | OHLCV bars, delayed quotes | Free paper account | Default feed is `iex`. SIP requires Algo Trader Plus (`ALPACA_FEED=sip`). Always label quotes as delayed when using free tier. Historical SIP queries must end ≥15 minutes ago on Basic. |

Market prices are no longer demo-only. The mobile app falls back to bundled delayed snapshots only when the API is unreachable.

## News and events

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| SEC EDGAR | Filings and filing events | No key; identify client with email user-agent | Highest-signal free source. Link every filing. Respect request limits. `data.sec.gov` fails as a host rather than per filer, so the fetcher stops after two failures instead of timing out once per ticker. |
| Publisher RSS | General market, macro and sector headlines | Free, no key | Fixed allowlist in `sources/rss.py`. Deduplicate aggressively. A feed that dies upstream is logged (`rss_feed_failed`), never swallowed. |
| Finnhub free news | Market headlines for tracked tickers | Free API key | Rate-limit carefully. Treat as secondary to filings. |
| Alpaca news | Benzinga headlines | Often gated on Basic (403) | Optional adapter behind `NewsSource`. Not required for MVP. |

Paid news providers plug in via the same `NewsSource` interface (`WN_NEWS_SOURCES`). Do not rewrite the pipeline to add a vendor.

### RSS allowlist

The product is about news that moves a broad market, so the allowlist spans
general business, the macro/policy cycle, and the sectors whose data lands on
a published schedule — not one theme. All free, none require a key, and all
were verified reachable (245 articles on a cold run).

| Band | Feeds |
| --- | --- |
| General market | CNBC Top News, CNBC Markets, Yahoo Finance, MarketWatch Top Stories |
| Macro and policy | Federal Reserve press releases, BLS releases, CNBC Economy |
| Sector cadence | EIA Today in Energy, CNBC Energy, CNBC Health |
| World | BBC World, BBC Business, Guardian World, Al Jazeera, UN News, CNBC World |

The world band only became useful once
[`ingest/themes.py`](../pipeline/src/whats_new/ingest/themes.py) could route an
untickered story to an affected sector. Before that it was fetched, stored and
never analysed — 218 world articles yielded 4 events. See [ingest.md](ingest.md).

Requests carry `SEC_USER_AGENT` as the user agent: the SEC requires a contact
address and the other government feeds expect one.

**Removed:** the Reuters business feed (`feeds.reuters.com`) that used to head
this list. Reuters retired public RSS; the host no longer resolves. It had been
failing silently because the fetch loop swallowed exceptions — which is why
failures are now reported.

## Macro / official series (implemented)

| Source | Use | Cost/access | Product rule |
| --- | --- | --- | --- |
| U.S. Treasury | Yield and fiscal series | No key | Keep timestamp and official link |
| BLS | Inflation and labor releases | Limited no-key API | Pull on release cadence, not continuously |
| FRED | Macro series normalization | Free key for API; selected CSV without one | Preserve original-series attribution |
| EIA | Energy inventories and production | Free key | Preserve frequency and units |
| BEA / CFTC | Economic accounts and positioning | Free access subject to limits | Add only when a briefing needs the series |

`python -m whats_new.jobs run macro_data` now normalizes the implemented rows
into `macro_observations`. The defaults intentionally avoid duplicating Treasury
and BLS series through FRED:

- Treasury: 2-, 10-, and 30-year par yields.
- BLS: CPI, total nonfarm payrolls, and unemployment.
- FRED: effective federal funds rate, real GDP, industrial production, and retail sales.
- EIA: crude inventories, gasoline inventories, crude production, and Lower 48 gas storage.

See [official-data-pipeline.md](official-data-pipeline.md) for identifiers and configuration.

## SEC fundamentals

`company_fundamentals` resolves ticker-to-CIK mappings from the SEC's published
company index, then reads Company Facts/XBRL. It normalizes revenue, net income,
operating income, diluted EPS, assets, liabilities, cash, and operating cash
flow from both US GAAP and IFRS taxonomies while retaining accession, form,
period, unit, filing time, and source URL.

The initial 30-ticker set is a QA/research seed, not a coverage ceiling. Unknown
EDGAR tickers can be supplied through `WN_SEC_TICKERS` or the job payload without
code changes. Canadian coverage is currently limited to Canadian companies with
U.S. listings; TSX-only prices and SEDAR+ filings need a later Canadian provider.

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

# Official-data pipeline

This document is the implementation record and runbook for the free data stack
agreed for the internal MVP. It should be updated whenever a source, series,
schedule, schema, or public-display rule changes.

## What is implemented

| Layer | Source | Adapter | Authentication | Default coverage |
| --- | --- | --- | --- | --- |
| Prices | Alpaca Basic / IEX | `sources/alpaca_bars.py` | Key + secret | Configured U.S.-listed universe |
| Filing events | SEC EDGAR submissions | `sources/sec_edgar.py` | Contact user-agent | Configured 30-ticker seed; dynamic CIK lookup |
| Fundamentals | SEC Company Facts/XBRL | `sources/sec_company_facts.py` | Contact user-agent | Eight normalized US GAAP/IFRS metrics |
| Rates | U.S. Treasury | `sources/treasury.py` | None | 2Y, 10Y, 30Y par yields |
| Inflation/labor | BLS Public Data API | `sources/bls.py` | None at MVP volume | CPI, payrolls, unemployment |
| General macro | FRED | `sources/fred.py` | Free API key | Fed funds, real GDP, industrial production, retail sales |
| Energy | EIA Open Data | `sources/eia.py` | Free API key | Oil/gas inventories and crude production |

Every normalized observation carries its source, provider series identifier,
period, value, unit, frequency, official link, raw provider row, and the time we
observed it. Provider credentials remain backend-only.

## Data flow

```text
official APIs
    │
    ▼
source adapters               parse provider-specific responses
    │
    ▼
MacroObservation/CompanyFact  one normalized contract per data shape
    │
    ▼
scheduled jobs                retry independently; partial failure is explicit
    │
    ├── macro_observations     preserves revisions as separate values
    └── company_facts          upserts the same SEC accession deterministically
             │
             ▼
report context → evidence/scenarios/risks/confidence → API → mobile
```

The phone never calls provider APIs and never receives provider credentials.

## Configuration

Required for the selected internal-MVP sources:

```env
ALPACA_API_KEY=
ALPACA_API_SECRET=
ALPACA_FEED=iex
FRED_API_KEY=
EIA_API_KEY=
SEC_USER_AGENT="What's New monitored-email@example.com"
WN_MACRO_SOURCES=treasury,bls,fred,eia
```

BLS registration is optional. `BLS_API_KEY` is used automatically when present.
Series and the initial SEC research set are configurable without code changes:

```env
FRED_SERIES=FEDFUNDS,GDPC1,INDPRO,RSAFS
BLS_SERIES=CUSR0000SA0,CES0000000001,LNS14000000
EIA_SERIES=WCESTUS1,WGTSTUS1,WCRFPUS2,NW2_EPG0_SWO_R48_BCF
WN_SEC_TICKERS=AAPL,MSFT,...
```

`.env` and `.env.*` are ignored by Git. Only `.env.example` is committed.

## Jobs and schedules

Run a provider-contract check without Supabase:

```bash
cd pipeline
export PYTHONPATH=src
python -m whats_new.jobs run macro_data --dry-run --payload '{"limit":2,"since_days":120}'
python -m whats_new.jobs run company_fundamentals --dry-run --payload '{"tickers":["AAPL"],"limit_per_metric":1}'
```

With `DATABASE_URL` configured, omit `--dry-run` to persist results. The schedule
source of truth is `deploy/schedule.toml`:

- `macro_data`: 07:15, 09:15, 11:15, and 16:15 ET on weekdays. These windows
  catch pre-market context, 08:30 releases, mid-morning energy releases, and
  end-of-day Treasury data without continuous polling.
- `company_fundamentals`: 07:10 and 17:10 ET on weekdays.
- SEC filing-event polling remains part of `news_ingest`.

## Initial research set

The seed is deliberately balanced for QA: eight large and seven smaller U.S.
companies, plus eight large and seven smaller Canadian companies with U.S.
listings. It exercises different filing forms, sectors, liquidity levels, and
company-name patterns. It does not impose a 30-ticker product limit.

Alpaca Basic covers U.S.-listed instruments. A Canadian company is therefore
usable now only through its U.S. ticker. TSX-only pricing and comprehensive
Canadian filings require a later licensed Canadian feed and SEDAR+ integration.

## Failure and integrity rules

- A source failure does not discard successful observations from other sources;
  the job returns `partial` and records the failing source.
- Missing values such as FRED `.` and BLS annual pseudo-period `M13` are skipped.
- Treasury XML namespaces are parsed by local field name, so namespace prefixes
  can change without breaking the adapter.
- The SEC company index replaces the old ten-company hard-coded CIK limit. A
  small fallback map keeps known companies usable when the index host is down.
- SEC fundamentals normalize both `us-gaap` and `ifrs-full` concepts so eligible
  Canadian foreign issuers are not silently excluded.
- SEC calls are throttled below ten requests per second and include the monitored
  contact user-agent.
- Raw provider rows are retained for audit and replay; secrets are never stored
  in raw payloads.
- FRED is supplementary. Treasury and BLS remain canonical for series they own,
  avoiding conflicting duplicates in briefings.

## Verification status

On 2026-09-18 the live dry run authenticated and parsed all four macro sources:
Treasury, BLS, FRED, and EIA. The local environment could not resolve SEC domains
during verification, so SEC parsing is covered by contract tests and must be
rechecked from a network that can resolve `www.sec.gov` and `data.sec.gov`.

Tests live in `pipeline/tests/test_official_sources.py` and cover provider response
parsing, SEC ticker resolution, XBRL normalization, and database-free dry runs.

## Not yet claimed

- This does not provide TSX-wide price coverage or SEDAR+ filings.
- Macro observations are now available to morning/closing report context, but a
  polished no-paid-LLM narrative generator remains separate work.
- Public redistribution rights are not implied. Before a public launch, review
  Alpaca display permissions, FRED series ownership/attribution, and provider
  terms again.

# What's New — market intelligence MVP

Evidence-first market research for iOS and Android. The product answers what happened, which tickers could be affected and why, and what quantitative data suggests — without buy/sell instructions.

## Layout

| Path | Role |
| --- | --- |
| [`mobile/`](mobile/) | Expo / React Native client |
| [`pipeline/`](pipeline/) | FastAPI, ingest jobs, signal engine, Kronos adapter |
| [`supabase/migrations/`](supabase/migrations/) | PostgreSQL schema |
| [`deploy/`](deploy/) | Cloud Run Dockerfiles, schedule, provision scripts |
| [`docs/`](docs/) | Architecture, data sources, model policy, cloud readiness |

## Local bring-up

1. Copy [`.env.example`](.env.example) to `.env` and fill the required Alpaca, FRED and EIA credentials. Finnhub and an LLM remain optional.
2. Apply the SQL files in [`supabase/migrations/`](supabase/migrations/) in filename order in the Supabase SQL editor.
3. Install and run the API:

```bash
cd pipeline
pip install -e ".[api,data,llm]"
PYTHONPATH=src uvicorn whats_new.api.main:app --reload --port 8000
```

4. Run jobs (same entrypoint Cloud Run will use):

```bash
PYTHONPATH=src python -m whats_new.jobs run market_data
PYTHONPATH=src python -m whats_new.jobs run macro_data
PYTHONPATH=src python -m whats_new.jobs run company_fundamentals
PYTHONPATH=src python -m whats_new.jobs run news_ingest
```

5. Start the phone app:

```bash
cd mobile
npm install
EXPO_PUBLIC_RESEARCH_API_URL=http://127.0.0.1:8000 npm start
```

Optional: set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for Auth + synced watchlists.

## Capability doctor

```bash
cd pipeline && PYTHONPATH=src python -m whats_new.doctor
```

Cloud adoption is a per-capability `WN_*` flip — see [docs/cloud-readiness.md](docs/cloud-readiness.md) and [docs/deployment.md](docs/deployment.md).

The implemented free-source contracts, schedules, schemas, verification status,
and current Canadian-coverage boundary are recorded in
[docs/official-data-pipeline.md](docs/official-data-pipeline.md).

## Important limitation

Research software only. Not personalized investment advice. No brokerage or automatic trading.

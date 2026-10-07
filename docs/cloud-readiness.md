# Cloud readiness — capability register

Nothing in GCP / Expo Push / PostHog is required to run the product. Every capability below has a **local default** that works on a laptop plus hosted Supabase. Flip a `WN_*` switch only when its **trigger condition** is met.

Run `python -m whats_new.doctor` (or `whats-new-doctor`) to see active adapters.

---

## secrets

| | |
| --- | --- |
| **What** | Load API keys and DB URLs |
| **Local default** | `WN_SECRETS=env` — reads process environment / `.env` |
| **Target** | Google Secret Manager |
| **Env switch** | `WN_SECRETS=gsm` |
| **Required vars** | `GCP_PROJECT` |
| **Provision** | Enable Secret Manager API; create secrets matching env names; grant Cloud Run SA `secretmanager.secretAccessor` |
| **Cost** | Free tier covers MVP volume |
| **Trigger** | More than one human or Cloud Run service needs the same secrets without baking `.env` into images |

---

## blobs

| | |
| --- | --- |
| **What** | Store fixtures, job outputs, report artifacts |
| **Local default** | `WN_BLOBS=local` — writes under `outputs/` and `fixtures/` |
| **Target** | GCS bucket |
| **Env switch** | `WN_BLOBS=gcs` |
| **Required vars** | `GCP_PROJECT`, `GCS_BUCKET` |
| **Provision** | `gsutil mb gs://$GCS_BUCKET`; grant objectAdmin to runtime SA |
| **Cost** | Pennies/month at MVP scale |
| **Trigger** | Multiple Cloud Run jobs must share artifacts, or local disk is insufficient |

---

## queue

| | |
| --- | --- |
| **What** | Fan out follow-on work (e.g. LLM analyze after ingest) |
| **Local default** | `WN_QUEUE=inline` — runs the job synchronously |
| **Target** | Cloud Tasks (or Pub/Sub) |
| **Env switch** | `WN_QUEUE=cloud-tasks` |
| **Required vars** | `GCP_PROJECT`, `CLOUD_TASKS_QUEUE`, `CLOUD_TASKS_LOCATION`, `JOBS_HANDLER_URL` |
| **Provision** | Create queue; deploy HTTP handler; allow OIDC from Scheduler/Tasks |
| **Cost** | Free tier usually enough |
| **Trigger** | Ingest latency exceeds scheduler window, or LLM fan-out needs retries/backoff |

---

## push

| | |
| --- | --- |
| **What** | Deliver high-importance alerts to devices |
| **Local default** | `WN_PUSH=console` — logs the exact Expo payload |
| **Target** | Expo Push Notifications |
| **Env switch** | `WN_PUSH=expo` |
| **Required vars** | `EXPO_ACCESS_TOKEN` |
| **Provision** | Create Expo access token; collect device push tokens in app; store on user profile |
| **Cost** | Expo free tier for MVP |
| **Trigger** | Real devices need alerts and tokens are collected |

---

## analytics

| | |
| --- | --- |
| **What** | Product analytics (feed opens, card taps) |
| **Local default** | `WN_ANALYTICS=noop` |
| **Target** | PostHog |
| **Env switch** | `WN_ANALYTICS=posthog` |
| **Required vars** | `POSTHOG_API_KEY`, optional `POSTHOG_HOST` |
| **Provision** | Create PostHog project; paste project API key |
| **Cost** | Free tier for early volume |
| **Trigger** | Need retention / funnel data beyond server logs |

---

## telemetry

| | |
| --- | --- |
| **What** | Structured logs and error reporting |
| **Local default** | `WN_TELEMETRY=stdout-json` — Cloud Logging-parseable JSON lines |
| **Target** | Cloud Logging + Sentry |
| **Env switch** | `WN_TELEMETRY=cloud` |
| **Required vars** | `SENTRY_DSN` |
| **Provision** | Create Sentry project; set DSN; Cloud Logging works automatically on Cloud Run |
| **Cost** | Sentry free tier; Cloud Logging within free allotment |
| **Trigger** | Production errors need grouping / alerting |

---

## cache

| | |
| --- | --- |
| **What** | LLM response and short-lived job cache |
| **Local default** | `WN_CACHE=postgres` — `llm_cache` table (in-memory fallback if DB down) |
| **Target** | Memorystore Redis |
| **Env switch** | `WN_CACHE=redis` |
| **Required vars** | `REDIS_URL` |
| **Provision** | Create Memorystore instance; VPC connector for Cloud Run |
| **Cost** | Significant vs Postgres; avoid early |
| **Trigger** | Cache hit rate or DB load proves Postgres insufficient |

---

## forecaster

| | |
| --- | --- |
| **What** | Kronos (or placeholder) quantitative forecasts |
| **Local default** | `WN_FORECASTER=local-cpu` — uses `kronos_adapter` when `KRONOS_REPO` is set |
| **Target** | Cloud Run Job on CPU |
| **Env switch** | `WN_FORECASTER=cloud-run` |
| **Required vars** | `GCP_PROJECT`, `KRONOS_JOB_NAME`, `CLOUD_RUN_REGION` |
| **Provision** | Build `Dockerfile.jobs`; deploy `kronos-prediction` job; wire Scheduler |
| **Cost** | CPU minutes only; GPU only if benchmarked need appears |
| **Trigger** | GCP provisioned **and** retention gate passed for raising signal weight |

---

## mailer

| | |
| --- | --- |
| **What** | Optional email delivery of morning/closing reports |
| **Local default** | `WN_MAILER=console` |
| **Target** | Resend (preferred) or SendGrid |
| **Env switch** | `WN_MAILER=resend` |
| **Required vars** | `RESEND_API_KEY`, `MAIL_FROM` |
| **Provision** | Verify domain; create API key |
| **Cost** | Free tier for low volume |
| **Trigger** | Users opt in to email digests |

---

## LLM provider

| | |
| --- | --- |
| **What** | Structured event analysis and daily reports |
| **Local default** | `WN_LLM_PROVIDER=anthropic` (or `openai`) with `LLM_API_KEY` |
| **Target** | Any OpenAI-compatible or vendor client behind `llm/client.py` |
| **Env switch** | `WN_LLM_PROVIDER` |
| **Trigger** | Cost / quality tradeoff; swap models via `LLM_MODEL_*` |

---

## Market data tier

| | |
| --- | --- |
| **What** | Equity bars and quotes |
| **Local default** | `ALPACA_FEED=iex` (Basic free) |
| **Target** | `ALPACA_FEED=sip` via Algo Trader Plus |
| **Trigger** | Need full-market SIP without 15-minute historical restriction |

---

## News sources

| | |
| --- | --- |
| **What** | Raw articles for the funnel |
| **Local default** | `WN_NEWS_SOURCES=rss,sec_edgar,finnhub` |
| **Target** | Add adapters (`alpaca_news`, paid vendors) without pipeline rewrites |
| **Trigger** | Coverage gaps after measuring recall on important events |

---

## Adoption order (recommended)

1. Cloud Run API + Jobs + Scheduler (`docs/deployment.md`)
2. Secret Manager + GCS
3. Expo Push
4. Sentry
5. PostHog
6. Cloud Tasks (only if needed)
7. Memorystore (only if needed)
8. Kronos Cloud Run Job weight > 0 after retention gate

# Deployment runbook (Cloud Run + Scheduler)

This runbook is written early and executed last. Until then, run FastAPI and jobs locally against hosted Supabase.

## Prerequisites

- `gcloud` CLI installed and authenticated
- Billing-enabled GCP project
- Artifact Registry repository
- Supabase project (already used locally)
- Secrets available (`.env` first; Secret Manager after `WN_SECRETS=gsm`)

## One-time provision

```bash
export GCP_PROJECT=your-project
export CLOUD_RUN_REGION=us-central1
export GCS_BUCKET=whats-new-${GCP_PROJECT}
./deploy/provision.sh
```

`provision.sh` enables required APIs, creates the GCS bucket, Artifact Registry repo, and service accounts. It is idempotent.

## Build and deploy

```bash
# API service
gcloud builds submit --config deploy/cloudbuild.yaml \
  --substitutions=_IMAGE=api,_DOCKERFILE=deploy/Dockerfile.api

gcloud run deploy whats-new-api \
  --image ${CLOUD_RUN_REGION}-docker.pkg.dev/${GCP_PROJECT}/whats-new/api:latest \
  --region ${CLOUD_RUN_REGION} \
  --allow-unauthenticated \
  --set-env-vars WN_SECRETS=env,WN_BLOBS=local,WN_TELEMETRY=stdout-json

# Jobs image (shared by all Cloud Run Jobs)
gcloud builds submit --config deploy/cloudbuild.yaml \
  --substitutions=_IMAGE=jobs,_DOCKERFILE=deploy/Dockerfile.jobs
```

Create jobs (one per entry in `deploy/schedule.toml`):

```bash
gcloud run jobs create news-ingestion \
  --image ${CLOUD_RUN_REGION}-docker.pkg.dev/${GCP_PROJECT}/whats-new/jobs:latest \
  --region ${CLOUD_RUN_REGION} \
  --command python \
  --args=-m,whats_new.jobs,run,news_ingest
# repeat for market_data, kronos_predict, resolve_outcomes, morning_report, closing_report
```

## Scheduler

Generate and apply commands from the single schedule source of truth:

```bash
python deploy/gen_scheduler.py --print
python deploy/gen_scheduler.py --apply   # requires gcloud
```

Timezone for all entries: `America/New_York`.

## Capability flips after deploy

Adopt one switch at a time (see [cloud-readiness.md](cloud-readiness.md)):

1. Point Cloud Run at Secret Manager → `WN_SECRETS=gsm`
2. Shared artifacts → `WN_BLOBS=gcs` + `GCS_BUCKET`
3. Push → `WN_PUSH=expo` + `EXPO_ACCESS_TOKEN`
4. Errors → `WN_TELEMETRY=cloud` + `SENTRY_DSN`
5. Kronos job on schedule → keep `SIGNAL_WEIGHT_KRONOS=0` until retention passes

## Health check

```bash
curl https://YOUR_API_URL/api/health | jq
python -m whats_new.doctor --json
```

## Rollback

- Cloud Run: route traffic to previous revision
- Scheduler: pause the job (`gcloud scheduler jobs pause ...`)
- Capability: set the `WN_*` switch back to its local default and redeploy env

## Cost expectations

Cloud Run scales to zero; jobs run a few minutes per day. Scheduler is ~$0.10/job/month after three free jobs. Expect a few dollars/month at MVP volume if free-tier data sources stay primary.

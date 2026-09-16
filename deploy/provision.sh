#!/usr/bin/env bash
# Idempotent GCP bootstrap for What's New.
set -euo pipefail

: "${GCP_PROJECT:?Set GCP_PROJECT}"
CLOUD_RUN_REGION="${CLOUD_RUN_REGION:-us-central1}"
GCS_BUCKET="${GCS_BUCKET:-whats-new-${GCP_PROJECT}}"
AR_REPO="${AR_REPO:-whats-new}"

echo "Project: ${GCP_PROJECT}"
echo "Region:  ${CLOUD_RUN_REGION}"
echo "Bucket:  ${GCS_BUCKET}"

gcloud config set project "${GCP_PROJECT}"

APIS=(
  run.googleapis.com
  cloudscheduler.googleapis.com
  artifactregistry.googleapis.com
  cloudbuild.googleapis.com
  secretmanager.googleapis.com
  storage.googleapis.com
  cloudtasks.googleapis.com
  logging.googleapis.com
)
for api in "${APIS[@]}"; do
  gcloud services enable "${api}" --project "${GCP_PROJECT}"
done

if ! gcloud artifacts repositories describe "${AR_REPO}" \
  --location="${CLOUD_RUN_REGION}" --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${CLOUD_RUN_REGION}" \
    --project="${GCP_PROJECT}"
fi

if ! gsutil ls -b "gs://${GCS_BUCKET}" >/dev/null 2>&1; then
  gsutil mb -p "${GCP_PROJECT}" -l "${CLOUD_RUN_REGION}" "gs://${GCS_BUCKET}"
fi

# Runtime service account for Cloud Run
SA="whats-new-runtime@${GCP_PROJECT}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${SA}" --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  gcloud iam service-accounts create whats-new-runtime \
    --display-name="What's New Cloud Run runtime" \
    --project="${GCP_PROJECT}"
fi

# Scheduler service account
SCHED_SA="scheduler@${GCP_PROJECT}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "${SCHED_SA}" --project="${GCP_PROJECT}" >/dev/null 2>&1; then
  gcloud iam service-accounts create scheduler \
    --display-name="What's New Scheduler" \
    --project="${GCP_PROJECT}"
fi

echo "Provision complete."
echo "Next: build images (see docs/deployment.md), then python deploy/gen_scheduler.py --print"

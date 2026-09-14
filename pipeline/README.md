# Research & processing pipeline

Stdlib-first package under `src/whats_new/`.

## Quick checks

```bash
cd pipeline
PYTHONPATH=src python3 -m unittest discover -s tests
PYTHONPATH=src python3 -m whats_new.doctor
```

## Optional extras

```bash
pip install -e ".[data,llm,api]"   # ingest + FastAPI
pip install -e ".[kronos]"        # optional Kronos adapter deps
```

## Jobs (local)

```bash
export PYTHONPATH=src
python -m whats_new.jobs list
python -m whats_new.jobs run market_data
python -m whats_new.jobs run news_ingest
python -m whats_new.jobs run kronos_predict
python -m whats_new.jobs run signals_refresh
python -m whats_new.jobs run resolve_outcomes
python -m whats_new.jobs run morning_report
python -m whats_new.jobs run closing_report
```

Use `WN_REPLAY=1` (or `--replay`) to read recorded fixtures instead of live APIs.

## API

```bash
pip install -e ".[api,data,llm]"
uvicorn whats_new.api.main:app --reload --port 8000
```

## Capability ports

Cloud services are behind `whats_new.ports` with local defaults. See [docs/cloud-readiness.md](../docs/cloud-readiness.md) and `python -m whats_new.doctor`.

## Kronos

Still optional. Retention gate in `metrics.assess_candidate` must pass before `SIGNAL_WEIGHT_KRONOS` should rise above 0. See [docs/model-policy.md](../docs/model-policy.md).

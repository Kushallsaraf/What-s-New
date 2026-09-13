# Research pipeline

This directory keeps heavier data pulls and model evaluation away from the phone. The native Expo/React Native client only receives small, precomputed JSON payloads.

## Baseline benchmark (no third-party packages)

```bash
cd pipeline
PYTHONPATH=src python -m unittest discover -s tests
PYTHONPATH=src python -m whats_new.benchmark \
  --input path/to/ohlcv.csv \
  --models baselines \
  --horizons 1,5
```

The CSV must contain `timestamp,open,high,low,close`; `volume` and `amount` are optional.

## Optional Kronos evaluation

Kronos is not part of the default runtime. It is evaluated zero-shot only after the baselines work:

```bash
git clone https://github.com/shiyu-coder/Kronos ../vendor/Kronos
python -m venv .venv
source .venv/bin/activate
pip install -e '.[kronos]'
pip install -r ../vendor/Kronos/requirements.txt

whats-new-benchmark \
  --input path/to/ohlcv.csv \
  --models baselines,kronos-mini,kronos-small \
  --kronos-repo ../vendor/Kronos \
  --horizons 1,5 \
  --device cpu
```

Model files are downloaded from the official `NeoQuasar` Hugging Face repositories. This can take time and disk space, so it should run on a laptop/server job, never on the phone.

The generated report retains a Kronos variant only when it beats the strongest baseline on MAE and RMSE by at least 2%, does not reduce directional accuracy, wins at least 60% of comparable folds, and passes at least two horizons. Failure means it stays disabled. No fine-tuning is included in the MVP.

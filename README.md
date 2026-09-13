# What's New

An evidence-first, mobile-first market-research MVP. It answers “what changed, why might it matter, and what would change the view?” without giving direct buy or sell instructions.

## What works now

- Morning briefing with evidence, scenarios, risks, source links, and confidence
- Event-driven alert preference and periodic watchlist cadence
- Persistent local watchlist with asset search and discovery
- Market overview with a “why is it moving?” evidence map
- Per-asset evidence timeline and freshness labels
- Mobile bottom navigation and installable PWA shell
- Small JSON API contracts for briefings, assets, sources, and health
- Python rolling-origin baseline benchmark
- Optional Kronos Mini/Small zero-shot adapter with an explicit retention gate

All visible prices and market readings are fixed demo data and labeled delayed. The next data milestone is to connect scheduled official-source pulls, then add a display-licensed free price source.

## Run the web app

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Quality checks:

```bash
npm run lint
npm run build
```

## Run the research tests

The baseline suite uses only the Python standard library:

```bash
cd pipeline
PYTHONPATH=src python3 -m unittest discover -s tests
```

See [`pipeline/README.md`](pipeline/README.md) for the optional Kronos evaluation. Kronos never runs on the phone and remains disabled unless Mini or Small repeatedly beats the simple baselines.

## Architecture

The phone is a thin PWA client. Heavy source pulls, document processing, and optional model inference belong in scheduled Python jobs that emit compact, source-linked JSON. This keeps mobile memory use small even if a research worker needs substantially more RAM.

See [`docs/architecture.md`](docs/architecture.md), [`docs/data-sources.md`](docs/data-sources.md), and [`docs/model-policy.md`](docs/model-policy.md).

## Important limitation

This project is research software. It presents evidence and uncertainty and is not personalized investment advice. No execution or brokerage integration is included.

# What's New — native mobile MVP

An evidence-first market-research app for iOS and Android. It answers “what changed, why might it matter, and what would change the view?” without giving direct buy or sell instructions.

## Primary client: React Native

The product now lives in [`mobile/`](mobile/). It is an Expo/React Native app built from the supplied Claude mobile artifacts as the visual source of truth: the same trading-terminal palette, Manrope and IBM Plex Mono typography, research cards, five-tab navigation, watchlist, profile controls, detail views, and Ask AI overlay.

The previous root web app remains as a legacy validation prototype and API-contract reference. It is not the product target.

## What works in the mobile MVP

- Morning briefing with evidence, scenarios, risks, and confidence
- Event-driven in-app research alerts
- Periodic watchlist-update preferences
- Supplementary end-of-day setting, disabled by default
- Persistent on-device watchlist, interests, and alert preferences
- Explore, Markets, Watchlist, Profile, source-linked research detail, and Ask AI flows
- Bundled delayed demo snapshot with an optional compact API endpoint
- Python rolling-origin baseline benchmark
- Optional Kronos Mini/Small zero-shot adapter with an explicit retention gate

All bundled prices and readings are fixed demo data and clearly labeled delayed. The next data milestone is connecting scheduled official-source pulls and a legally displayable free price source.

## Run it on a phone

Requirements: Node.js 22.13+ or 24.3+, npm, and the free Expo Go app.

```bash
cd mobile
npm install
npm start
```

Scan the QR code with Expo Go. The same codebase runs on both iOS and Android.

Optional: set `EXPO_PUBLIC_RESEARCH_API_URL` to the base URL of a compatible API. Without it, the app safely uses the bundled delayed snapshot.

Quality checks:

```bash
cd mobile
npm run typecheck
npx expo-doctor
npx expo export --platform ios
npx expo export --platform android
```

## Research pipeline

The baseline suite uses only the Python standard library:

```bash
cd pipeline
PYTHONPATH=src python3 -m unittest discover -s tests
```

See [`pipeline/README.md`](pipeline/README.md) for the optional Kronos evaluation. Kronos never runs on the phone and remains disabled unless Mini or Small repeatedly beats the simple baselines.

## Architecture

The phone is a thin native client. Heavy source pulls, document processing, and optional model inference belong in scheduled Python jobs that emit compact, source-linked JSON. This keeps mobile memory use small even if a research worker needs substantially more RAM.

See [`docs/architecture.md`](docs/architecture.md), [`docs/data-sources.md`](docs/data-sources.md), and [`docs/model-policy.md`](docs/model-policy.md).

## Important limitation

This project is research software. It presents evidence and uncertainty and is not personalized investment advice. No execution or brokerage integration is included.

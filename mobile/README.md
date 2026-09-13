# What's New mobile client

This is the primary iOS and Android client. It uses Expo SDK 57, React Native, and TypeScript.

## Design source

The supplied Claude artifacts are the visual source of truth. Native components reproduce their:

- `#0A0D12` terminal background and `#6C7BFF` brand accent
- green/red signal language kept separate from the brand color
- Manrope interface type and IBM Plex Mono market values
- five-tab bottom navigation, research cards, filters, watchlist rows, profile controls, detail view, and Ask AI overlay

The product requirements extend that presentation with a source-linked morning brief, scenarios, risks, confidence, delayed-data labels, and an explicit no-buy/sell boundary.

## Run

```bash
npm install
npm start
```

Scan the terminal QR code with the free Expo Go app. You can also run `npm run ios` or `npm run android` when a simulator is installed.

## Data modes

By default the app uses a bundled delayed demo snapshot, so it works without an account, paid API, or backend.

To use a compatible deployment, set:

```bash
EXPO_PUBLIC_RESEARCH_API_URL=https://your-api.example
```

The client requests `/api/assets` and `/api/briefings`, then falls back to the bundled snapshot on any network or validation failure.

## Device boundary

The app stores only lightweight preferences and compact research payloads. Scheduled data ingestion, document parsing, baseline evaluation, and optional Kronos experiments run off-device. Kronos is not shipped in the mobile bundle.

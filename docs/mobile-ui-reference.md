# Mobile UI reference

The canonical visual reference for the Expo client is the Claude artifact:

<https://claude.ai/public/artifacts/5ed3c442-9df0-42f8-bc28-d190f4db2333>

The app uses the artifact's original blue-black surfaces, Manrope/IBM Plex
Mono typography, periwinkle brand accent, green/red direction colors and
amber watchlist/meme accents. Its primary shell is the five-tab mobile layout:
What's New, Markets, Explore, Watchlist and Profile, plus the floating Ask AI
button.

## Data-to-UI mapping

- API `event` feed rows are converted to the reference `NewsCard` shape. The
  highest-scoring affected ticker leads the card; other affected tickers,
  routing themes, risks and time horizon remain visible in the detail view.
- The first breaking event drives the dismissible research-alert banner.
- The header bell opens the morning briefing so the canonical feed hierarchy
  stays intact without removing the MVP briefing feature.
- The Watchlist tab uses the same card component and delayed/free-source quote
  snapshot as What's New and Explore.
- Prediction, sector, outcome and report feed rows remain supported below the
  event cards; the visual restoration does not remove pipeline capabilities.

## Intentional copy differences

The artifact says "updating in real time." The MVP says "updating as sources
refresh" because Alpaca Basic and the official/free sources can be delayed or
periodic. This is a truthfulness correction, not a visual redesign.

The Ask AI overlay is currently a clearly labelled UI placeholder. It does not
invent source-grounded answers while the retrieval and reliability layer is
still under discussion.

## Archived redesign

The later neutral-terminal palette remains in `mobile/src/themes/terminal.ts`
for history only. `mobile/src/theme.ts` deliberately activates the Claude
artifact palette and accents. Do not switch palettes or remove the five-tab
shell without an explicit product decision.

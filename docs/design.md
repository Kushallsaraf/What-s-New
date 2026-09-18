# Mobile design history

The active mobile design is documented in
[`mobile-ui-reference.md`](mobile-ui-reference.md). The Claude artifact is the
visual source of truth.

## Archived neutral-terminal experiment

The neutral-terminal redesign reserved color for bullish/bearish direction,
used square 4/6/10px radii and removed violet/amber accents. It was introduced
after the native MVP without a product request and is no longer active.

Its tokens are kept in `mobile/src/themes/terminal.ts` for history. The active
entry point, `mobile/src/theme.ts`, composes the original Claude palette from
`mobile/src/themes/original.ts` with the artifact's brand and amber accents.

## Rules for current work

1. Match the linked Claude artifact before introducing new visual decisions.
2. Keep Manrope for prose and IBM Plex Mono for ticker/price metadata.
3. Use violet for product chrome, amber for saved/context accents, and green
   or red only for market direction and sentiment.
4. Keep the five-tab navigation and floating Ask AI action.
5. Do not let exact-looking UI imply real-time data when a source is delayed.

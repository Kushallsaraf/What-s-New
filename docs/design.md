# Mobile design system

Scope: the Expo client in [`mobile/`](../mobile/). The web app at the repo
root is on hold and is **not** covered here — see "Two systems" below.

## Why this document exists

There was no design plan. The web app (`d2dc517`) and the mobile app
(`689e884`, "Build native Expo mobile MVP from Claude UI") were built in
separate sessions and ended up with unrelated visual systems:

| | Ground | Accent | Type |
| --- | --- | --- | --- |
| Web (root) | `oklch(0.16 0.025 165)` dark green-teal | `oklch(0.88 0.16 125)` lime | Geist |
| Mobile (before) | `#0A0D12` blue-black | `#6C7BFF` periwinkle violet | Manrope |

Neither was deliberate, and the mobile accent in particular is the default
palette of a generation session rather than a decision anyone made about
this product. This file records the decision that was actually made.

## The direction: neutral terminal

Two rules. Everything else follows from them.

### 1. Colour is reserved for direction

`bull` and `bear` are the only hues in the system. They mean "this
instrument moved up / down" or "the analysis reads bullish / bearish" and
nothing else. Chrome — tabs, eyebrows, section labels, icons, selection
state, buttons — is drawn from the neutral text ramp.

Two consequences worth stating, because both were live bugs before:

- **"High impact" is not bearish.** It previously rendered in `bear` red, so
  a high-impact bullish event was labelled in the down colour. Emphasis now
  comes from brightness and weight.
- **"LIVE" is not bearish.** Same mistake, same fix.

Before this change, the violet accent appeared 14 times and amber 10, against
8 `bull` and 11 `bear`. Chrome was more colourful than the data.

### 2. Hierarchy comes from type and hairlines, not boxes

Borders are hairlines at 7% white, not solid 1px fills. Corners are 4/6/10px,
not 16. Levels are separated by size, weight, case and letterspacing. A
screen should be readable with every border removed.

## Tokens

Defined in [`mobile/src/themes/terminal.ts`](../mobile/src/themes/terminal.ts).

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#0B0C0E` | app ground, neutral not blue |
| `bgElevated` | `#101214` | nav bar, card footers |
| `surface` | `#141619` | cards and panels |
| `surfaceHi` | `#1A1D21` | selected chips, avatars |
| `border` | `rgba(255,255,255,0.07)` | default hairline |
| `borderHi` | `rgba(255,255,255,0.15)` | emphasis hairline, watched state |
| `text` | `#E9EBED` | primary, and every "active" state |
| `textDim` | `#9BA1A8` | body copy, secondary figures |
| `textFaint` | `#6B7178` | labels, metadata, inactive |
| `bull` / `bullDim` | `#3F9E5E` | up only |
| `bear` / `bearDim` | `#C0574F` | down only |
| `flat` / `flatDim` | `#6B7178` | unchanged / neutral chips |

Radius: `sm` 4, `md` 6, `lg` 10.

### Type

Manrope for prose, IBM Plex Mono for every figure, ticker and label that
behaves like data. **Any number a user might compare against another number
carries `tabular`** (`fontVariant: ['tabular-nums']`) so columns align.

Small uppercase labels use mono + ~1.1 letterspacing rather than a colour.

## Rules for new work

1. Reaching for a colour that is not `bull` or `bear`? It should be a
   neutral. If a state needs emphasis, make it brighter or heavier.
2. New number on screen? Mono + `tabular`.
3. New container? Hairline and `radius.md`, not a fresh border weight.
4. No gradients. No emoji in evidence surfaces.
5. Confidence is a figure, not a progress bar. The rule under it is a hairline
   at 2px, deliberately quiet.

## Reverting

Two levels, depending on how much you want back.

**Palette only** — change both re-exports in
[`mobile/src/theme.ts`](../mobile/src/theme.ts) from `./themes/terminal` to
`./themes/original`. The two palettes export an identical token surface, so
nothing else needs touching. This restores the original ground, surfaces,
solid borders, saturated bull/bear and 16px radius.

It does **not** restore the violet and amber accents, the Markets gradient
card or the violet confidence bar — those were removed at the component
level. Their original values are recorded in `legacyAccents` in
[`mobile/src/themes/original.ts`](../mobile/src/themes/original.ts).

**Everything** — `git revert` the "neutral terminal" commit. The redesign is
one self-contained commit for exactly this reason.

## Two systems

The root web app still carries the green/lime system. Mobile is the active
surface, so the divergence is parked rather than resolved. Whoever picks the
web app back up should either port these tokens or consciously decide the two
products look different — but that should be a decision, not a leftover.

## Known issues this did not fix

- **Markets is largely hardcoded.** Global indices, rates, energy and FX are
  module-level literals, and the "What the evidence says" cards carry
  invented confidence figures under a `FACT` badge. Restyling made them
  quieter; it did not make them true.
- **`bps` is applied to non-rate rows.** WTI crude renders "+20 bps", which
  is not a unit that applies to a commodity price.
- **The app knows 14 tickers; the pipeline tracks 146.**

import type { Palette, Radius } from './palette';

/**
 * The palette the mobile MVP shipped with (commit 689e884, "Build native
 * Expo mobile MVP from Claude UI"). Kept so the team can put the original
 * look back without archaeology.
 *
 * To restore it, change the two re-export lines in src/theme.ts to point
 * here. That returns the original ground, surfaces, solid borders,
 * saturated bull/bear and 16px card radius.
 *
 * Note: this restores the PALETTE only. The original also used a violet
 * brand accent (#6C7BFF) and an amber third accent (#F5B54C) throughout the
 * chrome, plus a gradient hero card and a confidence progress bar. Those
 * were removed at the component level, so they do not come back with a
 * palette switch — for a complete revert of the redesign, `git revert` the
 * "neutral terminal" commit instead.
 */
export const colors: Palette = {
  bg: '#0A0D12',
  bgElevated: '#10141B',
  surface: '#151A22',
  surfaceHi: '#1C2330',
  border: '#242C39',
  borderHi: '#323C4D',
  text: '#EDF1F5',
  textDim: '#8792A3',
  textFaint: '#5B6577',
  bull: '#33D690',
  bullDim: '#153327',
  bear: '#FF5A6E',
  bearDim: '#3A1620',
  flat: '#8792A3',
  flatDim: '#1C2330',
  white: '#FFFFFF',
};

/** Accents the original used in chrome. No longer part of the shared
 *  surface — recorded here so the values are not lost. */
export const legacyAccents = {
  brand: '#6C7BFF',
  brandDim: '#3B3F8C',
  amber: '#F5B54C',
  amberDim: '#3A2C10',
} as const;

export const radius: Radius = { sm: 8, md: 12, lg: 16 };

import type { Palette, Radius } from './palette';

/**
 * The palette the mobile MVP shipped with (commit 689e884, "Build native
 * Expo mobile MVP from Claude UI"). Kept so the team can put the original
 * look back without archaeology.
 *
 * This is active again: src/theme.ts composes these surface/direction colors
 * with legacyAccents below so the native app matches the Claude artifact.
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

/** Product-chrome and saved/context accents from the Claude artifact. */
export const legacyAccents = {
  brand: '#6C7BFF',
  brandDim: '#3B3F8C',
  amber: '#F5B54C',
  amberDim: '#3A2C10',
} as const;

export const radius: Radius = { sm: 8, md: 12, lg: 16 };

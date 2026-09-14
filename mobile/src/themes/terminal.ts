import type { Palette, Radius } from './palette';

/**
 * Neutral-terminal palette.
 *
 * Colour is reserved for direction: bull and bear are the only hues, and
 * they are desaturated so a screen full of figures reads calmly. Chrome —
 * tabs, labels, icons, selection state — is neutral, and hierarchy comes
 * from the text ramp and hairline rules rather than from bordered boxes.
 */
export const colors: Palette = {
  bg: '#0B0C0E',
  bgElevated: '#101214',
  surface: '#141619',
  surfaceHi: '#1A1D21',

  border: 'rgba(255, 255, 255, 0.07)',
  borderHi: 'rgba(255, 255, 255, 0.15)',

  text: '#E9EBED',
  textDim: '#9BA1A8',
  textFaint: '#6B7178',

  bull: '#3F9E5E',
  bullDim: 'rgba(63, 158, 94, 0.13)',
  bear: '#C0574F',
  bearDim: 'rgba(192, 87, 79, 0.13)',
  flat: '#6B7178',
  flatDim: 'rgba(255, 255, 255, 0.05)',

  white: '#FFFFFF',
};

/** Terminals do not use pill corners. */
export const radius: Radius = { sm: 4, md: 6, lg: 10 };

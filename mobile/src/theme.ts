import type { TextStyle } from 'react-native';

/**
 * Active design tokens.
 *
 * ── Switching palettes ──────────────────────────────────────────────
 * Change both re-exports below from './themes/terminal' to
 * './themes/original' to put the original MVP look back. The two palettes
 * export an identical token surface, so nothing else needs to change.
 * See docs/design.md for the rules behind the current one.
 */
export { colors, radius } from './themes/terminal';
export type { Palette, Radius } from './themes/palette';

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
} as const;

/** Applied to every figure a user might compare against another figure. */
export const tabular: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

export const hitSlop = { top: 10, right: 10, bottom: 10, left: 10 };

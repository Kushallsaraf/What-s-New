import type { TextStyle } from 'react-native';

import { colors as originalColors, legacyAccents, radius } from './themes/original';

/** The Claude artifact is the visual source of truth for the mobile app. */
export const colors = { ...originalColors, ...legacyAccents } as const;
export { radius };
export type { Palette, Radius } from './themes/palette';

const sectorColors: Record<string, string> = {
  'Mega Cap': '#4285F4',
  Technology: '#29B5E8',
  'Communication Services': '#A78BFA',
  'Consumer Discretionary': '#F5A623',
  'Consumer Staples': '#F5A623',
  Financials: '#5A7EBF',
  Healthcare: '#00857C',
  Energy: '#C8102E',
  Industrials: '#8B95A5',
  Materials: '#B08D57',
  'Real Estate': '#34A853',
  Utilities: '#F59E0B',
  ETF: '#6C7BFF',
  AI: '#29B5E8',
  Markets: '#6C7BFF',
};

export function assetColor(sector: string): string {
  return sectorColors[sector] ?? colors.textFaint;
}

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

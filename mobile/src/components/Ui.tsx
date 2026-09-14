import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';

import { colors, fonts, radius, tabular } from '../theme';
import type { Impact, Sentiment } from '../types';

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerCopy}>
        <Text style={styles.h1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function LiveDot({ label = true }: { label?: boolean }) {
  return (
    <View style={styles.liveWrap}>
      <View style={styles.liveDot} />
      {label ? <Text style={styles.liveText}>LIVE</Text> : null}
    </View>
  );
}

export function Section({ title, children, style }: PropsWithChildren<{ title: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ChangePill({ value, large = false }: { value: number; large?: boolean }) {
  const up = value > 0.04;
  const down = value < -0.04;
  const color = up ? colors.bull : down ? colors.bear : colors.textDim;
  const backgroundColor = up ? colors.bullDim : down ? colors.bearDim : colors.surfaceHi;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  return (
    <View style={[styles.changePill, large && styles.changePillLarge, { backgroundColor }]}>
      <Icon size={large ? 13 : 11} color={color} strokeWidth={2.5} />
      <Text style={[styles.changeText, large && styles.changeTextLarge, { color }]}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
      </Text>
    </View>
  );
}

export function sentimentMeta(sentiment: Sentiment) {
  if (sentiment === 'bullish') return { color: colors.bull, dim: colors.bullDim, label: 'Bullish' };
  if (sentiment === 'bearish') return { color: colors.bear, dim: colors.bearDim, label: 'Bearish' };
  return { color: colors.textDim, dim: colors.surfaceHi, label: 'Neutral' };
}

export function SentimentBadge({ sentiment, compact = false }: { sentiment: Sentiment; compact?: boolean }) {
  const meta = sentimentMeta(sentiment);
  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: meta.dim }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, compact && styles.badgeTextCompact, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

export function ImpactTag({ impact }: { impact: Impact }) {
  const high = impact === 'High';
  return (
    <Text style={[styles.impactText, high && styles.impactTextHigh]}>
      {impact} impact
    </Text>
  );
}

export function StockAvatar({ ticker, color, size = 30 }: { ticker: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: Math.round(size * 0.3), backgroundColor: `${color}22` }]}>
      <Text style={[styles.avatarText, { color, fontSize: size < 30 ? 9 : 11 }]}>{ticker.slice(0, 2)}</Text>
    </View>
  );
}

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        selected && styles.choiceChipSelected,
        pressed && styles.pressed,
      ]}
    >
      {selected ? <Check size={11} color={colors.text} strokeWidth={3} /> : null}
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.toggle, on && styles.toggleOn]}
    >
      <View style={[styles.toggleThumb, on && styles.toggleThumbOn]} />
    </Pressable>
  );
}

export function ConfidenceMeter({ value }: { value: number }) {
  return (
    <View style={styles.confidenceWrap}>
      <View style={styles.confidenceTrack}>
        <View style={[styles.confidenceFill, { width: `${value}%` }]} />
      </View>
      <Text style={styles.confidenceText}>{value}% confidence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCopy: { flex: 1 },
  h1: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 28 },
  subtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12.5, marginTop: 2 },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.textDim },
  liveText: { color: colors.textFaint, fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1.2 },
  section: { marginBottom: 22 },
  sectionTitle: {
    color: colors.textDim,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 3 },
  changePillLarge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md },
  changeText: { fontFamily: fonts.monoSemiBold, fontSize: 10.5 , ...tabular },
  changeTextLarge: { fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.md, paddingHorizontal: 9, paddingVertical: 4 },
  badgeCompact: { paddingHorizontal: 7, paddingVertical: 3 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11.5 },
  badgeTextCompact: { fontSize: 10.5 },
  impactText: { color: colors.textFaint, fontFamily: fonts.semiBold, fontSize: 10.5 },
  impactTextHigh: { color: colors.text, fontFamily: fonts.bold },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.monoBold },
  choiceChip: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  choiceChipSelected: { backgroundColor: colors.surfaceHi, borderColor: colors.borderHi },
  choiceText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 11.5 },
  choiceTextSelected: { color: colors.text },
  pressed: { opacity: 0.72 },
  toggle: { width: 42, height: 24, borderRadius: radius.md, padding: 3, backgroundColor: colors.surfaceHi },
  toggleOn: { backgroundColor: colors.text },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.textDim },
  toggleThumbOn: { backgroundColor: colors.bg, transform: [{ translateX: 18 }] },
  confidenceWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confidenceTrack: { flex: 1, height: 2, backgroundColor: colors.flatDim, overflow: 'hidden' },
  confidenceFill: { height: 2, backgroundColor: colors.textDim },
  confidenceText: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 10.5 , ...tabular },
});

import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';
import type { FeedItem } from '../types';

type Props = { item: FeedItem };

export function PredictionCard({ item }: Props) {
  const p = item.payload;
  const ticker = String(p.ticker || item.tickers[0] || '');
  const direction = String(p.direction || 'neutral');
  const horizon = String(p.horizon || '');
  const quant = Number(p.quant_signal ?? Math.round((item.confidence || 0) * 100));
  const predicted = p.predicted_return != null ? `${(Number(p.predicted_return) * 100).toFixed(1)}%` : null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{ticker} OUTLOOK</Text>
      <Text style={styles.line}>{horizon}: {direction.replace(/_/g, ' ')}</Text>
      {predicted ? <Text style={styles.line}>Predicted return: {predicted}</Text> : null}
      <Text style={styles.line}>Quant signal: {quant}/100</Text>
    </View>
  );
}

export function SectorCard({ item }: Props) {
  const p = item.payload;
  const sector = String(p.sector || 'Sector');
  const sentiment = Number(p.sentiment ?? 50);
  const movers = Array.isArray(p.movers) ? p.movers as Array<{ ticker: string; direction: string; score: number }> : [];

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{sector.toUpperCase()}</Text>
      <Text style={styles.line}>Sentiment {sentiment}</Text>
      <View style={styles.movers}>
        {movers.map((m) => (
          <Text key={m.ticker} style={styles.mover}>
            {m.ticker} {m.direction === 'up' ? '↑' : '↓'}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function OutcomeCard({ item }: Props) {
  const p = item.payload;
  const ticker = String(p.ticker || '');
  const predicted = Number(p.predicted_return || 0);
  const actual = Number(p.actual_return || 0);
  const ok = Boolean(p.direction_correct);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>OUTCOME · {ticker}</Text>
      <Text style={styles.line}>Our signal: {(predicted * 100).toFixed(1)}%</Text>
      <Text style={styles.line}>Actual: {(actual * 100).toFixed(1)}%</Text>
      <Text style={[styles.line, ok ? styles.ok : styles.bad]}>
        {ok ? 'Correct direction ✓' : 'Missed direction'}
      </Text>
    </View>
  );
}

export function ReportFeedCard({ item }: Props) {
  const p = item.payload;
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{String(p.type || 'report').toUpperCase()}</Text>
      <Text style={styles.title}>{String(p.title || 'Report')}</Text>
      <Text style={styles.summary}>{String(p.summary || '')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 6,
  },
  summary: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textDim,
    lineHeight: 18,
  },
  line: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  movers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  mover: { fontFamily: fonts.mono, fontSize: 12, color: colors.textDim },
  ok: { color: colors.bull },
  bad: { color: colors.bear },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { eventPayloadOf, feedEventToNewsItem, timeAgo } from '../feedMap';
import { colors, fonts, hitSlop, radius, tabular } from '../theme';
import type { FeedItem, NewsItem, Sentiment } from '../types';
import { ImpactTag, SentimentBadge } from './Ui';

type Props = {
  item: FeedItem;
  watchlist: string[];
  showMeme?: boolean;
  onOpen: (item: NewsItem) => void;
  onToggleWatch: (ticker: string) => void;
};

function directionColor(direction: Sentiment) {
  if (direction === 'bullish') return colors.bull;
  if (direction === 'bearish') return colors.bear;
  return colors.textDim;
}

function directionTint(direction: Sentiment) {
  if (direction === 'bullish') return colors.bullDim;
  if (direction === 'bearish') return colors.bearDim;
  return colors.surfaceHi;
}

/**
 * One happening, not one headline. An event clusters several articles and
 * carries every ticker the analysis judged affected — each with its own
 * direction and impact score — so the card leads with the event and lists
 * the tickers underneath rather than flattening to a single symbol.
 */
export function EventCard({ item, watchlist, showMeme = false, onOpen, onToggleWatch }: Props) {
  const payload = eventPayloadOf(item);
  if (!payload) return null;

  const detail = feedEventToNewsItem(item);
  const sourceCount = payload.sources.length;
  const breaking = item.section === 'breaking';

  // When a story names no company, the tickers below are liquid sector
  // proxies the pipeline routed to, not instruments the article mentioned.
  // Saying so is the difference between evidence and a suggestion.
  // A card can carry both: a story that names Exxon and also reads as an
  // energy story gets XOM and XLE. Only call the whole set sector exposure
  // when nothing in it was actually named.
  const routed = payload.themes.length > 0;
  const count = payload.tickers.length;
  const allProxies = count > 0 && payload.tickers.every((t) => t.proxy);
  const tickerLabel = allProxies
    ? `Sector exposure${count > 1 ? ` · ${count}` : ''}`
    : `Affected ticker${count === 1 ? '' : `s · ${count}`}`;

  return (
    <View style={[styles.card, breaking && styles.cardBreaking]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open event: ${payload.headline}`}
        onPress={() => detail && onOpen(detail)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.metaRow}>
          <ImpactTag impact={payload.impact} />
          <Text style={styles.metaText}>
            {sourceCount > 0
              ? `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`
              : 'Unsourced'}
            {' · '}
            {timeAgo(item.created_at)}
          </Text>
          {breaking ? <Text style={styles.breakingTag}>BREAKING</Text> : null}
        </View>

        <Text style={styles.headline}>{payload.headline}</Text>
        {payload.summary ? <Text style={styles.summary}>{payload.summary}</Text> : null}

        {showMeme && payload.meme ? <Text style={styles.meme}>😂 {payload.meme}</Text> : null}
      </Pressable>

      <View style={styles.tickerSection}>
        <Text style={styles.tickerLabel}>{tickerLabel}</Text>
        {routed ? (
          <Text style={styles.themeRow} numberOfLines={1}>
            {payload.themes.map((t) => t.label).join(' · ')}
          </Text>
        ) : null}
        <View style={styles.tickerRow}>
          {payload.tickers.map((entry) => {
            const watching = watchlist.includes(entry.ticker);
            return (
              <Pressable
                key={entry.ticker}
                accessibilityRole="button"
                accessibilityLabel={`${watching ? 'Remove' : 'Add'} ${entry.ticker} ${watching ? 'from' : 'to'} watchlist`}
                hitSlop={hitSlop}
                onPress={() => onToggleWatch(entry.ticker)}
                style={({ pressed }) => [
                  styles.tickerChip,
                  { backgroundColor: directionTint(entry.direction) },
                  watching && styles.tickerChipWatched,
                  pressed && styles.pressed,
                ]}
              >
                {watching ? <Star size={10} color={colors.text} fill={colors.text} /> : null}
                <Text
                  style={[
                    entry.proxy ? styles.tickerTextProxy : styles.tickerText,
                    { color: directionColor(entry.direction) },
                  ]}
                >
                  {entry.ticker}
                </Text>
                {entry.score > 0 ? <Text style={styles.tickerScore}>{entry.score}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <SentimentBadge sentiment={payload.sentiment} compact />
        <Text style={styles.footerText}>{payload.confidence}% confidence</Text>
        {payload.time_horizon ? (
          <Text style={styles.footerHorizon} numberOfLines={1}>
            {payload.time_horizon}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardBreaking: { borderColor: colors.borderHi },
  body: { padding: 16, paddingBottom: 12 },
  pressed: { opacity: 0.78 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 9 },
  metaText: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 11 , ...tabular },
  breakingTag: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  headline: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21.5 },
  summary: {
    color: colors.textDim,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 18.5,
    marginTop: 7,
  },
  meme: {
    color: colors.textFaint,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    fontStyle: 'italic',
    marginTop: 9,
  },
  tickerSection: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  tickerLabel: {
    color: colors.textFaint,
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  themeRow: {
    color: colors.textFaint,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: -3,
  },
  tickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tickerChip: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  tickerChipWatched: { borderColor: colors.borderHi },
  tickerText: { fontFamily: fonts.monoBold, fontSize: 12 },
  // A proxy is set in regular weight, so a named company reads as the
  // stronger claim without spending a colour on the distinction.
  tickerTextProxy: { fontFamily: fonts.mono, fontSize: 12 },
  tickerScore: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 11 , ...tabular },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerText: { color: colors.textDim, fontFamily: fonts.monoSemiBold, fontSize: 11 , ...tabular },
  footerHorizon: {
    color: colors.textFaint,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { colors, fonts, hitSlop, tabular } from '../theme';
import type { NewsItem, Quote } from '../types';
import { ChangePill, ImpactTag, LiveDot, SentimentBadge, StockAvatar, sentimentMeta } from './Ui';

type Props = {
  item: NewsItem;
  quote?: Quote;
  watching: boolean;
  onOpen: (item: NewsItem) => void;
  onToggleWatch: (ticker: string) => void;
  showMeme?: boolean;
};

/** Native rendering of the Claude reference's canonical research card. */
export function NewsCard({ item, quote, watching, onOpen, onToggleWatch, showMeme = true }: Props) {
  const sentiment = sentimentMeta(item.sentiment);

  return (
    <View style={[styles.card, { borderLeftColor: sentiment.color }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open research alert for ${item.name}`}
        onPress={() => onOpen(item)}
        style={({ pressed }) => [styles.cardBody, pressed && styles.pressed]}
      >
        <View style={styles.topRow}>
          <View style={styles.identityRow}>
            <StockAvatar ticker={item.ticker} sector={item.sector} />
            <View style={styles.identityCopy}>
              <Text style={styles.company} numberOfLines={1}>{item.name}</Text>
              <View style={styles.metadataRow}>
                <Text style={styles.metadata} numberOfLines={1}>${item.ticker} · {item.source} · {item.time}</Text>
                {item.live ? <LiveDot /> : null}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.summary}>{item.summary}</Text>

        {showMeme && item.meme ? (
          <View style={styles.memeBox}>
            <Text style={styles.meme}>😂 {item.meme}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.signalRow}>
            <SentimentBadge sentiment={item.sentiment} compact />
            <ImpactTag impact={item.impact} />
          </View>
          {quote ? (
            <View style={styles.quoteRow}>
              <Text style={styles.price}>${quote.price.toFixed(2)}</Text>
              <ChangePill value={quote.change} />
            </View>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={watching ? `Remove ${item.ticker} from watchlist` : `Add ${item.ticker} to watchlist`}
        hitSlop={hitSlop}
        onPress={() => onToggleWatch(item.ticker)}
        style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
      >
        <Star size={17} color={watching ? colors.amber : colors.textFaint} fill={watching ? colors.amber : 'transparent'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardBody: { padding: 16 },
  pressed: { opacity: 0.78 },
  topRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  identityRow: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8, paddingRight: 24 },
  identityCopy: { flex: 1 },
  company: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  metadataRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 1 },
  metadata: { color: colors.textFaint, flexShrink: 1, fontFamily: fonts.mono, fontSize: 9.7, ...tabular },
  starButton: { padding: 4, position: 'absolute', right: 12, top: 12, zIndex: 2 },
  headline: { color: colors.text, fontFamily: fonts.bold, fontSize: 15.5, lineHeight: 21, marginBottom: 8, marginTop: 10 },
  summary: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19.5, marginBottom: 12 },
  memeBox: { backgroundColor: colors.amberDim, borderRadius: 10, marginBottom: 12, paddingHorizontal: 10, paddingVertical: 6 },
  meme: { color: colors.amber, fontFamily: fonts.regular, fontSize: 11.5, fontStyle: 'italic' },
  footer: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  signalRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  quoteRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  price: { color: colors.text, fontFamily: fonts.monoSemiBold, fontSize: 12.5, ...tabular },
});

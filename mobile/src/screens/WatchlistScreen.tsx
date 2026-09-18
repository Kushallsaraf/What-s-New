import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StarOff } from 'lucide-react-native';

import { NewsCard } from '../components/NewsCard';
import { ChangePill, ScreenHeader } from '../components/Ui';
import { stocks } from '../data';
import { colors, fonts, hitSlop, tabular } from '../theme';
import type { NewsItem, Quote } from '../types';

export function WatchlistScreen({ watchlist, quotes, news, onToggleWatch, onOpen }: {
  watchlist: string[];
  quotes: Record<string, Quote>;
  news: NewsItem[];
  onToggleWatch: (ticker: string) => void;
  onOpen: (item: NewsItem) => void;
}) {
  const developments = news.filter((item) => watchlist.includes(item.ticker));
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Watchlist" subtitle="Periodic updates · free-source refresh cadence" />
      <View style={styles.watchlistRows}>
        {watchlist.map((ticker) => {
          const stock = stocks.find((item) => item.ticker === ticker);
          const quote = quotes[ticker];
          if (!stock || !quote) return null;
          return (
            <View key={ticker} style={styles.watchRow}>
              <View style={styles.watchCopy}><Text style={styles.watchTicker}>${ticker}</Text><Text style={styles.watchName} numberOfLines={1}>{stock.name}</Text></View>
              <View style={styles.watchQuote}>
                <View style={styles.watchPriceBlock}><Text style={styles.watchPrice}>${quote.price.toFixed(2)}</Text><ChangePill value={quote.change} large /></View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${ticker} from watchlist`} hitSlop={hitSlop} onPress={() => onToggleWatch(ticker)} style={({ pressed }) => pressed && styles.pressed}><StarOff size={16} color={colors.textFaint} /></Pressable>
              </View>
            </View>
          );
        })}
        {!watchlist.length ? <Text style={styles.empty}>Star anything in What's New or Explore to add it here.</Text> : null}
      </View>
      <Text style={styles.sectionTitle}>Latest developments</Text>
      {developments.length ? developments.map((item) => (
        <NewsCard key={item.id} item={item} quote={quotes[item.ticker]} watching onOpen={onOpen} onToggleWatch={onToggleWatch} />
      )) : <Text style={styles.empty}>No research updates yet for your watchlist.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 112, paddingHorizontal: 16, paddingTop: 14 }, watchlistRows: { gap: 8, marginBottom: 24, marginTop: 14 }, watchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 }, watchCopy: { flex: 1 }, watchTicker: { color: colors.text, fontFamily: fonts.monoSemiBold, fontSize: 14 }, watchName: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 2 }, watchQuote: { alignItems: 'center', flexDirection: 'row', gap: 12 }, watchPriceBlock: { alignItems: 'flex-end', gap: 4 }, watchPrice: { color: colors.text, fontFamily: fonts.mono, fontSize: 13, ...tabular }, sectionTitle: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' }, empty: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, padding: 30, textAlign: 'center' }, pressed: { opacity: 0.72 },
});

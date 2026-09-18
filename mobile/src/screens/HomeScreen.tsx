import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, X } from 'lucide-react-native';

import { NewsCard } from '../components/NewsCard';
import { OutcomeCard, PredictionCard, ReportFeedCard, SectorCard } from '../components/FeedCards';
import { ChoiceChip, LiveDot, ScreenHeader } from '../components/Ui';
import { feedEventToNewsItem } from '../feedMap';
import { colors, fonts, hitSlop } from '../theme';
import type { FeedItem, NewsItem, Quote, Sentiment } from '../types';

type Props = {
  feedItems: FeedItem[];
  quiet?: boolean;
  quietMessage?: string | null;
  quotes: Record<string, Quote>;
  watchlist: string[];
  preferences: string[];
  showMemes: boolean;
  onOpen: (item: NewsItem) => void;
  onOpenBriefing: () => void;
  onToggleWatch: (ticker: string) => void;
};

const filters: Array<'all' | Sentiment> = ['all', 'bullish', 'bearish', 'neutral'];
const aiTickers = new Set(['NVDA', 'AVGO', 'MSFT', 'GOOGL', 'AMZN', 'META']);

function matchesInterest(item: NewsItem, interest: string): boolean {
  if (interest === 'AI') return aiTickers.has(item.ticker);
  return item.sector === interest;
}

export function HomeScreen({
  feedItems,
  quiet,
  quietMessage,
  quotes,
  watchlist,
  preferences,
  showMemes,
  onOpen,
  onOpenBriefing,
  onToggleWatch,
}: Props) {
  const [filter, setFilter] = useState<'all' | Sentiment>('all');
  const [showAlert, setShowAlert] = useState(true);

  const news = useMemo(
    () => feedItems.map(feedEventToNewsItem).filter((item): item is NewsItem => Boolean(item)),
    [feedItems],
  );
  const filtered = filter === 'all' ? news : news.filter((item) => item.sentiment === filter);

  const personalized = useMemo(() => {
    const selected: Array<{ interest: string; item: NewsItem }> = [];
    const used = new Set<string>();
    for (const interest of preferences) {
      const match = news
        .filter((item) => !used.has(item.id) && matchesInterest(item, interest))
        .sort((a, b) => b.confidence - a.confidence)[0];
      if (match) {
        selected.push({ interest, item: match });
        used.add(match.id);
      }
      if (selected.length === 2) break;
    }
    return selected;
  }, [news, preferences]);

  const alert = news.find((item) => item.live) ?? news[0];
  const nonEventItems = filter === 'all' ? feedItems.filter((item) => item.card_type !== 'event') : [];

  function renderSupplementaryCard(item: FeedItem) {
    if (item.card_type === 'prediction') return <PredictionCard key={item.id} item={item} />;
    if (item.card_type === 'sector') return <SectorCard key={item.id} item={item} />;
    if (item.card_type === 'outcome') return <OutcomeCard key={item.id} item={item} />;
    if (item.card_type === 'report') return <ReportFeedCard key={item.id} item={item} />;
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="What's New"
        subtitle="Signal, not noise — updating as sources refresh"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open morning briefing"
            hitSlop={hitSlop}
            onPress={onOpenBriefing}
            style={({ pressed }) => [styles.bellWrap, pressed && styles.pressed]}
          >
            <Bell size={20} color={colors.text} />
            <View style={styles.notificationDot} />
          </Pressable>
        }
      />
      <View style={[styles.liveBesideTitle, styles.noPointerEvents]}>
        <LiveDot />
      </View>

      {showAlert && alert ? (
        <View style={styles.alert}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${alert.ticker} research alert`}
            onPress={() => onOpen({ ...alert, live: true })}
            style={({ pressed }) => [styles.alertOpen, pressed && styles.pressed]}
          >
            <Text style={styles.alertEmoji}>🚨</Text>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>${alert.ticker} JUST MOVED</Text>
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.headline}. Evidence read:{' '}
                <Text style={alert.sentiment === 'bullish' ? styles.bull : alert.sentiment === 'bearish' ? styles.bear : styles.neutral}>
                  {alert.sentiment === 'bullish' ? 'Bullish 📈' : alert.sentiment === 'bearish' ? 'Bearish 📉' : 'Neutral'}
                </Text>
                {' · '}{alert.confidence}% confidence
              </Text>
              {showMemes && alert.meme ? <Text style={styles.alertMeme}>😂 {alert.meme}</Text> : null}
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss alert"
            hitSlop={hitSlop}
            onPress={() => setShowAlert(false)}
            style={styles.alertClose}
          >
            <X size={14} color={colors.textFaint} />
          </Pressable>
        </View>
      ) : null}

      {quiet ? (
        <View style={styles.quietBox}>
          <Text style={styles.quietTitle}>Quiet tape</Text>
          <Text style={styles.quietText}>{quietMessage || 'Fewer high-signal items cleared the bar.'}</Text>
        </View>
      ) : null}

      {personalized.length ? (
        <View style={styles.personalizedGroup}>
          {personalized.map(({ interest, item }) => (
            <View key={`${interest}-${item.id}`} style={styles.personalized}>
              <Text style={styles.personalizedLabel}>Because you follow {interest}</Text>
              <NewsCard
                item={item}
                quote={quotes[item.ticker]}
                watching={watchlist.includes(item.ticker)}
                onOpen={onOpen}
                onToggleWatch={onToggleWatch}
                showMeme={showMemes}
              />
            </View>
          ))}
        </View>
      ) : null}

      <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator={false}>
        {filters.map((item) => (
          <ChoiceChip
            key={item}
            label={item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}
            selected={filter === item}
            onPress={() => setFilter(item)}
          />
        ))}
      </ScrollView>

      <View style={styles.feed}>
        {filtered.map((item) => (
          <NewsCard
            key={item.id}
            item={item}
            quote={quotes[item.ticker]}
            watching={watchlist.includes(item.ticker)}
            onOpen={onOpen}
            onToggleWatch={onToggleWatch}
            showMeme={showMemes}
          />
        ))}
        {nonEventItems.map(renderSupplementaryCard)}
        {!filtered.length && !nonEventItems.length ? (
          <Text style={styles.emptyFeed}>{filter === 'all' ? 'No events have cleared the importance bar yet.' : `No ${filter} events right now.`}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 112, paddingHorizontal: 16, paddingTop: 14 },
  bellWrap: { marginRight: 3, padding: 2, position: 'relative' },
  notificationDot: { backgroundColor: colors.bear, borderRadius: 4, height: 8, position: 'absolute', right: 0, top: 0, width: 8 },
  liveBesideTitle: { left: 143, position: 'absolute', top: 21 },
  noPointerEvents: { pointerEvents: 'none' },
  alert: { backgroundColor: colors.surfaceHi, borderColor: colors.borderHi, borderRadius: 14, borderWidth: 1, marginTop: 14, overflow: 'hidden', position: 'relative' },
  alertOpen: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, padding: 12, paddingRight: 34 },
  alertClose: { padding: 4, position: 'absolute', right: 8, top: 8, zIndex: 2 },
  alertEmoji: { fontSize: 16 },
  alertCopy: { flex: 1 },
  alertTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 12.5 },
  alertText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 2 },
  alertMeme: { color: colors.amber, fontFamily: fonts.regular, fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  bull: { color: colors.bull, fontFamily: fonts.bold },
  bear: { color: colors.bear, fontFamily: fonts.bold },
  neutral: { color: colors.textDim, fontFamily: fonts.bold },
  quietBox: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginTop: 14, padding: 12 },
  quietTitle: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, marginBottom: 4 },
  quietText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  personalizedGroup: { marginTop: 16 },
  personalized: { marginBottom: 10 },
  personalizedLabel: { color: colors.brand, fontFamily: fonts.bold, fontSize: 11.5, marginBottom: 6 },
  filters: { gap: 8, paddingBottom: 6, paddingTop: 10 },
  feed: { marginTop: 10 },
  emptyFeed: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12.5, paddingVertical: 18, textAlign: 'center' },
  pressed: { opacity: 0.75 },
});

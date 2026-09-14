import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronRight, X } from 'lucide-react-native';

import { colors, fonts, hitSlop } from '../theme';
import type { Briefing, FeedItem, NewsItem, Quote, Sentiment } from '../types';
import { NewsCard } from '../components/NewsCard';
import { OutcomeCard, PredictionCard, ReportFeedCard, SectorCard } from '../components/FeedCards';
import { ChoiceChip, ConfidenceMeter, LiveDot, ScreenHeader } from '../components/Ui';
import { feedEventToNewsItem } from '../feedMap';

type Props = {
  news: NewsItem[];
  feedItems: FeedItem[];
  quiet?: boolean;
  quietMessage?: string | null;
  quotes: Record<string, Quote>;
  watchlist: string[];
  preferences: string[];
  showMemes: boolean;
  briefing: Briefing;
  onOpen: (item: NewsItem) => void;
  onToggleWatch: (ticker: string) => void;
};

const filters: Array<'all' | Sentiment> = ['all', 'bullish', 'bearish', 'neutral'];

function renderFeedCard(
  item: FeedItem,
  quotes: Record<string, Quote>,
  watchlist: string[],
  showMemes: boolean,
  onOpen: (item: NewsItem) => void,
  onToggleWatch: (ticker: string) => void,
) {
  if (item.card_type === 'prediction') return <PredictionCard key={item.id} item={item} />;
  if (item.card_type === 'sector') return <SectorCard key={item.id} item={item} />;
  if (item.card_type === 'outcome') return <OutcomeCard key={item.id} item={item} />;
  if (item.card_type === 'report') return <ReportFeedCard key={item.id} item={item} />;
  const newsItem = feedEventToNewsItem(item);
  if (!newsItem) return null;
  return (
    <NewsCard
      key={item.id}
      item={newsItem}
      quote={quotes[newsItem.ticker]}
      watching={watchlist.includes(newsItem.ticker)}
      onOpen={onOpen}
      onToggleWatch={onToggleWatch}
      showMeme={showMemes}
    />
  );
}

export function HomeScreen({
  news,
  feedItems,
  quiet,
  quietMessage,
  quotes,
  watchlist,
  preferences,
  showMemes,
  briefing,
  onOpen,
  onToggleWatch,
}: Props) {
  const [filter, setFilter] = useState<'all' | Sentiment>('all');
  const [showAlert, setShowAlert] = useState(true);
  const liveNews = useMemo(() => {
    const fromFeed = feedItems
      .map(feedEventToNewsItem)
      .filter((item): item is NewsItem => Boolean(item));
    return fromFeed.length ? fromFeed : news;
  }, [feedItems, news]);
  const filtered = filter === 'all' ? liveNews : liveNews.filter((item) => item.sentiment === filter);
  const personalized = useMemo(() => {
    const selected = liveNews.filter(
      (item) => preferences.includes(item.sector) || (preferences.includes('AI') && item.sector === 'AI'),
    );
    return selected.slice(0, 2);
  }, [liveNews, preferences]);

  const alert = liveNews.find((item) => item.impact === 'High') ?? liveNews[0];
  const useLiveFeed = feedItems.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="What's New"
        subtitle="Signal, not noise — updating as free sources refresh"
        action={
          <View style={styles.bellWrap}>
            <Bell size={20} color={colors.text} />
            <View style={styles.notificationDot} />
          </View>
        }
      />
      <View style={[styles.liveBesideTitle, styles.noPointerEvents]}>
        <LiveDot />
      </View>

      <View style={styles.briefingCard}>
        <View style={styles.briefingTop}>
          <Text style={styles.briefingEyebrow}>{briefing.eyebrow}</Text>
          <Text style={styles.briefingConfidence}>{briefing.confidence}%</Text>
        </View>
        <Text style={styles.briefingTitle}>{briefing.title}</Text>
        <Text style={styles.briefingSummary}>{briefing.summary}</Text>
        <ConfidenceMeter value={briefing.confidence} />
        <View style={styles.briefingDivider} />
        <View style={styles.briefingPoint}>
          <ChevronRight size={13} color={colors.bull} />
          <Text style={styles.briefingPointText}>{briefing.scenarios}</Text>
        </View>
        <View style={styles.briefingPoint}>
          <ChevronRight size={13} color={colors.bear} />
          <Text style={styles.briefingPointText}>{briefing.risks}</Text>
        </View>
      </View>

      {quiet ? (
        <View style={styles.quietBox}>
          <Text style={styles.quietTitle}>Quiet tape</Text>
          <Text style={styles.quietText}>{quietMessage || 'Fewer high-signal items cleared the bar.'}</Text>
        </View>
      ) : null}

      {showAlert && alert ? (
        <View style={styles.alert}>
          <Pressable onPress={() => onOpen({ ...alert, live: true })} style={({ pressed }) => [styles.alertOpen, pressed && styles.pressed]}>
            <Text style={styles.alertEmoji}>🚨</Text>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>${alert.ticker} RESEARCH ALERT</Text>
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.headline}. Evidence read:{' '}
                <Text style={alert.sentiment === 'bullish' ? styles.bull : alert.sentiment === 'bearish' ? styles.bear : styles.neutral}>
                  {alert.sentiment}
                </Text>{' '}
                · {alert.confidence}% confidence
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

      {personalized.map((item) => (
        <View key={`personal-${item.id}`} style={styles.personalized}>
          <Text style={styles.personalizedLabel}>Because you follow {item.sector}</Text>
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
        {useLiveFeed
          ? feedItems.map((item) => renderFeedCard(item, quotes, watchlist, showMemes, onOpen, onToggleWatch))
          : filtered.map((item) => (
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 112, paddingHorizontal: 16, paddingTop: 14 },
  bellWrap: { marginRight: 3, position: 'relative' },
  notificationDot: { backgroundColor: colors.bear, borderRadius: 4, height: 8, position: 'absolute', right: -2, top: -2, width: 8 },
  liveBesideTitle: { left: 143, position: 'absolute', top: 21 },
  noPointerEvents: { pointerEvents: 'none' },
  briefingCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 16 },
  briefingTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  briefingEyebrow: { color: colors.brand, fontFamily: fonts.extraBold, fontSize: 10, letterSpacing: 0.7 },
  briefingConfidence: { color: colors.textFaint, fontFamily: fonts.monoSemiBold, fontSize: 10 },
  briefingTitle: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 16, lineHeight: 21, marginBottom: 8 },
  briefingSummary: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18.5, marginBottom: 11 },
  briefingDivider: { backgroundColor: colors.border, height: 1, marginVertical: 11 },
  briefingPoint: { alignItems: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 6 },
  briefingPointText: { color: colors.textFaint, flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16 },
  quietBox: { backgroundColor: colors.surfaceHi, borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginTop: 14, padding: 12 },
  quietTitle: { color: colors.amber, fontFamily: fonts.bold, fontSize: 12, marginBottom: 4 },
  quietText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
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
  personalized: { marginTop: 16 },
  personalizedLabel: { color: colors.brand, fontFamily: fonts.bold, fontSize: 11.5, marginBottom: 6 },
  filters: { gap: 8, paddingBottom: 6, paddingTop: 10 },
  feed: { marginTop: 10 },
  pressed: { opacity: 0.75 },
});

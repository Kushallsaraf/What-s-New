import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';

import { colors, fonts, radius, tabular } from '../theme';
import type { Briefing, FeedItem, NewsItem, Sentiment } from '../types';
import { EventCard } from '../components/EventCard';
import { OutcomeCard, PredictionCard, ReportFeedCard, SectorCard } from '../components/FeedCards';
import { ChoiceChip, ConfidenceMeter, LiveDot, ScreenHeader } from '../components/Ui';
import { eventPayloadOf, stockMeta } from '../feedMap';

type Props = {
  feedItems: FeedItem[];
  quiet?: boolean;
  quietMessage?: string | null;
  watchlist: string[];
  preferences: string[];
  showMemes: boolean;
  briefing: Briefing;
  onOpen: (item: NewsItem) => void;
  onToggleWatch: (ticker: string) => void;
};

const filters: Array<'all' | Sentiment> = ['all', 'bullish', 'bearish', 'neutral'];

export function HomeScreen({
  feedItems,
  quiet,
  quietMessage,
  watchlist,
  preferences,
  showMemes,
  briefing,
  onOpen,
  onToggleWatch,
}: Props) {
  const [filter, setFilter] = useState<'all' | Sentiment>('all');

  /** The sentiment filter applies to everything on screen, promoted cards
   *  included — otherwise the page can show a bullish card while claiming
   *  there are no bullish events. */
  const visible = useMemo(() => {
    if (filter === 'all') return feedItems;
    return feedItems.filter((item) => {
      const payload = eventPayloadOf(item);
      // Non-event cards (predictions, sectors, reports) carry no sentiment.
      return payload ? payload.sentiment === filter : false;
    });
  }, [feedItems, filter]);

  /** Events whose affected tickers sit in a sector the user follows. */
  const personalized = useMemo(() => {
    if (!preferences.length) return [];
    return visible
      .filter((item) => {
        const payload = eventPayloadOf(item);
        if (!payload) return false;
        return payload.tickers.some((t) => preferences.includes(stockMeta(t.ticker).sector));
      })
      .slice(0, 2);
  }, [visible, preferences]);

  const personalizedSector = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of personalized) {
      const payload = eventPayloadOf(item);
      const match = payload?.tickers.find((t) => preferences.includes(stockMeta(t.ticker).sector));
      if (match) map.set(item.id, stockMeta(match.ticker).sector);
    }
    return map;
  }, [personalized, preferences]);

  /** The main feed excludes anything already promoted above it, so one event
   *  is never rendered twice on the same screen. */
  const feed = useMemo(() => {
    const promoted = new Set(personalized.map((item) => item.id));
    return visible.filter((item) => !promoted.has(item.id));
  }, [visible, personalized]);

  const nothingToShow = !personalized.length && !feed.length;

  function renderCard(item: FeedItem) {
    if (item.card_type === 'prediction') return <PredictionCard key={item.id} item={item} />;
    if (item.card_type === 'sector') return <SectorCard key={item.id} item={item} />;
    if (item.card_type === 'outcome') return <OutcomeCard key={item.id} item={item} />;
    if (item.card_type === 'report') return <ReportFeedCard key={item.id} item={item} />;
    return (
      <EventCard
        key={item.id}
        item={item}
        watchlist={watchlist}
        showMeme={showMemes}
        onOpen={onOpen}
        onToggleWatch={onToggleWatch}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="What's New"
        subtitle="Signal, not noise — updating as free sources refresh"
        action={
          <View style={styles.bellWrap}>
            <Bell size={20} color={colors.text} />
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

      {personalized.map((item) => (
        <View key={`personal-${item.id}`} style={styles.personalized}>
          <Text style={styles.personalizedLabel}>
            Because you follow {personalizedSector.get(item.id)}
          </Text>
          {renderCard(item)}
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
        {feed.map(renderCard)}
        {nothingToShow ? (
          <Text style={styles.emptyFeed}>
            {filter === 'all'
              ? 'No events have cleared the importance bar yet.'
              : `No ${filter} events right now.`}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 112, paddingHorizontal: 16, paddingTop: 14 },
  bellWrap: { marginRight: 3, position: 'relative' },
  liveBesideTitle: { left: 143, position: 'absolute', top: 21 },
  noPointerEvents: { pointerEvents: 'none' },
  briefingCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginTop: 16, padding: 16 },
  briefingTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  briefingEyebrow: { color: colors.textDim, fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 1.1 },
  briefingConfidence: { color: colors.textFaint, fontFamily: fonts.monoSemiBold, fontSize: 10 , ...tabular },
  briefingTitle: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 16, lineHeight: 21, marginBottom: 8 },
  briefingSummary: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18.5, marginBottom: 11 },
  briefingDivider: { backgroundColor: colors.border, height: 1, marginVertical: 11 },
  briefingPoint: { alignItems: 'flex-start', flexDirection: 'row', gap: 6, marginBottom: 6 },
  briefingPointText: { color: colors.textFaint, flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16 },
  quietBox: { backgroundColor: colors.surfaceHi, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginTop: 14, padding: 12 },
  quietTitle: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, marginBottom: 4 },
  quietText: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  personalized: { marginTop: 16 },
  personalizedLabel: { color: colors.textFaint, fontFamily: fonts.semiBold, fontSize: 10.5, letterSpacing: 0.4, marginBottom: 7, textTransform: 'uppercase' },
  filters: { gap: 8, paddingBottom: 6, paddingTop: 10 },
  feed: { marginTop: 10 },
  emptyFeed: {
    color: colors.textFaint,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    paddingVertical: 18,
    textAlign: 'center',
  },
});

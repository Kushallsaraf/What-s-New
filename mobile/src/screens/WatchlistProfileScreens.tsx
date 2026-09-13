import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Info, StarOff, User } from 'lucide-react-native';

import { NewsCard } from '../components/NewsCard';
import { ChangePill, ChoiceChip, ScreenHeader, Section, Toggle } from '../components/Ui';
import { sectors, stocks } from '../data';
import { colors, fonts, hitSlop } from '../theme';
import type { NewsItem, Quote } from '../types';

export type NotificationSettings = {
  morning: boolean;
  event: boolean;
  watchlist: boolean;
  endOfDay: boolean;
};

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
              <View style={styles.watchCopy}>
                <Text style={styles.watchTicker}>${ticker}</Text>
                <Text style={styles.watchName} numberOfLines={1}>{stock.name}</Text>
              </View>
              <View style={styles.watchQuote}>
                <View style={styles.watchPriceBlock}>
                  <Text style={styles.watchPrice}>${quote.price.toFixed(2)}</Text>
                  <ChangePill value={quote.change} large />
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${ticker} from watchlist`} hitSlop={hitSlop} onPress={() => onToggleWatch(ticker)} style={({ pressed }) => pressed && styles.pressed}>
                  <StarOff size={16} color={colors.textFaint} />
                </Pressable>
              </View>
            </View>
          );
        })}
        {!watchlist.length ? <Text style={styles.empty}>Star anything in What's New or Explore to add it here.</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Latest developments</Text>
      {developments.length ? developments.map((item) => (
        <NewsCard
          key={item.id}
          item={item}
          quote={quotes[item.ticker]}
          watching
          onOpen={onOpen}
          onToggleWatch={onToggleWatch}
        />
      )) : <Text style={styles.empty}>No research updates yet for your watchlist.</Text>}
    </ScrollView>
  );
}

function PreferenceGrid({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <View style={styles.chipGrid}>
      {items.map((item) => <ChoiceChip key={item} label={item} selected={selected.includes(item)} onPress={() => onToggle(item)} />)}
    </View>
  );
}

function SettingRow({ title, subtitle, value, onToggle }: { title: string; subtitle: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Toggle on={value} onPress={onToggle} />
    </View>
  );
}

export function ProfileScreen({ preferences, onTogglePreference, showMemes, onToggleMemes, notifications, onToggleNotification }: {
  preferences: string[];
  onTogglePreference: (item: string) => void;
  showMemes: boolean;
  onToggleMemes: () => void;
  notifications: NotificationSettings;
  onToggleNotification: (key: keyof NotificationSettings) => void;
}) {
  const interests = [...sectors, 'Macro'];
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Profile" subtitle="Control relevance and alert cadence" />

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <User size={20} color={colors.brand} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle}>Your research feed</Text>
          <Text style={styles.profileSubtitle}>Personalized · {preferences.length} interests selected</Text>
        </View>
      </View>

      <Section title="What are you interested in?">
        <PreferenceGrid items={interests} selected={preferences} onToggle={onTogglePreference} />
        <Text style={styles.helpText}>Drives the “Because you follow…” section and which research alerts reach you.</Text>
      </Section>

      <Section title="Briefings & alerts">
        <View style={styles.settingsCard}>
          <SettingRow title="Morning briefing" subtitle="Evidence, scenarios, risks, confidence" value={notifications.morning} onToggle={() => onToggleNotification('morning')} />
          <View style={styles.divider} />
          <SettingRow title="Event-driven alerts" subtitle="When a monitored source materially changes" value={notifications.event} onToggle={() => onToggleNotification('event')} />
          <View style={styles.divider} />
          <SettingRow title="Watchlist updates" subtitle="Periodic digest as free data refreshes" value={notifications.watchlist} onToggle={() => onToggleNotification('watchlist')} />
          <View style={styles.divider} />
          <SettingRow title="End-of-day analysis" subtitle="Supplementary recap, not the main product" value={notifications.endOfDay} onToggle={() => onToggleNotification('endOfDay')} />
        </View>
      </Section>

      <Section title="Finance memes">
        <View style={styles.settingStandalone}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Tasteful context on big moves</Text>
            <Text style={styles.settingSubtitle}>Optional and never used as evidence</Text>
          </View>
          <Toggle on={showMemes} onPress={onToggleMemes} />
        </View>
      </Section>

      <Section title="Data & models">
        <View style={styles.infoCard}>
          <Info size={15} color={colors.textFaint} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            The MVP is designed for free and delayed sources: SEC EDGAR, FRED, U.S. Treasury, BLS, EIA, company investor-relations feeds, and permitted market data. Heavy ingestion and model tests run off-device. Kronos Mini/Small stays disabled unless zero-shot rolling tests consistently beat simple baselines; it never runs on the phone.
          </Text>
        </View>
      </Section>

      <Text style={styles.disclaimer}>For research and educational purposes only. Not financial advice.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 112, paddingHorizontal: 16, paddingTop: 14 },
  watchlistRows: { gap: 8, marginBottom: 24, marginTop: 14 },
  watchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  watchCopy: { flex: 1 },
  watchTicker: { color: colors.text, fontFamily: fonts.monoSemiBold, fontSize: 14 },
  watchName: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
  watchQuote: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  watchPriceBlock: { alignItems: 'flex-end', gap: 4 },
  watchPrice: { color: colors.text, fontFamily: fonts.mono, fontSize: 13 },
  sectionTitle: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
  empty: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, padding: 30, textAlign: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 22, marginTop: 14, padding: 14 },
  profileAvatar: { alignItems: 'center', backgroundColor: colors.brandDim, borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  profileCopy: { flex: 1 },
  profileTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  profileSubtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, marginTop: 2 },
  helpText: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 8 },
  settingsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: 13 },
  settingStandalone: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', padding: 13 },
  settingRow: { alignItems: 'center', flexDirection: 'row', minHeight: 66, paddingVertical: 10 },
  settingCopy: { flex: 1, paddingRight: 12 },
  settingTitle: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 13 },
  settingSubtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  divider: { backgroundColor: colors.border, height: 1 },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 13 },
  infoIcon: { marginTop: 1 },
  infoText: { color: colors.textFaint, flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17.5 },
  disclaimer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 8, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono/700Bold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Compass, LineChart, Newspaper, Sparkles, User, Wallet } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AskResearchModal } from './src/components/AskResearchModal';
import { DetailModal } from './src/components/DetailModal';
import { seedNews } from './src/data';
import { bundledSnapshot, loadResearchSnapshot, type ResearchSnapshot } from './src/services/researchApi';
import { HomeScreen } from './src/screens/HomeScreen';
import { ExploreScreen, MarketsScreen } from './src/screens/MarketExploreScreens';
import { ProfileScreen, WatchlistScreen, type NotificationSettings } from './src/screens/WatchlistProfileScreens';
import { colors, fonts } from './src/theme';
import type { AppTab, NewsItem } from './src/types';

void SplashScreen.preventAutoHideAsync();

const storageKeys = {
  watchlist: '@whats-new/watchlist',
  preferences: '@whats-new/preferences',
  memes: '@whats-new/memes',
  notifications: '@whats-new/notifications',
};

const defaultNotifications: NotificationSettings = {
  morning: true,
  event: true,
  watchlist: true,
  endOfDay: false,
};

const newsWithOptionalContext: NewsItem[] = seedNews.map((item) => {
  if (item.ticker === 'NVDA') return { ...item, meme: 'Green candles hit different 🕯️💚' };
  if (item.ticker === 'TLT') return { ...item, meme: 'Red candles, cold sweats 🥶' };
  return item;
});

function AppShell() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<AppTab>('new');
  const [openItem, setOpenItem] = useState<NewsItem | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [watchlist, setWatchlist] = useState(['NVDA', 'AAPL', 'MSFT', 'TSLA']);
  const [preferences, setPreferences] = useState(['Technology', 'AI', 'Fixed income']);
  const [showMemes, setShowMemes] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [hydrated, setHydrated] = useState(false);
  const [research, setResearch] = useState<ResearchSnapshot>(bundledSnapshot);

  useEffect(() => {
    const controller = new AbortController();
    void loadResearchSnapshot(controller.signal).then(setResearch);
    return () => controller.abort();
  }, []);

  const quotes = research.quotes;

  useEffect(() => {
    async function hydrate() {
      try {
        const values = await AsyncStorage.multiGet(Object.values(storageKeys));
        const entries = Object.fromEntries(values);
        const storedWatchlist = entries[storageKeys.watchlist];
        const storedPreferences = entries[storageKeys.preferences];
        const storedMemes = entries[storageKeys.memes];
        const storedNotifications = entries[storageKeys.notifications];
        if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));
        if (storedPreferences) setPreferences(JSON.parse(storedPreferences));
        if (storedMemes) setShowMemes(JSON.parse(storedMemes));
        if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
      } catch {
        // In-memory defaults keep the MVP usable if local storage is unavailable.
      } finally {
        setHydrated(true);
      }
    }
    void hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.multiSet([
      [storageKeys.watchlist, JSON.stringify(watchlist)],
      [storageKeys.preferences, JSON.stringify(preferences)],
      [storageKeys.memes, JSON.stringify(showMemes)],
      [storageKeys.notifications, JSON.stringify(notifications)],
    ]);
  }, [hydrated, notifications, preferences, showMemes, watchlist]);

  function toggleWatch(ticker: string) {
    setWatchlist((current) => current.includes(ticker) ? current.filter((item) => item !== ticker) : [...current, ticker]);
  }

  function togglePreference(preference: string) {
    setPreferences((current) => current.includes(preference) ? current.filter((item) => item !== preference) : [...current, preference]);
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
  }

  const screen = useMemo(() => {
    if (tab === 'markets') return <MarketsScreen quotes={quotes} />;
    if (tab === 'explore') return <ExploreScreen quotes={quotes} watchlist={watchlist} onToggleWatch={toggleWatch} />;
    if (tab === 'watchlist') return <WatchlistScreen watchlist={watchlist} quotes={quotes} news={newsWithOptionalContext} onToggleWatch={toggleWatch} onOpen={setOpenItem} />;
    if (tab === 'profile') {
      return (
        <ProfileScreen
          preferences={preferences}
          onTogglePreference={togglePreference}
          showMemes={showMemes}
          onToggleMemes={() => setShowMemes((value) => !value)}
          notifications={notifications}
          onToggleNotification={toggleNotification}
        />
      );
    }
    return (
      <HomeScreen
        news={newsWithOptionalContext}
        quotes={quotes}
        watchlist={watchlist}
        preferences={preferences}
        showMemes={showMemes}
        briefing={research.briefing}
        onOpen={setOpenItem}
        onToggleWatch={toggleWatch}
      />
    );
  }, [notifications, preferences, quotes, research.briefing, showMemes, tab, watchlist]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.app}>
        <View style={styles.screen}>{screen}</View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open AI research assistant"
          onPress={() => setAssistantOpen(true)}
          style={({ pressed }) => [styles.assistantButton, { bottom: 82 + Math.max(insets.bottom, 6) }, pressed && styles.pressed]}
        >
          <Sparkles size={20} color={colors.text} />
        </Pressable>

        <BottomNavigation tab={tab} onChange={setTab} bottomInset={insets.bottom} />
      </View>

      <DetailModal item={openItem} quote={openItem ? quotes[openItem.ticker] : undefined} onClose={() => setOpenItem(null)} />
      <AskResearchModal visible={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </SafeAreaView>
  );
}

function BottomNavigation({ tab, onChange, bottomInset }: { tab: AppTab; onChange: (tab: AppTab) => void; bottomInset: number }) {
  const items = [
    { id: 'new' as const, label: "What's New", Icon: Newspaper },
    { id: 'markets' as const, label: 'Markets', Icon: LineChart },
    { id: 'explore' as const, label: 'Explore', Icon: Compass },
    { id: 'watchlist' as const, label: 'Watchlist', Icon: Wallet },
    { id: 'profile' as const, label: 'Profile', Icon: User },
  ];

  return (
    <View style={[styles.bottomNav, { height: 68 + bottomInset, paddingBottom: bottomInset }]}>
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(id)}
            style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
          >
            <Icon size={19} color={active ? colors.brand : colors.textFaint} strokeWidth={active ? 2.4 : 2} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  const ready = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider style={styles.provider}>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: { alignItems: 'center', backgroundColor: '#05070A', flex: 1 },
  safeArea: { backgroundColor: colors.bg, flex: 1, maxWidth: 430, width: '100%' },
  app: { backgroundColor: colors.bg, flex: 1, position: 'relative' },
  screen: { flex: 1 },
  assistantButton: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 24,
    elevation: 8,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    width: 48,
    zIndex: 21,
  },
  bottomNav: { backgroundColor: colors.bgElevated, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, flexDirection: 'row', left: 0, position: 'absolute', right: 0, zIndex: 20 },
  navItem: { alignItems: 'center', flex: 1, gap: 3, justifyContent: 'center' },
  navLabel: { color: colors.textFaint, fontFamily: fonts.medium, fontSize: 9.5 },
  navLabelActive: { color: colors.brand, fontFamily: fonts.bold },
  pressed: { opacity: 0.7 },
});

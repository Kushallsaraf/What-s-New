import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Info, User } from 'lucide-react-native';

import { ChoiceChip, ScreenHeader, Section, Toggle } from '../components/Ui';
import { sectors } from '../data';
import { signInWithPassword, signOut, signUp } from '../services/auth';
import { colors, fonts, hitSlop, radius } from '../theme';

export type NotificationSettings = {
  morning: boolean;
  event: boolean;
  watchlist: boolean;
  endOfDay: boolean;
};

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

export function ProfileScreen({
  preferences,
  onTogglePreference,
  showMemes,
  onToggleMemes,
  notifications,
  onToggleNotification,
  authEmail = null,
  authConfigured = false,
}: {
  preferences: string[];
  onTogglePreference: (item: string) => void;
  showMemes: boolean;
  onToggleMemes: () => void;
  notifications: NotificationSettings;
  onToggleNotification: (key: keyof NotificationSettings) => void;
  authEmail?: string | null;
  authConfigured?: boolean;
}) {
  const interests = [...sectors, 'Macro'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    setAuthMessage(null);
    try {
      const { error } = await signInWithPassword(email.trim(), password);
      setAuthMessage(error ? error.message : 'Signed in');
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    setBusy(true);
    setAuthMessage(null);
    try {
      const { error } = await signUp(email.trim(), password);
      setAuthMessage(error ? error.message : 'Check your email to confirm, then sign in.');
    } catch (err) {
      setAuthMessage(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setAuthMessage('Signed out');
  }

  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Profile" subtitle="Control relevance and alert cadence" />

      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <User size={20} color={colors.textDim} />
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileTitle}>{authEmail || 'Your research feed'}</Text>
          <Text style={styles.profileSubtitle}>
            {authEmail ? 'Synced watchlist via Supabase Auth' : `Personalized · ${preferences.length} interests selected`}
          </Text>
        </View>
      </View>

      <Section title="Account">
        {authConfigured ? (
          <View style={styles.authCard}>
            {authEmail ? (
              <Pressable onPress={() => void handleSignOut()} style={({ pressed }) => [styles.authButton, pressed && styles.pressed]}>
                <Text style={styles.authButtonText}>Sign out</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                />
                <View style={styles.authRow}>
                  <Pressable disabled={busy} onPress={() => void handleSignIn()} style={({ pressed }) => [styles.authButton, pressed && styles.pressed]}>
                    <Text style={styles.authButtonText}>Sign in</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => void handleSignUp()} style={({ pressed }) => [styles.authButtonSecondary, pressed && styles.pressed]}>
                    <Text style={styles.authButtonTextSecondary}>Sign up</Text>
                  </Pressable>
                </View>
              </>
            )}
            {authMessage ? <Text style={styles.helpText}>{authMessage}</Text> : null}
          </View>
        ) : (
          <Text style={styles.helpText}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable account sync. Watchlist stays on-device until then.
          </Text>
        )}
      </Section>

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
            Live mode uses Alpaca Basic (IEX/delayed), SEC EDGAR, RSS, and Finnhub free news through the FastAPI pipeline. Kronos weight stays 0 until the retention gate passes; inference never runs on the phone. Point EXPO_PUBLIC_RESEARCH_API_URL at the API for live feed cards.
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
  watchRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  watchCopy: { flex: 1 },
  watchTicker: { color: colors.text, fontFamily: fonts.monoSemiBold, fontSize: 14 },
  watchName: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
  watchQuote: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  watchPriceBlock: { alignItems: 'flex-end', gap: 4 },
  watchPrice: { color: colors.text, fontFamily: fonts.mono, fontSize: 13 },
  sectionTitle: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
  empty: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, padding: 30, textAlign: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 22, marginTop: 14, padding: 14 },
  profileAvatar: { alignItems: 'center', backgroundColor: colors.surfaceHi, borderRadius: radius.md, height: 44, justifyContent: 'center', width: 44 },
  profileCopy: { flex: 1 },
  profileTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14 },
  profileSubtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, marginTop: 2 },
  helpText: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 8 },
  settingsCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 13 },
  settingStandalone: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', padding: 13 },
  settingRow: { alignItems: 'center', flexDirection: 'row', minHeight: 66, paddingVertical: 10 },
  settingCopy: { flex: 1, paddingRight: 12 },
  settingTitle: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 13 },
  settingSubtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  divider: { backgroundColor: colors.border, height: 1 },
  infoCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 13 },
  infoIcon: { marginTop: 1 },
  infoText: { color: colors.textFaint, flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17.5 },
  disclaimer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 8, textAlign: 'center' },
  pressed: { opacity: 0.72 },
  authCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, gap: 10, padding: 13 },
  input: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authRow: { flexDirection: 'row', gap: 8 },
  authButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: 10,
  },
  authButtonSecondary: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHi,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  authButtonText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 13 },
  authButtonTextSecondary: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
});

import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, hitSlop, radius, tabular } from '../theme';
import type { NewsItem, Quote } from '../types';
import { ChangePill, ConfidenceMeter, Section, SentimentBadge } from './Ui';

export function DetailModal({ item, quote, onClose }: { item: NewsItem | null; quote?: Quote; onClose: () => void }) {
  if (!item) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close research detail" hitSlop={hitSlop} onPress={onClose} style={styles.iconButton}>
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <View>
            <Text style={styles.toolbarTitle}>{item.name} · ${item.ticker}</Text>
            <Text style={styles.toolbarSubtitle}>{item.sector}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.signalRow}>
            <SentimentBadge sentiment={item.sentiment} />
            <View style={styles.impactScore}>
              <Text style={styles.impactScoreText}>◆ {item.confidence}/100 confidence</Text>
            </View>
          </View>

          <Text style={styles.headline}>{item.headline}</Text>

          {quote ? (
            <View style={styles.quoteCard}>
              <View>
                <Text style={styles.label}>Reference price</Text>
                <Text style={styles.price}>${quote.price.toFixed(2)}</Text>
                <Text style={styles.freshness}>{quote.freshness}</Text>
              </View>
              <View style={styles.quoteRight}>
                <Text style={styles.label}>Move</Text>
                <ChangePill value={quote.change} large />
              </View>
            </View>
          ) : null}

          <Section title="What happened?">
            <Text style={styles.paragraph}>{item.summary}</Text>
          </Section>
          <Section title="Why investors care">
            <Text style={styles.paragraph}>{item.why}</Text>
          </Section>
          <Section title="Scenarios">
            <View style={[styles.scenarioCard, styles.bullCard]}>
              <Text style={styles.scenarioLabelBull}>UPSIDE / CONFIRMATION</Text>
              <Text style={styles.paragraph}>{item.bullCase}</Text>
            </View>
            <View style={[styles.scenarioCard, styles.bearCard]}>
              <Text style={styles.scenarioLabelBear}>DOWNSIDE / RISK</Text>
              <Text style={styles.paragraph}>{item.bearCase}</Text>
            </View>
          </Section>
          <Section title="What to watch next">
            {item.watch.map((watchItem) => (
              <View key={watchItem} style={styles.watchRow}>
                <ChevronRight size={14} color={colors.brand} style={styles.watchIcon} />
                <Text style={styles.paragraph}>{watchItem}</Text>
              </View>
            ))}
          </Section>
          <Section title="Evidence & sources">
            {item.sources.map((source) => (
              <Pressable
                key={source.url}
                accessibilityRole="link"
                onPress={() => Linking.openURL(source.url)}
                style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
              >
                <View style={styles.sourceCopy}>
                  <Text style={styles.sourceLabel}>{source.label}</Text>
                  <Text style={styles.sourceType}>{source.type.toUpperCase()} SOURCE</Text>
                </View>
                <ExternalLink size={14} color={colors.brand} />
              </Pressable>
            ))}
          </Section>
          <Section title="Confidence">
            <ConfidenceMeter value={item.confidence} />
          </Section>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Research is informational, uses delayed or periodically refreshed data, and is not investment advice. Sentiment and confidence describe current evidence—not a future-price prediction.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { alignSelf: 'center', backgroundColor: colors.bg, flex: 1, maxWidth: 430, width: '100%' },
  toolbar: { alignItems: 'center', backgroundColor: colors.bgElevated, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  iconButton: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  toolbarTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  toolbarSubtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
  content: { padding: 18, paddingBottom: 36 },
  signalRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  impactScore: { backgroundColor: colors.amberDim, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  impactScoreText: { color: colors.amber, fontFamily: fonts.bold, fontSize: 11.5, ...tabular },
  headline: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 20, lineHeight: 26, marginBottom: 16 },
  quoteCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, padding: 14 },
  quoteRight: { alignItems: 'flex-end' },
  label: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11, marginBottom: 3 },
  price: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 22 , ...tabular },
  freshness: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 9.5, marginTop: 2 },
  paragraph: { color: colors.textDim, flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19.5 },
  scenarioCard: { borderRadius: radius.md, borderWidth: 1, padding: 12 },
  bullCard: { backgroundColor: colors.bullDim, borderColor: '#1F4C3A', marginBottom: 8 },
  bearCard: { backgroundColor: colors.bearDim, borderColor: '#572330' },
  scenarioLabelBull: { color: colors.bull, fontFamily: fonts.extraBold, fontSize: 9.5, letterSpacing: 0.6, marginBottom: 5 },
  scenarioLabelBear: { color: colors.bear, fontFamily: fonts.extraBold, fontSize: 9.5, letterSpacing: 0.6, marginBottom: 5 },
  watchRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginBottom: 8 },
  watchIcon: { marginTop: 3 },
  sourceRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 12 },
  sourceCopy: { flex: 1 },
  sourceLabel: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 12.5 },
  sourceType: { color: colors.textFaint, fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.5, marginTop: 3 },
  disclaimer: { backgroundColor: colors.surface, borderColor: colors.borderHi, borderRadius: radius.md, borderStyle: 'dashed', borderWidth: 1, marginTop: 8, padding: 12 },
  disclaimerText: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17 },
  pressed: { opacity: 0.72 },
});

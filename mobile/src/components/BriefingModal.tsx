import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, hitSlop, tabular } from '../theme';
import type { Briefing } from '../types';
import { ConfidenceMeter, Section } from './Ui';

export function BriefingModal({ briefing, visible, onClose }: { briefing: Briefing; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close morning briefing" hitSlop={hitSlop} onPress={onClose} style={styles.iconButton}><ChevronLeft size={20} color={colors.text} /></Pressable>
          <View><Text style={styles.toolbarTitle}>Morning briefing</Text><Text style={styles.toolbarSubtitle}>{briefing.eyebrow}</Text></View>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.headline}>{briefing.title}</Text><Text style={styles.summary}>{briefing.summary}</Text>
          <View style={styles.confidenceCard}><Text style={styles.confidenceLabel}>CURRENT EVIDENCE CONFIDENCE</Text><ConfidenceMeter value={briefing.confidence} /></View>
          <Section title="Scenario"><View style={styles.point}><ChevronRight size={14} color={colors.bull} /><Text style={styles.pointText}>{briefing.scenarios}</Text></View></Section>
          <Section title="Risks"><View style={styles.point}><ChevronRight size={14} color={colors.bear} /><Text style={styles.pointText}>{briefing.risks}</Text></View></Section>
          <View style={styles.disclaimer}><Text style={styles.disclaimerText}>Informational research from delayed or periodically refreshed sources. Not investment advice.</Text></View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { alignSelf: 'center', backgroundColor: colors.bg, flex: 1, maxWidth: 430, width: '100%' }, toolbar: { alignItems: 'center', backgroundColor: colors.bgElevated, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingBottom: 12, paddingHorizontal: 16, paddingTop: 14 }, iconButton: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 }, toolbarTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 }, toolbarSubtitle: { color: colors.brand, fontFamily: fonts.monoSemiBold, fontSize: 10, marginTop: 2, ...tabular },
  content: { padding: 18, paddingBottom: 36 }, headline: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 22, lineHeight: 29, marginBottom: 12 }, summary: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 21, marginBottom: 18 }, confidenceCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, marginBottom: 22, padding: 14 }, confidenceLabel: { color: colors.brand, fontFamily: fonts.extraBold, fontSize: 9.5, letterSpacing: 0.6, marginBottom: 10 }, point: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 }, pointText: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 }, disclaimer: { backgroundColor: colors.surface, borderColor: colors.borderHi, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, padding: 12 }, disclaimerText: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17 },
});

import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { askResearchResponses, chatSuggestions } from '../data';
import { colors, fonts, hitSlop } from '../theme';

type Message = { role: 'assistant' | 'user'; text: string };

export function AskResearchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "I'm your market research assistant. Ask what changed, what evidence supports it, or what would change the view." },
  ]);

  function send(value?: string) {
    const question = (value ?? input).trim();
    if (!question) return;
    const normalized = question.toLowerCase();
    const reply = askResearchResponses[normalized] ??
      "That question isn't connected to a current free-data brief yet. The production path will retrieve source-linked evidence first, then clearly separate facts, scenarios, risks, and uncertainty. It will not produce direct buy or sell instructions.";
    setMessages((current) => [...current, { role: 'user', text: question }, { role: 'assistant', text: reply }]);
    setInput('');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close research assistant" hitSlop={hitSlop} onPress={onClose} style={styles.iconButton}>
              <ChevronLeft size={20} color={colors.text} />
            </Pressable>
            <View>
              <Text style={styles.title}>Ask AI</Text>
              <Text style={styles.subtitle}>Evidence first. Never certainty about future prices.</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {messages.map((message, index) => (
              <View key={`${message.role}-${index}`} style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}>
                <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.bubbleText, message.role === 'user' && styles.userBubbleText]}>{message.text}</Text>
                </View>
              </View>
            ))}
            {messages.length === 1 ? (
              <View style={styles.suggestions}>
                {chatSuggestions.map((suggestion) => (
                  <Pressable key={suggestion} onPress={() => send(suggestion)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Research question"
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              placeholder="Ask about a stock, sector, or headline..."
              placeholderTextColor={colors.textFaint}
              returnKeyType="send"
              style={styles.input}
              value={input}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send question" onPress={() => send()} style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}>
              <Send size={16} color={colors.text} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { alignSelf: 'center', backgroundColor: colors.bg, flex: 1, maxWidth: 430, width: '100%' },
  flex: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingBottom: 8, paddingHorizontal: 16, paddingTop: 12 },
  iconButton: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  title: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 18 },
  subtitle: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 11.5, marginTop: 2 },
  messages: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 8 },
  messageRow: { alignItems: 'flex-start', marginBottom: 10 },
  messageRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '84%', paddingHorizontal: 13, paddingVertical: 10 },
  assistantBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderColor: colors.border, borderRadius: 16, borderWidth: 1 },
  userBubble: { backgroundColor: colors.brand, borderBottomRightRadius: 4, borderRadius: 16 },
  bubbleText: { color: colors.text, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20 },
  userBubbleText: { color: colors.text },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  suggestion: { backgroundColor: colors.brandDim, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  suggestionText: { color: colors.brand, fontFamily: fonts.semiBold, fontSize: 12 },
  composer: { alignItems: 'center', backgroundColor: colors.bgElevated, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, padding: 12 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 13, height: 42, paddingHorizontal: 14 },
  sendButton: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 19, height: 38, justifyContent: 'center', width: 38 },
  pressed: { opacity: 0.72 },
});

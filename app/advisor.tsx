import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { recommend } from '@core/engine/recommend';
import type { AdvisorMessage } from '@core/ai';
import { useAiProvider } from '@/store/useAiProvider';
import { useAppStore } from '@/store/useAppStore';
import { AppText, Button, EmptyState } from '@/ui/components';
import { useTheme } from '@/ui/theme';

const STARTERS = [
  'What order should I apply these in?',
  'Can I use a retinol and an acid together?',
  "What's the one thing I should add to my routine?",
];

export default function Advisor() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ai = useAiProvider();

  const products = useAppStore((state) => state.products);
  const profile = useAppStore((state) => state.profile);

  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const scrollRef = useRef<ScrollView>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: AdvisorMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(undefined);

    try {
      // Ground the answer: the model only sees products the engine already
      // decided this person could use, so it cannot recommend anything they
      // filtered out or anything that doesn't exist.
      const candidates = recommend(products, profile, { limit: 24 }).recommendations.map(
        (recommendation) => recommendation.product
      );
      const reply = await ai.chat(next, { profile, candidates });
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  if (!ai.available) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="The advisor is switched off"
          message="Turn it on in the You tab — either with your own Anthropic key, or a hosted advisor if one is configured. Everything else in Glowmatch works without it."
          action={{ label: 'Open settings', onPress: () => router.replace('/(tabs)/profile') }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View style={styles.intro}>
            <AppText variant="body" muted style={styles.introText}>
              Ask about your routine, ingredient clashes, or what to try next. Answers are drawn
              from your matches, so nothing gets invented.
            </AppText>
            {STARTERS.map((starter) => (
              <Pressable
                key={starter}
                accessibilityRole="button"
                onPress={() => void send(starter)}
                style={({ pressed }) => [
                  styles.starter,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <AppText variant="caption">{starter}</AppText>
              </Pressable>
            ))}
          </View>
        ) : (
          messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.bubble,
                message.role === 'user'
                  ? { backgroundColor: theme.colors.primary, alignSelf: 'flex-end' }
                  : { backgroundColor: theme.colors.surface, alignSelf: 'flex-start' },
              ]}>
              <AppText
                variant="body"
                color={message.role === 'user' ? theme.colors.primaryText : theme.colors.text}
                style={styles.bubbleText}>
                {message.content}
              </AppText>
            </View>
          ))
        )}

        {busy ? (
          <View style={[styles.bubble, { backgroundColor: theme.colors.surface, alignSelf: 'flex-start' }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={15} color={theme.colors.danger} />
            <AppText variant="caption" color={theme.colors.danger} style={{ flex: 1 }}>
              {error}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}>
        <TextInput
          accessibilityLabel="Ask the beauty advisor"
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask anything…"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
        />
        <Button
          label="Send"
          onPress={() => void send(draft)}
          disabled={!draft.trim() || busy}
          loading={busy}
        />
      </View>

      <AppText variant="caption" muted style={[styles.disclaimer, { paddingBottom: insets.bottom }]}>
        Cosmetic guidance only — not medical advice.
      </AppText>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  thread: { padding: 16, gap: 10 },
  intro: { gap: 8 },
  introText: { lineHeight: 22, marginBottom: 8 },
  starter: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  bubble: { maxWidth: '86%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  bubbleText: { lineHeight: 21 },
  errorRow: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    maxHeight: 120,
    fontSize: 15,
  },
  disclaimer: { textAlign: 'center', position: 'absolute', bottom: 0, left: 0, right: 0 },
});

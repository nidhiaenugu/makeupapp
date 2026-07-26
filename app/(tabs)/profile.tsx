import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CATEGORY_LABELS,
  EFFORT_LABELS,
  HAIR_CONCERN_LABELS,
  PRICE_TIER_LABELS,
  SKIN_CONCERN_LABELS,
} from '@core/types/enums';
import { proxyUrl } from '@/store/useAiProvider';
import { useAppStore } from '@/store/useAppStore';
import type { AppSettings } from '@/data/repository';
import { AppText, Badge, Button, Card, Divider, FilterChip } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const profile = useAppStore((state) => state.profile);
  const settings = useAppStore((state) => state.settings);
  const apiKey = useAppStore((state) => state.apiKey);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setApiKey = useAppStore((state) => state.setApiKey);
  const resetProfile = useAppStore((state) => state.resetProfile);

  const [keyDraft, setKeyDraft] = useState('');
  const hasProxy = !!proxyUrl();

  const confirmReset = () => {
    const run = () => {
      void resetProfile().then(() => router.replace('/onboarding'));
    };
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert('Start over?', 'This clears your answers and reopens the quiz.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start over', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}>
      <AppText variant="display" accessibilityRole="header">
        You
      </AppText>

      {/* ------------------------------- Profile ------------------------------ */}
      <Card>
        <AppText variant="heading">Your profile</AppText>
        <View style={styles.summary}>
          <Row label="Shopping for" value={profile.interests.map((c) => CATEGORY_LABELS[c]).join(', ')} />
          {profile.budget ? <Row label="Budget" value={PRICE_TIER_LABELS[profile.budget]} /> : null}
          {profile.effort ? <Row label="Routine" value={EFFORT_LABELS[profile.effort]} /> : null}
          {profile.skin.type ? <Row label="Skin" value={titleCase(profile.skin.type)} /> : null}
          {profile.skin.concerns.length ? (
            <Row
              label="Skin concerns"
              value={profile.skin.concerns.map((c) => SKIN_CONCERN_LABELS[c]).join(', ')}
            />
          ) : null}
          {profile.hair.type ? <Row label="Hair" value={titleCase(profile.hair.type)} /> : null}
          {profile.hair.concerns.length ? (
            <Row
              label="Hair concerns"
              value={profile.hair.concerns.map((c) => HAIR_CONCERN_LABELS[c]).join(', ')}
            />
          ) : null}
        </View>

        {profile.ethics.length > 0 || profile.avoid.length > 0 ? (
          <View style={styles.badges}>
            {profile.ethics.map((flag) => (
              <Badge key={flag} label={flag} tone="positive" />
            ))}
            {profile.avoid.map((allergen) => (
              <Badge key={allergen} label={`no ${allergen}`} tone="warning" />
            ))}
          </View>
        ) : null}

        <Button
          label="Retake the quiz"
          icon="refresh-outline"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/onboarding/quiz')}
          style={{ marginTop: 14 }}
        />
      </Card>

      {/* ------------------------------ Appearance ---------------------------- */}
      <Card>
        <AppText variant="heading">Appearance</AppText>
        <View style={styles.optionRow}>
          {(['system', 'light', 'dark'] as const).map((option) => (
            <FilterChip
              key={option}
              label={titleCase(option)}
              selected={settings.theme === option}
              onPress={() => void updateSettings({ theme: option })}
            />
          ))}
        </View>
      </Card>

      {/* -------------------------------- Advisor ----------------------------- */}
      <Card>
        <AppText variant="heading">Beauty advisor</AppText>
        <AppText variant="caption" muted style={styles.blurb}>
          Everything in Glowmatch works without this. Turning it on adds natural-language input
          and a chat advisor, both powered by Claude.
        </AppText>

        <View style={styles.optionRow}>
          <FilterChip
            label="Off"
            selected={settings.aiMode === 'off'}
            onPress={() => void updateSettings({ aiMode: 'off' })}
          />
          <FilterChip
            label="My own key"
            selected={settings.aiMode === 'byo-key'}
            onPress={() => void updateSettings({ aiMode: 'byo-key' })}
          />
          {hasProxy ? (
            <FilterChip
              label="Hosted"
              selected={settings.aiMode === 'proxy'}
              onPress={() => void updateSettings({ aiMode: 'proxy' })}
            />
          ) : null}
        </View>

        {settings.aiMode === 'byo-key' ? (
          <View style={styles.keyBlock}>
            <Divider />
            {apiKey ? (
              <View style={styles.keyRow}>
                <Ionicons name="key" size={16} color={theme.colors.success} />
                <AppText variant="caption" style={{ flex: 1 }}>
                  Key saved ({mask(apiKey)})
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove saved API key"
                  onPress={() => void setApiKey(undefined)}>
                  <AppText variant="caption" color={theme.colors.danger}>
                    Remove
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  accessibilityLabel="Anthropic API key"
                  value={keyDraft}
                  onChangeText={setKeyDraft}
                  placeholder="sk-ant-…"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    },
                  ]}
                />
                <Button
                  label="Save key"
                  variant="secondary"
                  fullWidth
                  disabled={keyDraft.trim().length < 10}
                  onPress={() => {
                    void setApiKey(keyDraft);
                    setKeyDraft('');
                  }}
                />
                <AppText variant="caption" muted style={styles.keyNote}>
                  {Platform.OS === 'web'
                    ? 'On the web build there is no device keychain, so the key is stored in browser storage. Use the hosted option for anything shared.'
                    : 'Stored in your device keychain and sent only to Anthropic. Never shared with us.'}
                </AppText>
              </>
            )}
          </View>
        ) : null}

        {settings.aiMode !== 'off' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              void updateSettings({ aiExplanations: !settings.aiExplanations } as Partial<AppSettings>)
            }
            style={styles.toggleRow}>
            <AppText variant="body" style={{ flex: 1 }}>
              Rewrite match reasons
            </AppText>
            <Ionicons
              name={settings.aiExplanations ? 'toggle' : 'toggle-outline'}
              size={26}
              color={settings.aiExplanations ? theme.colors.primary : theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </Card>

      {/* --------------------------------- Data ------------------------------- */}
      <Card>
        <AppText variant="heading">Your data</AppText>
        <AppText variant="caption" muted style={styles.blurb}>
          Your answers and saved products live on this device only. Nothing is uploaded, and
          there is no account to create.
        </AppText>
        <Button label="Start over" variant="danger" fullWidth onPress={confirmReset} />
      </Card>

      <AppText variant="caption" muted style={styles.disclaimer}>
        Glowmatch offers cosmetic guidance, not medical advice. For persistent acne, a painful or
        spreading rash, hair loss, or anything that is getting worse, please see a dermatologist.
        Product data is hand-curated, prices are approximate, and we aren&apos;t affiliated with
        any brand listed.
      </AppText>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" muted style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.rowValue}>
        {value}
      </AppText>
    </View>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mask(key: string): string {
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  summary: { marginTop: 10, gap: 7 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowLabel: { width: 108 },
  rowValue: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  optionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  blurb: { marginTop: 6, marginBottom: 12, lineHeight: 19 },
  keyBlock: { marginTop: 14, gap: 12 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keyNote: { lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  disclaimer: { lineHeight: 18, paddingHorizontal: 4 },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIES, CATEGORY_LABELS } from '@core/types/enums';
import { useAppStore } from '@/store/useAppStore';
import { AppText, Button, Chip } from '@/ui/components';
import { iconForCategory } from '@/ui/productMeta';
import { useTheme } from '@/ui/theme';

const BLURBS: Record<string, string> = {
  skincare: 'Cleansers, serums, moisturisers, SPF',
  makeup: 'Complexion, eyes, lips',
  hair: 'Wash, treat, style',
};

export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const interests = useAppStore((state) => state.profile.interests);
  const updateProfile = useAppStore((state) => state.updateProfile);

  const toggle = (category: (typeof CATEGORIES)[number]) => {
    const next = interests.includes(category)
      ? interests.filter((item) => item !== category)
      : [...interests, category];
    void updateProfile({ interests: next });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
      ]}>
      <View style={[styles.mark, { backgroundColor: theme.colors.primaryMuted }]}>
        <Ionicons name="sparkles" size={30} color={theme.colors.primary} />
      </View>

      <AppText variant="display" accessibilityRole="header">
        Glowmatch
      </AppText>
      <AppText variant="body" muted style={styles.lede}>
        Answer a few questions and we&apos;ll match you with products that actually suit your
        skin, your hair and your budget — and tell you exactly why each one made the list.
      </AppText>

      <AppText variant="heading" style={styles.question}>
        What are you shopping for?
      </AppText>
      <AppText variant="caption" muted style={styles.hint}>
        Pick everything you want recommendations for. You can change this later.
      </AppText>

      <View style={styles.options}>
        {CATEGORIES.map((category) => (
          <Chip
            key={category}
            label={CATEGORY_LABELS[category]}
            hint={BLURBS[category]}
            icon={iconForCategory(category)}
            selected={interests.includes(category)}
            onPress={() => toggle(category)}
          />
        ))}
      </View>

      <Button
        label="Start the quiz"
        icon="arrow-forward"
        fullWidth
        disabled={interests.length === 0}
        onPress={() => router.push('/onboarding/quiz')}
        style={styles.cta}
      />

      <AppText variant="caption" muted style={styles.disclaimer}>
        Glowmatch offers cosmetic guidance, not medical advice. Product details are curated by
        hand and prices are approximate. We aren&apos;t affiliated with any brand listed.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 4 },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lede: { marginTop: 10, lineHeight: 22 },
  question: { marginTop: 36 },
  hint: { marginTop: 4, marginBottom: 16 },
  options: { gap: 0 },
  cta: { marginTop: 20 },
  disclaimer: { marginTop: 24, lineHeight: 18 },
});

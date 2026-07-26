import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { recommend } from '@core/engine/recommend';
import { summariseExclusions } from '@core/engine/filters';
import { CATEGORY_LABELS } from '@core/types/enums';
import type { Category } from '@core/types/enums';
import { useAppStore } from '@/store/useAppStore';
import { AppText, Card, EmptyState, FilterChip, ChipRow } from '@/ui/components';
import { ProductCard } from '@/ui/ProductCard';
import { useTheme } from '@/ui/theme';

const RULE_LABELS: Record<string, string> = {
  allergen: 'ingredients you avoid',
  ethics: 'your values filters',
  budget: 'your budget',
};

export default function ForYou() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const products = useAppStore((state) => state.products);
  const profile = useAppStore((state) => state.profile);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  const [active, setActive] = useState<Category>(profile.interests[0] ?? 'skincare');

  const result = useMemo(
    () => recommend(products, profile, { category: active, limit: 24 }),
    [products, profile, active]
  );

  const hidden = useMemo(() => summariseExclusions(result.excluded), [result.excluded]);
  const hiddenTotal = Object.values(hidden).reduce((sum, count) => sum + count, 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <AppText variant="display" accessibilityRole="header">
            For you
          </AppText>
          <AppText variant="caption" muted style={{ marginTop: 2 }}>
            {result.recommendations.length} matches from {result.consideredCount} products
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the beauty advisor"
          onPress={() => router.push('/advisor')}
          style={({ pressed }) => [
            styles.advisorButton,
            { backgroundColor: theme.colors.primaryMuted, opacity: pressed ? 0.8 : 1 },
          ]}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </View>

      {profile.interests.length > 1 ? (
        <ChipRow>
          {profile.interests.map((category) => (
            <FilterChip
              key={category}
              label={CATEGORY_LABELS[category]}
              selected={active === category}
              onPress={() => setActive(category)}
            />
          ))}
        </ChipRow>
      ) : null}

      {hiddenTotal > 0 ? (
        <Card style={styles.notice}>
          <View style={styles.noticeRow}>
            <Ionicons name="funnel-outline" size={16} color={theme.colors.textMuted} />
            <AppText variant="caption" muted style={{ flex: 1 }}>
              {hiddenTotal} product{hiddenTotal === 1 ? '' : 's'} hidden by{' '}
              {joinNaturally(Object.keys(hidden).map((rule) => RULE_LABELS[rule] ?? rule))}.
            </AppText>
          </View>
        </Card>
      ) : null}

      <View style={styles.list}>
        {result.recommendations.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Nothing matched"
            message="Your filters are ruling everything out. Loosening the budget or the ingredients you avoid will open things up."
            action={{ label: 'Edit your answers', onPress: () => router.push('/(tabs)/profile') }}
          />
        ) : (
          result.recommendations.map((recommendation) => (
            <ProductCard
              key={recommendation.product.id}
              product={recommendation.product}
              recommendation={recommendation}
              isFavorite={favorites.includes(recommendation.product.id)}
              onPress={() => router.push(`/product/${recommendation.product.id}`)}
              onToggleFavorite={() => void toggleFavorite(recommendation.product.id)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

/** "a", "a and b", "a, b and c" — never "a and b and c". */
function joinNaturally(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  advisorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { paddingVertical: 10 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { marginTop: 2 },
});

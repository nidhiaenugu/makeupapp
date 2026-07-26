import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { AppText, EmptyState } from '@/ui/components';
import { ProductCard } from '@/ui/ProductCard';
import { formatPrice } from '@/ui/productMeta';
import { useTheme } from '@/ui/theme';

export default function Favorites() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const products = useAppStore((state) => state.products);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  // Ordered by when they were saved, most recent first.
  const saved = useMemo(
    () =>
      [...favorites]
        .reverse()
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is NonNullable<typeof product> => !!product),
    [favorites, products]
  );

  const total = saved.reduce((sum, product) => sum + product.priceUsd, 0);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}>
      <View>
        <AppText variant="display" accessibilityRole="header">
          Saved
        </AppText>
        {saved.length > 0 ? (
          <AppText variant="caption" muted style={{ marginTop: 2 }}>
            {saved.length} product{saved.length === 1 ? '' : 's'} ·{' '}
            {formatPrice(Math.round(total * 100) / 100)} in total
          </AppText>
        ) : null}
      </View>

      {saved.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Nothing saved yet"
          message="Tap the heart on any product to keep it here. Your list stays on this device."
          action={{ label: 'Browse products', onPress: () => router.push('/(tabs)/discover') }}
        />
      ) : (
        <View style={styles.list}>
          {saved.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite
              onPress={() => router.push(`/product/${product.id}`)}
              onToggleFavorite={() => void toggleFavorite(product.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  list: { marginTop: 2 },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIES, CATEGORY_LABELS, PRICE_TIERS, PRICE_TIER_LABELS } from '@core/types/enums';
import type { Category, PriceTier } from '@core/types/enums';
import type { Product } from '@core/types/product';
import { useAppStore } from '@/store/useAppStore';
import { AppText, ChipRow, EmptyState, FilterChip } from '@/ui/components';
import { ProductCard } from '@/ui/ProductCard';
import { useTheme } from '@/ui/theme';

export default function Discover() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const products = useAppStore((state) => state.products);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | undefined>();
  const [tier, setTier] = useState<PriceTier | undefined>();

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category !== category) return false;
      if (tier && product.priceTier !== tier) return false;
      if (!needle) return true;
      return matches(product, needle);
    });
  }, [products, search, category, tier]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <AppText variant="display" accessibilityRole="header">
          Discover
        </AppText>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}>
          <Ionicons name="search" size={17} color={theme.colors.textMuted} />
          <TextInput
            accessibilityLabel="Search products"
            value={search}
            onChangeText={setSearch}
            placeholder="Brand, product, or ingredient"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.text }]}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <ChipRow>
          {CATEGORIES.map((item) => (
            <FilterChip
              key={item}
              label={CATEGORY_LABELS[item]}
              selected={category === item}
              onPress={() => setCategory(category === item ? undefined : item)}
            />
          ))}
          {PRICE_TIERS.map((item) => (
            <FilterChip
              key={item}
              label={PRICE_TIER_LABELS[item]}
              selected={tier === item}
              onPress={() => setTier(tier === item ? undefined : item)}
            />
          ))}
        </ChipRow>

        <AppText variant="caption" muted>
          {results.length} product{results.length === 1 ? '' : 's'}
        </AppText>
      </View>

      <FlatList
        data={results}
        keyExtractor={(product) => product.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No products found"
            message="Try a different search term, or clear the filters above."
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            isFavorite={favorites.includes(item.id)}
            onPress={() => router.push(`/product/${item.id}`)}
            onToggleFavorite={() => void toggleFavorite(item.id)}
          />
        )}
      />
    </View>
  );
}

function matches(product: Product, needle: string): boolean {
  return [
    product.brand,
    product.name,
    product.subcategory,
    product.description,
    ...product.benefits,
    ...product.keyIngredients,
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
});

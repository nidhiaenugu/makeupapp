import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { recommend } from '@core/engine/recommend';
import { ALLERGEN_LABELS } from '@core/types/enums';
import { useAiProvider } from '@/store/useAiProvider';
import { useAppStore } from '@/store/useAppStore';
import {
  AppText,
  Badge,
  Card,
  Divider,
  EmptyState,
  ProductTile,
} from '@/ui/components';
import { FavoriteButton, MatchScore, ProductCard } from '@/ui/ProductCard';
import { formatPrice, iconForProduct, labelForSubcategory } from '@/ui/productMeta';
import { useTheme, withAlpha } from '@/ui/theme';

export default function ProductDetail() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ai = useAiProvider();

  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useAppStore((state) => state.products);
  const profile = useAppStore((state) => state.profile);
  const favorites = useAppStore((state) => state.favorites);
  const settings = useAppStore((state) => state.settings);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  const product = products.find((item) => item.id === id);

  // Scoring one product is the same call as scoring the catalog, restricted to
  // this product — so the detail page can never disagree with the list.
  const recommendation = useMemo(() => {
    if (!product) return undefined;
    return recommend([product], profile, {
      diversify: false,
      applyThreshold: false,
      limit: 1,
    }).recommendations[0];
  }, [product, profile]);

  const alternatives = useMemo(() => {
    if (!product) return [];
    return recommend(products, profile, {
      category: product.category,
      subcategories: [product.subcategory],
      excludeIds: [product.id],
      limit: 3,
      applyThreshold: false,
    }).recommendations;
  }, [products, profile, product]);

  // Keyed by product id so a stale summary can never be shown against a
  // different product, and so the effect never has to clear state synchronously.
  const [explained, setExplained] = useState<{ productId: string; text: string }>();
  const wantsExplanation = ai.available && settings.aiExplanations;
  const aiSummary =
    wantsExplanation && explained && explained.productId === product?.id
      ? explained.text
      : undefined;

  useEffect(() => {
    if (!recommendation || !wantsExplanation) return;
    let cancelled = false;
    // Explanations are decoration: a failure leaves the engine's own reasons
    // showing rather than surfacing an error.
    ai.explain(recommendation, profile)
      .then((text) => {
        if (!cancelled && text) {
          setExplained({ productId: recommendation.product.id, text });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [recommendation, ai, profile, wantsExplanation]);

  if (!product) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Product not found"
        message="That product isn't in the catalog any more."
        action={{ label: 'Back to Discover', onPress: () => router.replace('/(tabs)/discover') }}
      />
    );
  }

  const isFavorite = favorites.includes(product.id);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.hero}>
        <ProductTile
          accentColor={product.accentColor}
          icon={iconForProduct(product.category, product.subcategory)}
          size={84}
          label={`${product.brand} ${product.name}`}
        />
        <View style={styles.heroBody}>
          <AppText variant="micro" muted>
            {product.brand.toUpperCase()}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {product.name}
          </AppText>
          <View style={styles.heroMeta}>
            <AppText variant="caption" muted>
              {labelForSubcategory(product.subcategory)}
            </AppText>
            <AppText variant="caption" muted>
              ·
            </AppText>
            <AppText variant="bodyStrong">{formatPrice(product.priceUsd)}</AppText>
            {product.size ? (
              <AppText variant="caption" muted>
                {product.size}
              </AppText>
            ) : null}
          </View>
        </View>
        <FavoriteButton
          active={isFavorite}
          onPress={() => void toggleFavorite(product.id)}
          productName={product.name}
        />
      </View>

      <View style={styles.ratingRow}>
        <Ionicons name="star" size={14} color={theme.colors.warning} />
        <AppText variant="caption" muted>
          {product.rating.toFixed(1)} from {product.reviewCount.toLocaleString()} reviews
        </AppText>
        {recommendation ? <MatchScore score={recommendation.score} /> : null}
      </View>

      <AppText variant="body" style={styles.description}>
        {product.description}
      </AppText>

      {recommendation && recommendation.reasons.length > 0 ? (
        <Card>
          <AppText variant="heading">Why this suits you</AppText>
          {aiSummary ? (
            <AppText variant="body" style={styles.aiSummary}>
              {aiSummary}
            </AppText>
          ) : null}
          <View style={styles.reasons}>
            {recommendation.reasons.map((reason) => (
              <View key={reason} style={styles.reasonRow}>
                <Ionicons name="checkmark-circle" size={15} color={theme.colors.success} />
                <AppText variant="caption" style={{ flex: 1 }}>
                  {reason}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {recommendation && recommendation.warnings.length > 0 ? (
        <Card style={{ backgroundColor: withAlpha(theme.colors.warning, 0.1), borderColor: 'transparent' }}>
          <AppText variant="heading">Worth knowing</AppText>
          <View style={styles.reasons}>
            {recommendation.warnings.map((warning) => (
              <View key={warning} style={styles.reasonRow}>
                <Ionicons name="alert-circle" size={15} color={theme.colors.warning} />
                <AppText variant="caption" style={{ flex: 1 }}>
                  {warning}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">What&apos;s in it</AppText>
        <View style={styles.pillRow}>
          {product.keyIngredients.map((ingredient) => (
            <View
              key={ingredient}
              style={[styles.pill, { backgroundColor: theme.colors.surfaceAlt }]}>
              <AppText variant="caption">{ingredient}</AppText>
            </View>
          ))}
        </View>

        <Divider />

        <AppText variant="bodyStrong" style={styles.subheading}>
          What it does
        </AppText>
        <View style={styles.bulletList}>
          {product.benefits.map((benefit) => (
            <View key={benefit} style={styles.reasonRow}>
              <Ionicons
                name="ellipse"
                size={5}
                color={theme.colors.textMuted}
                style={styles.bullet}
              />
              <AppText variant="caption" style={{ flex: 1 }}>
                {benefit}
              </AppText>
            </View>
          ))}
        </View>

        {product.allergens.length > 0 ? (
          <>
            <Divider />
            <AppText variant="bodyStrong" style={styles.subheading}>
              Contains
            </AppText>
            <View style={styles.badges}>
              {product.allergens.map((allergen) => (
                <Badge key={allergen} label={ALLERGEN_LABELS[allergen]} tone="warning" />
              ))}
            </View>
          </>
        ) : null}

        <Divider />
        <View style={styles.badges}>
          {product.attributes.crueltyFree ? <Badge label="Cruelty-free" tone="positive" /> : null}
          {product.attributes.vegan ? <Badge label="Vegan" tone="positive" /> : null}
          {product.attributes.fragranceFree ? <Badge label="Fragrance-free" tone="positive" /> : null}
          {product.attributes.nonComedogenic ? <Badge label="Non-comedogenic" /> : null}
          {product.attributes.sulfateFree ? <Badge label="Sulfate-free" /> : null}
          {product.attributes.siliconeFree ? <Badge label="Silicone-free" /> : null}
          {product.attributes.reefSafe ? <Badge label="Reef-safe" /> : null}
        </View>
      </Card>

      {product.shadeRange ? (
        <Card>
          <AppText variant="heading">Shade range</AppText>
          <AppText variant="caption" muted style={{ marginTop: 4 }}>
            {product.shadeRange.count} shades covering {product.shadeRange.undertones.join(', ')}{' '}
            undertones.
          </AppText>
        </Card>
      ) : null}

      {alternatives.length > 0 ? (
        <View>
          <AppText variant="heading" style={styles.altHeading}>
            Similar options
          </AppText>
          {alternatives.map((alternative) => (
            <ProductCard
              key={alternative.product.id}
              product={alternative.product}
              recommendation={alternative}
              compact
              isFavorite={favorites.includes(alternative.product.id)}
              onPress={() => router.push(`/product/${alternative.product.id}`)}
              onToggleFavorite={() => void toggleFavorite(alternative.product.id)}
            />
          ))}
        </View>
      ) : null}

      <AppText variant="caption" muted style={styles.disclaimer}>
        Details are hand-curated and prices are approximate. Always patch test, and check the
        full ingredient list on the packaging if you have allergies.
      </AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14, paddingTop: 4 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroBody: { flex: 1, gap: 2 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  description: { lineHeight: 22 },
  aiSummary: { marginTop: 8, lineHeight: 21, fontStyle: 'italic' },
  reasons: { marginTop: 10, gap: 8 },
  reasonRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletList: { gap: 6, marginBottom: 2 },
  // Nudges the tiny bullet down onto the first line's baseline.
  bullet: { marginTop: 6 },
  subheading: { marginBottom: 8, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  altHeading: { marginBottom: 10 },
  disclaimer: { lineHeight: 18, marginTop: 4 },
});

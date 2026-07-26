import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Product } from '@core/types/product';
import type { Recommendation } from '@core/types/recommendation';
import { AppText, Badge, Card, ProductTile } from './components';
import { formatPrice, iconForProduct, labelForSubcategory } from './productMeta';
import { useTheme, withAlpha } from './theme';

export function MatchScore({ score }: { score: number }) {
  const theme = useTheme();
  const tone =
    score >= 75 ? theme.colors.success : score >= 55 ? theme.colors.primary : theme.colors.textMuted;
  return (
    <View
      accessibilityLabel={`${score} percent match`}
      style={[styles.score, { backgroundColor: withAlpha(tone, theme.dark ? 0.24 : 0.12) }]}>
      <AppText variant="micro" color={tone}>
        {score}% MATCH
      </AppText>
    </View>
  );
}

export function FavoriteButton({
  active,
  onPress,
  productName,
}: {
  active: boolean;
  onPress: () => void;
  productName: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={
        active ? `Remove ${productName} from favourites` : `Save ${productName} to favourites`
      }
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Ionicons
        name={active ? 'heart' : 'heart-outline'}
        size={22}
        color={active ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
}

/**
 * The main product card, used on For You, Discover, Favourites and Routine.
 *
 * When a `Recommendation` is passed it shows the match score and the top
 * reason; given a bare `Product` it degrades to a plain catalog card, which is
 * what Discover needs when browsing without a profile.
 */
export function ProductCard({
  product,
  recommendation,
  isFavorite,
  onPress,
  onToggleFavorite,
  compact,
}: {
  product: Product;
  recommendation?: Recommendation;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  const topReason = recommendation?.reasons[0];

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${product.brand} ${product.name}, ${formatPrice(product.priceUsd)}`}
      style={{ marginBottom: theme.spacing.md }}>
      <View style={styles.row}>
        <ProductTile
          accentColor={product.accentColor}
          icon={iconForProduct(product.category, product.subcategory)}
          size={compact ? 46 : 56}
        />

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <AppText variant="micro" muted>
              {product.brand.toUpperCase()}
            </AppText>
            <FavoriteButton
              active={isFavorite}
              onPress={onToggleFavorite}
              productName={product.name}
            />
          </View>

          <AppText variant="bodyStrong" numberOfLines={2}>
            {product.name}
          </AppText>

          <View style={styles.metaRow}>
            <AppText variant="caption" muted>
              {labelForSubcategory(product.subcategory)}
            </AppText>
            <AppText variant="caption" muted>
              ·
            </AppText>
            <AppText variant="caption" muted>
              {formatPrice(product.priceUsd)}
            </AppText>
            <AppText variant="caption" muted>
              ·
            </AppText>
            <Ionicons name="star" size={11} color={theme.colors.warning} />
            <AppText variant="caption" muted>
              {product.rating.toFixed(1)}
            </AppText>
          </View>

          {recommendation ? (
            <View style={styles.recommendationBlock}>
              <MatchScore score={recommendation.score} />
              {topReason && !compact ? (
                <AppText variant="caption" numberOfLines={2} style={styles.reason}>
                  {topReason}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {!compact && recommendation?.warnings.length ? (
            <View style={styles.warningRow}>
              <Ionicons name="alert-circle-outline" size={13} color={theme.colors.warning} />
              <AppText variant="caption" color={theme.colors.warning} numberOfLines={1}>
                {recommendation.warnings[0]}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {!compact ? (
        <View style={styles.badges}>
          {product.attributes.crueltyFree ? <Badge label="Cruelty-free" tone="positive" /> : null}
          {product.attributes.vegan ? <Badge label="Vegan" tone="positive" /> : null}
          {product.attributes.fragranceFree ? <Badge label="Fragrance-free" /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  body: { flex: 1, gap: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  recommendationBlock: { marginTop: 6, gap: 5 },
  reason: { lineHeight: 18 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  score: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
});

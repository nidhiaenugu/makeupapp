import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildAllRoutines } from '@core/engine/routine';
import type { Routine } from '@core/types/recommendation';
import { useAppStore } from '@/store/useAppStore';
import {
  AppText,
  Card,
  ChipRow,
  EmptyState,
  FilterChip,
  ProductTile,
} from '@/ui/components';
import { MatchScore } from '@/ui/ProductCard';
import { formatPrice, iconForProduct, labelForSubcategory } from '@/ui/productMeta';
import { useTheme, withAlpha } from '@/ui/theme';

export default function RoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const products = useAppStore((state) => state.products);
  const profile = useAppStore((state) => state.profile);

  const routines = useMemo(() => buildAllRoutines(products, profile), [products, profile]);
  const [activeId, setActiveId] = useState(routines[0]?.id);
  const routine = routines.find((item) => item.id === activeId) ?? routines[0];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}>
      <AppText variant="display" accessibilityRole="header">
        Your routine
      </AppText>

      {routines.length === 0 || !routine ? (
        <EmptyState
          icon="list-outline"
          title="No routine yet"
          message="Once you've told us what you're shopping for, we'll build an ordered routine from your best matches."
          action={{ label: 'Edit your answers', onPress: () => router.push('/(tabs)/profile') }}
        />
      ) : (
        <>
          {routines.length > 1 ? (
            <ChipRow>
              {routines.map((item) => (
                <FilterChip
                  key={item.id}
                  label={item.title}
                  selected={routine.id === item.id}
                  onPress={() => setActiveId(item.id)}
                />
              ))}
            </ChipRow>
          ) : null}

          <RoutineDetail routine={routine} onOpen={(id) => router.push(`/product/${id}`)} />
        </>
      )}
    </ScrollView>
  );
}

function RoutineDetail({
  routine,
  onOpen,
}: {
  routine: Routine;
  onOpen: (productId: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.routine}>
      <View>
        <AppText variant="title">{routine.title}</AppText>
        <AppText variant="caption" muted style={{ marginTop: 2 }}>
          {routine.subtitle} · {formatPrice(routine.totalPriceUsd)} in total
        </AppText>
      </View>

      {routine.warnings.map((warning) => (
        <Card
          key={warning}
          style={{ backgroundColor: withAlpha(theme.colors.warning, 0.12), borderColor: 'transparent' }}>
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.warning} />
            <AppText variant="caption" color={theme.colors.warning} style={{ flex: 1 }}>
              {warning}
            </AppText>
          </View>
        </Card>
      ))}

      {routine.steps.map((step) => {
        const { product } = step.recommendation;
        return (
          <Card
            key={step.recommendation.product.id}
            onPress={() => onOpen(product.id)}
            accessibilityLabel={`Step ${step.order}, ${step.label}: ${product.brand} ${product.name}`}>
            <View style={styles.stepRow}>
              <View
                style={[styles.stepNumber, { backgroundColor: theme.colors.primaryMuted }]}>
                <AppText variant="micro" color={theme.colors.primary}>
                  {step.order}
                </AppText>
              </View>

              <ProductTile
                accentColor={product.accentColor}
                icon={iconForProduct(product.category, product.subcategory)}
                size={44}
              />

              <View style={styles.stepBody}>
                <AppText variant="micro" muted>
                  {step.label.toUpperCase()} · {labelForSubcategory(product.subcategory)}
                </AppText>
                <AppText variant="bodyStrong" numberOfLines={2}>
                  {product.brand} {product.name}
                </AppText>
                <View style={styles.stepMeta}>
                  <MatchScore score={step.recommendation.score} />
                  <AppText variant="caption" muted>
                    {formatPrice(product.priceUsd)}
                  </AppText>
                </View>
              </View>
            </View>

            {step.notes.map((note) => (
              <View key={note} style={styles.noteRow}>
                <Ionicons name="information-circle-outline" size={13} color={theme.colors.accent} />
                <AppText variant="caption" color={theme.colors.accent} style={{ flex: 1 }}>
                  {note}
                </AppText>
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 14 },
  routine: { gap: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBody: { flex: 1, gap: 2 },
  stepMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  noteRow: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'flex-start' },
  warningRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});

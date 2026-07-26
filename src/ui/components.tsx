import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { contrastingText, useTheme, withAlpha } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/* -------------------------------- Typography ------------------------------- */

type TextVariant = keyof ReturnType<typeof useTheme>['typography'];

export function AppText({
  children,
  variant = 'body',
  muted,
  color,
  style,
  numberOfLines,
  accessibilityRole,
}: {
  children: ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
}) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole={accessibilityRole}
      numberOfLines={numberOfLines}
      style={[
        theme.typography[variant],
        { color: color ?? (muted ? theme.colors.textMuted : theme.colors.text) },
        style,
      ]}>
      {children}
    </Text>
  );
}

/* --------------------------------- Button --------------------------------- */

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: theme.colors.primary, fg: theme.colors.primaryText, border: 'transparent' },
    secondary: { bg: theme.colors.surface, fg: theme.colors.text, border: theme.colors.border },
    ghost: { bg: 'transparent', fg: theme.colors.primary, border: 'transparent' },
    danger: { bg: 'transparent', fg: theme.colors.danger, border: theme.colors.border },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={17} color={palette.fg} /> : null}
          <Text style={[theme.typography.bodyStrong, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ---------------------------------- Chip ---------------------------------- */

export function Chip({
  label,
  hint,
  selected,
  onPress,
  icon,
}: {
  label: string;
  hint?: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const theme = useTheme();
  const interactive = !!onPress;

  return (
    <Pressable
      accessibilityRole={interactive ? 'checkbox' : 'text'}
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.85 : 1,
          paddingVertical: hint ? theme.spacing.md : theme.spacing.sm,
        },
      ]}>
      <View style={styles.chipRow}>
        {icon ? (
          <Ionicons
            name={icon}
            size={16}
            color={selected ? theme.colors.primary : theme.colors.textMuted}
          />
        ) : null}
        <View style={styles.chipTextBlock}>
          <Text
            style={[
              theme.typography.bodyStrong,
              { color: selected ? theme.colors.primary : theme.colors.text },
            ]}>
            {label}
          </Text>
          {hint ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {hint}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
        ) : null}
      </View>
    </Pressable>
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        style,
      ]}>
      {children}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {content}
    </Pressable>
  );
}

/* --------------------------------- Badges --------------------------------- */

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'brand';
}) {
  const theme = useTheme();
  const color = {
    neutral: theme.colors.textMuted,
    positive: theme.colors.success,
    warning: theme.colors.warning,
    brand: theme.colors.primary,
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, theme.dark ? 0.22 : 0.12) }]}>
      <Text style={[theme.typography.micro, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

/**
 * The stand-in for a product photo.
 *
 * We deliberately don't hotlink brand imagery, so each product gets a tile
 * derived from its own accent colour plus a category icon. It's recognisable
 * per brand and costs nothing to load.
 */
export function ProductTile({
  accentColor,
  icon,
  size = 56,
  label,
}: {
  accentColor: string;
  icon: IconName;
  size?: number;
  label?: string;
}) {
  const foreground = contrastingText(accentColor);
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.tile,
        { backgroundColor: accentColor, width: size, height: size, borderRadius: size / 4 },
      ]}>
      <Ionicons name={icon} size={size * 0.45} color={foreground} />
    </View>
  );
}

/* -------------------------------- Feedback -------------------------------- */

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={theme.colors.textMuted} />
      </View>
      <AppText variant="heading" style={styles.emptyTitle}>
        {title}
      </AppText>
      <AppText variant="caption" muted style={styles.emptyMessage}>
        {message}
      </AppText>
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={{ marginTop: 16 }} />
      ) : null}
    </View>
  );
}

export function LoadingScreen({ message = 'Getting things ready…' }: { message?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText variant="caption" muted style={{ marginTop: 12 }}>
        {message}
      </AppText>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action ? <Button label={action.label} onPress={action.onPress} variant="ghost" /> : null}
    </View>
  );
}

/** A horizontally scrolling row of filter chips. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRowScroll}>
      {children}
    </ScrollView>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Text
        style={[
          theme.typography.caption,
          { color: selected ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 46,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chipTextBlock: { flex: 1, gap: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  tile: { alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { textAlign: 'center' },
  emptyMessage: { textAlign: 'center', marginTop: 6, lineHeight: 19 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderText: { flex: 1 },
  chipRowScroll: { gap: 8, paddingVertical: 4, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});

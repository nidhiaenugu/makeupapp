import { useColorScheme } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryMuted: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
}

const light: ThemeColors = {
  background: '#FDF7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F6EEF2',
  border: '#E8DCE3',
  text: '#1F1218',
  textMuted: '#7A6A72',
  textInverse: '#FFFFFF',
  primary: '#B4356B',
  primaryMuted: '#F7E4EC',
  primaryText: '#FFFFFF',
  accent: '#2E7D8F',
  success: '#2F7D4F',
  warning: '#9A6014',
  danger: '#B3261E',
  overlay: 'rgba(31, 18, 24, 0.45)',
};

const dark: ThemeColors = {
  background: '#141017',
  surface: '#1E1822',
  surfaceAlt: '#282030',
  border: '#3A3043',
  text: '#F6EFF3',
  textMuted: '#A99DA8',
  textInverse: '#1F1218',
  primary: '#F08FB4',
  primaryMuted: '#3A2230',
  primaryText: '#2A0F1C',
  accent: '#79C9DA',
  success: '#7FC79B',
  warning: '#E3B15F',
  danger: '#F2A2A0',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

/**
 * Resolves the active theme from the user's preference, falling back to the
 * OS setting when they have chosen "system".
 */
export function useTheme(): Theme {
  const preference = useAppStore((state) => state.settings.theme);
  const system = useColorScheme();
  const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return {
    colors: isDark ? dark : light,
    dark: isDark,
    spacing,
    radius,
    typography,
  };
}

/** Readable text colour for an arbitrary background — used for brand tiles. */
export function contrastingText(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1F1218' : '#FFFFFF';
}

/** A translucent variant of a hex colour, for tinted backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

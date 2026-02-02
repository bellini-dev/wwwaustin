/**
 * Bright blue theme – modern, sleek, minimalist
 */

import { Platform } from 'react-native';

// Bright blue palette
export const Blue = {
  primary: '#0066FF',
  primaryLight: '#3385FF',
  primaryDark: '#0052CC',
  background: '#F0F6FF',
  surface: '#FFFFFF',
  text: '#0D1B2A',
  textSecondary: '#5C6B7A',
  border: '#E2E8F0',
  success: '#10B981',
  muted: '#94A3B8',
};

export const Colors = {
  light: {
    text: Blue.text,
    textSecondary: Blue.textSecondary,
    background: Blue.background,
    surface: Blue.surface,
    tint: Blue.primary,
    icon: Blue.textSecondary,
    tabIconDefault: Blue.muted,
    tabIconSelected: Blue.primary,
    border: Blue.border,
    primary: Blue.primary,
    primaryLight: Blue.primaryLight,
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    tint: Blue.primaryLight,
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: Blue.primaryLight,
    border: '#334155',
    primary: Blue.primaryLight,
    primaryLight: '#60A5FA',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

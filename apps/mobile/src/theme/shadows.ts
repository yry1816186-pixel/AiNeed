import { Platform } from 'react-native';

export const ShadowPresets = {
  none: {},
  xs: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
  }),
  sm: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
    },
    android: { elevation: 12 },
  }),
} as const;

export const GlowPresets = {
  primary: Platform.select({
    ios: {
      shadowColor: '#1A1A2E',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: { elevation: 10 },
  }),
  rose: Platform.select({
    ios: {
      shadowColor: '#E94560',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: { elevation: 10 },
  }),
  gold: Platform.select({
    ios: {
      shadowColor: '#D4A853',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
  }),
} as const;

export const GlassPresets = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  medium: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  dark: {
    backgroundColor: 'rgba(26, 26, 46, 0.55)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.20,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
} as const;

export const shadows = {
  presets: ShadowPresets,
  glows: GlowPresets,
  glass: GlassPresets,
};

export type XunOShadows = typeof shadows;

export default shadows;

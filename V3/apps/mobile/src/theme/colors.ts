export const colors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundCard: '#FFFFFF',

  primary: '#1A1A2E',
  primaryLight: '#2D2D44',

  accent: '#E94560',
  accentLight: '#FF6B81',
  accentDark: '#C73E54',

  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#B0B0B0',
  textInverse: '#FFFFFF',

  divider: '#E8E8E8',
  border: '#D1D1D1',

  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E8E8E8',
  gray300: '#D1D1D1',
  gray400: '#B0B0B0',
  gray500: '#999999',
  gray600: '#666666',
  gray700: '#444444',
  gray800: '#333333',
  gray900: '#1A1A1A',
  black: '#000000',

  success: '#4CAF50',
  successLight: '#81C784',
  successDark: '#388E3C',
  warning: '#FF9800',
  warningLight: '#FFB74D',
  warningDark: '#F57C00',
  error: '#F44336',
  errorLight: '#EF5350',
  errorDark: '#D32F2F',
  info: '#2196F3',
  infoLight: '#64B5F6',
  infoDark: '#1976D2',

  gradientPrimary: ['#1A1A2E', '#2D2D44'] as const,
  gradientAccent: ['#E94560', '#FF6B81'] as const,
  gradientWarm: ['#FF9800', '#FF6B81'] as const,
  gradientCool: ['#2196F3', '#1A1A2E'] as const,
} as const;

export type ColorToken = keyof typeof colors;

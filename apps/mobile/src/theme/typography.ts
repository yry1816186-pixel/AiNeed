import { Platform, type TextStyle } from 'react-native';

export const FontFamilies = {
  chinese: Platform.select({
    ios: 'PingFang SC',
    android: 'Noto Sans SC',
    default: 'sans-serif',
  }),
  sans: Platform.select({
    ios: 'SF Pro Display',
    android: 'Roboto',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'SF Mono',
    android: 'Roboto Mono',
    default: 'monospace',
  }),
} as const;

export const FontSizes = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const FontWeights: Record<string, TextStyle['fontWeight']> = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const LineHeights = {
  none: 1,
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 1.8,
} as const;

export const LetterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

export const TextStyles = {
  hero: {
    fontSize: FontSizes['5xl'],
    lineHeight: FontSizes['5xl'] * LineHeights.tight,
    fontWeight: FontWeights.extrabold,
    letterSpacing: LetterSpacing.tighter,
  },
  h1: {
    fontSize: FontSizes['4xl'],
    lineHeight: FontSizes['4xl'] * LineHeights.tight,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontSize: FontSizes['3xl'],
    lineHeight: FontSizes['3xl'] * LineHeights.snug,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.tight,
  },
  h3: {
    fontSize: FontSizes['2xl'],
    lineHeight: FontSizes['2xl'] * LineHeights.snug,
    fontWeight: FontWeights.semibold,
  },
  h4: {
    fontSize: FontSizes.xl,
    lineHeight: FontSizes.xl * LineHeights.normal,
    fontWeight: FontWeights.semibold,
  },
  h5: {
    fontSize: FontSizes.lg,
    lineHeight: FontSizes.lg * LineHeights.normal,
    fontWeight: FontWeights.semibold,
  },
  body: {
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * LineHeights.relaxed,
    fontWeight: FontWeights.regular,
  },
  bodySm: {
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * LineHeights.relaxed,
    fontWeight: FontWeights.regular,
  },
  caption: {
    fontSize: FontSizes.xs,
    lineHeight: FontSizes.xs * LineHeights.normal,
    fontWeight: FontWeights.medium,
    letterSpacing: LetterSpacing.wide,
  },
  overline: {
    fontSize: FontSizes['2xs'],
    lineHeight: FontSizes['2xs'] * LineHeights.normal,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.wider,
  },
  label: {
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * LineHeights.normal,
    fontWeight: FontWeights.medium,
    letterSpacing: LetterSpacing.wide,
  },
  button: {
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * LineHeights.normal,
    fontWeight: FontWeights.semibold,
    letterSpacing: LetterSpacing.wide,
  },
  price: {
    fontSize: FontSizes.xl,
    lineHeight: FontSizes.xl * LineHeights.normal,
    fontWeight: FontWeights.bold,
  },
  priceLg: {
    fontSize: FontSizes['2xl'],
    lineHeight: FontSizes['2xl'] * LineHeights.snug,
    fontWeight: FontWeights.extrabold,
  },
} as const;

export const typography = {
  fontFamily: FontFamilies,
  fontSize: FontSizes,
  fontWeight: FontWeights,
  lineHeight: LineHeights,
  letterSpacing: LetterSpacing,
  styles: TextStyles,
};

export type XunOTypography = typeof typography;

export default typography;

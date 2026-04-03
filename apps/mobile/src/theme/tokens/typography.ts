import { Platform } from "react-native";

export const FontFamilies = {
  sans: Platform.select({
    ios: "SF Pro Display",
    android: "Roboto",
    default: "System",
  }),
  mono: Platform.select({
    ios: "SF Mono",
    android: "Roboto Mono",
    default: "monospace",
  }),
  display: Platform.select({
    ios: "SF Pro Display",
    android: "Roboto",
    default: "System",
  }),
} as const;

export const FontSizes = {
  "2xs": 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  "7xl": 72,
  "8xl": 96,
  hero: 64,
} as const;

export const FontWeights = {
  thin: "100" as const,
  light: "300" as const,
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
  black: "900" as const,
} as const;

export const LineHeights = {
  none: 1,
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const LetterSpacing = {
  tighter: -2,
  tight: -1,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export const TextStyles = {
  hero: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: FontWeights.extrabold,
    letterSpacing: LetterSpacing.tighter,
  },
  h1: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.tight,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: FontWeights.semibold,
    letterSpacing: LetterSpacing.normal,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FontWeights.semibold,
    letterSpacing: LetterSpacing.normal,
  },
  h5: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: FontWeights.semibold,
    letterSpacing: LetterSpacing.normal,
  },
  h6: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeights.semibold,
    letterSpacing: LetterSpacing.normal,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeights.regular,
    letterSpacing: LetterSpacing.normal,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeights.regular,
    letterSpacing: LetterSpacing.normal,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeights.medium,
    letterSpacing: LetterSpacing.wide,
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.widest,
    textTransform: "uppercase" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeights.medium,
    letterSpacing: LetterSpacing.wide,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeights.semibold,
    letterSpacing: LetterSpacing.wide,
  },
  price: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FontWeights.bold,
    letterSpacing: LetterSpacing.normal,
  },
  priceLarge: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: FontWeights.extrabold,
    letterSpacing: LetterSpacing.tight,
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

export default typography;

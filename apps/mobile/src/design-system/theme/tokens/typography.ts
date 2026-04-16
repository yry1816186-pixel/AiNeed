import { Platform } from "react-native";

/**
 * 寻裳 字体系统 - 国赛一等奖水准
 *
 * 设计理念：
 * - 中文优先：思源黑体/PingFang SC 保证中文显示质量
 * - 英文优雅：Inter/SF Pro Display 提升英文可读性
 * - 层次清晰：9级字重 + 完整行高/字距系统
 */

export const FontFamilies = {
  // 中文字体（优先使用）
  chinese: Platform.select({
    ios: "PingFang SC", // iOS 中文首选
    android: "Noto Sans SC", // Android 中文首选（需安装）
    default: "sans-serif", // 回退字体
  }),

  // 英文字体
  sans: Platform.select({
    ios: "SF Pro Display", // iOS 系统字体
    android: "Roboto", // Android 系统字体
    default: "System",
  }),

  // 等宽字体（代码/数据）
  mono: Platform.select({
    ios: "SF Mono",
    android: "Roboto Mono",
    default: "monospace",
  }),

  /** @deprecated PlayfairDisplay font not available - use system serif fallback */
  display: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "serif",
  }),

  // 混合字体（中英文混排场景）
  mixed: Platform.select({
    ios: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'SF Pro Display', sans-serif",
    android: "'Noto Sans SC', Roboto, sans-serif",
    default: "system-ui, -apple-system, sans-serif",
  }),
} as const;

// FontSizes aligned with DesignTokens.typography.sizes (DesignTokens is source of truth)
export const FontSizes = {
  "2xs": 10,
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
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
  thin: "100",
  light: "300",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
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

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Dimensions, Platform, StatusBar } from "react-native";
import { DesignTokens, darkTokens } from "./tokens/legacy-map";
import {
  WarmPrimaryColors,
  BrandColors,
  NeutralColors,
  PrimaryColors,
  SecondaryColors,
  GradientPresets,
  SemanticColors,
  FashionColors,
} from "./tokens/colors";
import type { FlatColors, WarmPrimaryPalette, ColorShadePalette } from "./FlatColors";
export { DesignTokens, darkTokens };
export type { DesignTokensType, DarkTokensType } from "./tokens/legacy-map";

export {
  WarmPrimaryColors,
  BrandColors,
  NeutralColors,
  PrimaryColors,
  SecondaryColors,
  GradientPresets,
  SemanticColors,
  FashionColors,
} from "./tokens/colors";
export { default as tokenColors } from "./tokens/colors";
export * from "./tokens/spacing";
export * from "./tokens/typography";
export * from "./tokens/shadows";
export * from "./tokens/animations";
export * from "./tokens/season-colors";
export type { FlatColors } from "./FlatColors";

type TokenSet = typeof DesignTokens;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";

/** Ocean sub-palette (blue tones) */
const oceanPalette: ColorShadePalette = {
  50: "#F0F6FF",
  100: "#DCEAFB",
  200: "#B8D5F7",
  300: "#7DB8F0",
  400: "#4A9BE6",
  500: "#4A90D9",
  600: "#3A7BC2",
  700: "#2D6199",
  800: "#234D7A",
  900: "#1A3A5C",
};

/** Mint sub-palette (green tones) */
const mintPalette: ColorShadePalette = {
  50: "#EDFBF4",
  100: "#D1F5E4",
  200: "#A8EBCD",
  300: "#7EDCB5",
  400: "#5DD4A3",
  500: "#7ED4AD",
  600: "#4DB88A",
  700: "#3A9A72",
  800: "#2D7A5B",
  900: "#1F5C43",
};

/** Coral sub-palette (warm pink/red tones) */
const coralPalette: ColorShadePalette = {
  50: "#FFF1F1",
  100: "#FFE0E0",
  200: "#FFC8C8",
  300: "#FFA8A8",
  400: "#FF9090",
  500: "#FF7F7F",
  600: "#E86666",
  700: "#CC4D4D",
  800: "#A63C3C",
  900: "#802E2E",
};

/** WarmPrimary palette object for light theme */
const warmPrimaryLight: WarmPrimaryPalette = {
  main: "#C67C4E",
  ocean: oceanPalette,
  mint: mintPalette,
  coral: coralPalette,
};

/** WarmPrimary palette object for dark theme */
const warmPrimaryDark: WarmPrimaryPalette = {
  main: "#D68B6C",
  ocean: {
    50: "#1A2536",
    100: "#1F2E42",
    200: "#2A3D56",
    300: "#3A5575",
    400: "#4A6E94",
    500: "#5A88B3",
    600: "#6FA2CC",
    700: "#89B5D6",
    800: "#A3C8E0",
    900: "#BDDBEA",
  },
  mint: {
    50: "#122A1F",
    100: "#163527",
    200: "#1E4A38",
    300: "#2A6650",
    400: "#368268",
    500: "#4A9E84",
    600: "#5EB89C",
    700: "#76CCB2",
    800: "#92DCC6",
    900: "#AEEADA",
  },
  coral: {
    50: "#2D1A1A",
    100: "#3A2020",
    200: "#4D2E2E",
    300: "#664040",
    400: "#805252",
    500: "#996464",
    600: "#B37A7A",
    700: "#CC9494",
    800: "#D9AAAA",
    900: "#E6C0C0",
  },
};

const neutralPalette = {
  0: DesignTokens.colors.neutral.white,
  50: DesignTokens.colors.neutral[50],
  100: DesignTokens.colors.neutral[100],
  200: DesignTokens.colors.neutral[200],
  300: DesignTokens.colors.neutral[300],
  400: DesignTokens.colors.neutral[400],
  500: DesignTokens.colors.neutral[500],
  600: DesignTokens.colors.neutral[600],
  700: DesignTokens.colors.neutral[700],
  800: DesignTokens.colors.neutral[800],
  900: DesignTokens.colors.neutral[900],
  950: DesignTokens.colors.neutral.black,
  white: DesignTokens.colors.neutral.white,
  black: DesignTokens.colors.neutral.black,
} as const;

const gradientPalettes = {
  primary: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  secondary: [...DesignTokens.gradients.sage] as [string, string, ...string[]],
  brand: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  brandSoft: [...DesignTokens.gradients.brandSoft] as [string, string, ...string[]],
  sage: [...DesignTokens.gradients.sage] as [string, string, ...string[]],
  hero: [...DesignTokens.gradients.hero] as [string, string, ...string[]],
  card: [...DesignTokens.gradients.card] as [string, string, ...string[]],
  warm: [...DesignTokens.gradients.warm] as [string, string, ...string[]],
  cool: [...DesignTokens.gradients.cool] as [string, string, ...string[]],
} as const;

export const Colors = {
  brand: DesignTokens.colors.brand,
  neutral: neutralPalette,
  semantic: {
    ...DesignTokens.colors.semantic,
    successDark: DesignTokens.colors.semantic.successDark,
    warningDark: DesignTokens.colors.semantic.warningDark,
    errorDark: DesignTokens.colors.semantic.errorDark,
    like: DesignTokens.colors.semantic.like,
    bookmark: DesignTokens.colors.semantic.bookmark,
    chartGood: DesignTokens.colors.semantic.chartGood,
    chartMedium: DesignTokens.colors.semantic.chartMedium,
    chartPoor: DesignTokens.colors.semantic.chartPoor,
    chartGrid: DesignTokens.colors.semantic.chartGrid,
    skeletonBase: DesignTokens.colors.semantic.skeletonBase,
    warmBlush: DesignTokens.colors.semantic.warmBlush,
    slateMist: DesignTokens.colors.semantic.slateMist,
    goldenGlow: DesignTokens.colors.semantic.goldenGlow,
    sageMist: DesignTokens.colors.semantic.sageMist,
    yellow: DesignTokens.colors.semantic.yellow,
    brown: DesignTokens.colors.semantic.brown,
    wechat: DesignTokens.colors.semantic.wechat,
    weibo: DesignTokens.colors.semantic.weibo,
    qq: DesignTokens.colors.semantic.qq,
    mutedSage: DesignTokens.colors.semantic.mutedSage,
    fashion: DesignTokens.colors.fashion,
  },

  primary: PrimaryColors,

  sage: SecondaryColors,

  success: {
    50: "#F3F9F6",
    100: "#E6F3EC",
    200: "#CCE7D9",
    300: "#A5D4BF",
    400: "#7BBAA2",
    500: DesignTokens.colors.semantic.success,
    600: "#4A705C",
    700: "#3C5A4A",
    800: "#324A3D",
    900: "#2A3E33",
    950: "#162019",
  },

  warning: {
    50: "#FDF9F0",
    100: "#FBF3E1",
    200: "#F7E6C3",
    300: "#F2D49B",
    400: "#EBBE6E",
    500: DesignTokens.colors.semantic.warning,
    600: "#AE8234",
    700: "#8E6A2B",
    800: "#745625",
    900: "#5F4720",
    950: "#332410",
  },

  error: {
    50: "#FBF0EE",
    100: "#F7E1DD",
    200: "#F0C3BC",
    300: "#E59D93",
    400: "#D87264",
    500: DesignTokens.colors.semantic.error,
    600: "#9D372B",
    700: "#802D24",
    800: "#6A261F",
    900: "#58221C",
    950: "#2F110E",
  },

  amber: {
    50: "#FFFBEB",
    100: DesignTokens.colors.semantic.warningLight,
    200: "#FDE68A",
    300: "#FCD34D",
    400: DesignTokens.colors.semantic.warningLight,
    500: DesignTokens.colors.semantic.warning,
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
    950: "#451A03",
  },

  rose: {
    50: "#FFF1F2",
    100: "#FFE4E6",
    200: "#FECDD3",
    300: "#FDA4AF",
    400: "#FB7185",
    500: "#F43F5E",
    600: "#E11D48",
    700: "#BE123D",
    800: "#9F1239",
    900: "#881337",
    950: "#4C0519",
  },

  sky: {
    50: "#F0F9FF",
    100: "#E0F2FE",
    200: "#BAE6FD",
    300: "#7DD3FC",
    400: "#38BDF8",
    500: "#0EA5E9",
    600: "#0284C7",
    700: "#0369A1",
    800: "#075985",
    900: "#0C4A6E",
    950: "#082F49",
  },

  emerald: {
    50: "#ECFDF5",
    100: DesignTokens.colors.semantic.successLight,
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: DesignTokens.colors.semantic.successLight,
    500: DesignTokens.colors.semantic.success,
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
    950: "#022C22",
  },

  // AUXILIARY ONLY: Accent colors are for categorical highlights (tags, charts, status indicators).
  // NEVER use accent colors for primary actions, CTAs, or brand identity.
  // Brand Terracotta (#C67B5C) must be used for all primary actions and brand elements.
  accent: {
    50: "#F5F3FF",
    100: DesignTokens.colors.backgrounds.secondary,
    200: DesignTokens.colors.brand.terracottaLight,
    300: DesignTokens.colors.brand.terracotta,
    400: DesignTokens.colors.brand.terracotta,
    500: DesignTokens.colors.brand.terracottaDark,
    600: DesignTokens.colors.brand.terracottaDark,
    700: DesignTokens.colors.brand.terracottaDark,
    800: DesignTokens.colors.brand.slateDark,
    900: DesignTokens.colors.neutral[800],
    950: "#2E1065",
  },

  white: neutralPalette.white,
  black: neutralPalette.black,
  transparent: "transparent",

  overlay: {
    light: "rgba(255, 255, 255, 0.85)",
    dark: "rgba(0, 0, 0, 0.5)",
    modal: "rgba(0, 0, 0, 0.4)",
  },
  colorSeasons: DesignTokens.colors.colorSeasons,
  gradient: gradientPalettes,
} as const;

export const gradients = gradientPalettes;

export const Typography = {
  fontFamily: DesignTokens.typography.fontFamily,
  sizes: DesignTokens.typography.sizes,
  lineHeights: DesignTokens.typography.lineHeights,
  fontWeights: DesignTokens.typography.fontWeights,
  letterSpacing: DesignTokens.typography.letterSpacing,

  heading: {
    xs: {
      fontSize: DesignTokens.typography.sizes.xs,
      lineHeight: DesignTokens.typography.sizes.xs * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    sm: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight: DesignTokens.typography.sizes.sm * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    md: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight: DesignTokens.typography.sizes.md * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    lg: {
      fontSize: DesignTokens.typography.sizes.lg,
      lineHeight: DesignTokens.typography.sizes.lg * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    xl: {
      fontSize: DesignTokens.typography.sizes.xl,
      lineHeight: DesignTokens.typography.sizes.xl * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
  },

  body: {
    xs: {
      fontSize: DesignTokens.typography.sizes.xs,
      lineHeight: DesignTokens.typography.sizes.xs * DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    sm: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight: DesignTokens.typography.sizes.sm * DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    md: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight: DesignTokens.typography.sizes.md * DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    lg: {
      fontSize: DesignTokens.typography.sizes.lg,
      lineHeight: DesignTokens.typography.sizes.lg * DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
  },

  caption: {
    xs: {
      fontSize: DesignTokens.typography.sizes.xs,
      lineHeight: DesignTokens.typography.sizes.xs * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    sm: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight: DesignTokens.typography.sizes.sm * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    md: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight: DesignTokens.typography.sizes.md * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
  },

  styles: {
    hero: {
      fontSize: DesignTokens.typography.sizes["5xl"],
      lineHeight: DesignTokens.typography.sizes["5xl"] * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.bold,
      letterSpacing: DesignTokens.typography.letterSpacing.tight,
    },
    h1: {
      fontSize: DesignTokens.typography.sizes["4xl"],
      lineHeight: DesignTokens.typography.sizes["4xl"] * DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.bold,
      letterSpacing: DesignTokens.typography.letterSpacing.tight,
    },
    h2: {
      fontSize: DesignTokens.typography.sizes["3xl"],
      lineHeight: DesignTokens.typography.sizes["3xl"] * DesignTokens.typography.lineHeights.snug,
      fontWeight: DesignTokens.typography.fontWeights.bold,
      letterSpacing: DesignTokens.typography.letterSpacing.tight,
    },
    h3: {
      fontSize: DesignTokens.typography.sizes["2xl"],
      lineHeight: DesignTokens.typography.sizes["2xl"] * DesignTokens.typography.lineHeights.snug,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    h4: {
      fontSize: DesignTokens.typography.sizes.xl,
      lineHeight: DesignTokens.typography.sizes.xl * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    body: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight: DesignTokens.typography.sizes.md * DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    bodySmall: {
      fontSize: DesignTokens.typography.sizes.base,
      lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    caption: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight: DesignTokens.typography.sizes.sm * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    label: {
      fontSize: DesignTokens.typography.sizes.base,
      lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    button: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight: DesignTokens.typography.sizes.md * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    price: {
      fontSize: DesignTokens.typography.sizes.xl,
      lineHeight: DesignTokens.typography.sizes.xl * DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.bold,
    },
  },
};

export const Spacing = {
  ...DesignTokens.spacing,
  xs: DesignTokens.spacing[1],
  sm: DesignTokens.spacing[2],
  md: DesignTokens.spacing[4],
  lg: DesignTokens.spacing[6],
  xl: DesignTokens.spacing[8],
  "2xl": DesignTokens.spacing[12],
  "3xl": DesignTokens.spacing[16],
  "4xl": DesignTokens.spacing[20],
  "5xl": DesignTokens.spacing[24],
};

export const BorderRadius = {
  none: DesignTokens.borderRadius.none,
  xs: DesignTokens.borderRadius.xs,
  sm: DesignTokens.borderRadius.sm,
  md: DesignTokens.borderRadius.md,
  lg: DesignTokens.borderRadius.lg,
  xl: DesignTokens.borderRadius.xl,
  "2xl": DesignTokens.borderRadius["2xl"],
  "3xl": DesignTokens.borderRadius["3xl"],
  full: DesignTokens.borderRadius.full,
  "4xl": 48,
  "5xl": 40,
};

export const Shadows = DesignTokens.shadows;

export const Layout = {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    maxWidth: 428,
  },
  safeArea: {
    top: isIOS ? 44 : StatusBar.currentHeight || 24,
    bottom: isIOS ? 34 : 16,
  },
  container: {
    paddingHorizontal: Spacing[5],
  },
  card: {
    width: SCREEN_WIDTH - Spacing[10],
    aspectRatio: 16 / 9,
  },
  productCard: {
    width: (SCREEN_WIDTH - Spacing[10] - Spacing[4]) / 2,
    aspectRatio: 3 / 4,
  },
  grid: {
    columns: 2,
    gap: Spacing[4],
  },
};

export const Animation = {
  duration: DesignTokens.animation.duration,
  easing: DesignTokens.animation.easing,
  spring: {
    default: DesignTokens.animation.easing.spring,
    gentle: DesignTokens.animation.easing.gentle,
    bouncy: { damping: 12, stiffness: 180, mass: 1 },
    stiff: { damping: 25, stiffness: 300, mass: 1 },
  },
};

export const ZIndex = {
  hide: -1,
  base: 0,
  docked: 10,
  dropdown: 20,
  sticky: 30,
  fixed: 40,
  modalBackdrop: 50,
  modal: 60,
  popover: 70,
  tooltip: 80,
  toast: 90,
  overlay: 100,
  max: 999,
};

function buildFlatThemeColors(
  base: typeof DesignTokens.colors | typeof darkTokens.colors,
  wp: WarmPrimaryPalette
): FlatColors {
  return {
    brand: {
      ...base.brand,
      primary: base.brand.terracotta,
      warmPrimary: wp,
      warmAccent: "#E8A87C",
      warmSecondary: "#D4917A",
    } as FlatColors["brand"],
    neutral: base.neutral,
    semantic: {
      ...base.semantic,
      successDark: base.semantic.successDark,
      warningDark: base.semantic.warningDark,
      errorDark: base.semantic.errorDark,
      like: base.semantic.like,
      bookmark: base.semantic.bookmark,
      chartGood: base.semantic.chartGood,
      chartMedium: base.semantic.chartMedium,
      chartPoor: base.semantic.chartPoor,
      chartGrid: base.semantic.chartGrid,
      skeletonBase: base.semantic.skeletonBase,
      warmBlush: base.semantic.warmBlush,
      slateMist: base.semantic.slateMist,
      goldenGlow: base.semantic.goldenGlow,
      sageMist: base.semantic.sageMist,
      yellow: base.semantic.yellow,
      brown: base.semantic.brown,
      wechat: base.semantic.wechat,
      weibo: base.semantic.weibo,
      qq: base.semantic.qq,
      mutedSage: base.semantic.mutedSage,
      fashion: base.fashion,
    },
    backgrounds: base.backgrounds,
    text: base.text,
    borders: base.borders,
    colorSeasons: {
      spring: { ...base.colorSeasons.spring, colors: [...base.colorSeasons.spring.colors] },
      summer: { ...base.colorSeasons.summer, colors: [...base.colorSeasons.summer.colors] },
      autumn: { ...base.colorSeasons.autumn, colors: [...base.colorSeasons.autumn.colors] },
      winter: { ...base.colorSeasons.winter, colors: [...base.colorSeasons.winter.colors] },
    },
    surface: base.backgrounds.primary,
    surfaceSecondary: base.backgrounds.secondary,
    surfaceTertiary: base.backgrounds.tertiary,
    surfaceElevated: base.backgrounds.elevated,
    textPrimary: base.text.primary,
    textSecondary: base.text.secondary,
    textTertiary: base.text.tertiary,
    textInverse: base.text.inverse,
    textBrand: base.text.brand,
    border: base.borders.default,
    borderLight: base.borders.light,
    borderStrong: base.borders.strong,
    borderBrand: base.borders.brand,
    primary: base.brand.terracotta,
    primaryLight: base.brand.terracottaLight,
    primaryDark: base.brand.terracottaDark,
    subtleBg: base.backgrounds.tertiary,
    gold: base.semantic.gold,
    placeholderBg: base.neutral[200],
    overlay: base.backgrounds.overlay,
    background: base.backgrounds.primary,
    backgroundSecondary: base.backgrounds.secondary,
    backgroundTertiary: base.backgrounds.tertiary,
    error: base.semantic.error,
    errorLight: base.semantic.errorLight,
    success: base.semantic.success,
    successLight: base.semantic.successLight,
    warning: base.semantic.warning,
    warningLight: base.semantic.warningLight,
    info: base.semantic.info,
    infoLight: base.semantic.infoLight,
    divider: base.borders.light,
    cartLight: base.backgrounds.cartLight,
    terracottaDark: base.brand.terracottaDark,
    amber: base.semantic.warning,
    secondary: base.brand.sage,
    warmPrimary: wp,
    warmAccent: base.semantic.warmAccent,
    warmSecondary: base.brand.terracottaLight,
    like: base.semantic.error,
    ocean: base.semantic.ocean,
    mint: base.semantic.mint,
    coral: base.semantic.coral,
    main: base.xuno.main,
    light: base.xuno.light,
    dark: base.xuno.dark,
    oceanMint: base.semantic.oceanMint,
    fashion: base.xuno.main,
    purple: base.semantic.purple,
    secondaryLight: base.brand.sageLight,
    gradients: {
      brand: [...DesignTokens.gradients.brand],
      brandSoft: [...DesignTokens.gradients.brandSoft],
      sage: [...DesignTokens.gradients.sage],
      hero: [...DesignTokens.gradients.hero],
      card: [...DesignTokens.gradients.card],
      warm: [...DesignTokens.gradients.warm],
      cool: [...DesignTokens.gradients.cool],
      warmAccent: [...DesignTokens.gradients.warmAccent] as [string, string],
      coolAccent: [...DesignTokens.gradients.coolAccent] as [string, string],
      heroAccent: [...DesignTokens.gradients.heroAccent] as [string, string],
      coralRose: [...DesignTokens.gradients.coralRose] as [string, string],
      oceanMint: [...DesignTokens.gradients.oceanMint] as [string, string],
      oceanDeep: [...DesignTokens.gradients.oceanDeep] as [string, string],
    },
  };
}

export const flatColors = buildFlatThemeColors(DesignTokens.colors, warmPrimaryLight);
export const darkFlatColors = buildFlatThemeColors(darkTokens.colors, warmPrimaryDark);
export { flatColors as colors };

export const themeColors = {
  brand: DesignTokens.colors.brand,
  neutral: DesignTokens.colors.neutral,
  semantic: DesignTokens.colors.semantic,
  backgrounds: DesignTokens.colors.backgrounds,
  text: DesignTokens.colors.text,
  borders: DesignTokens.colors.borders,
  colorSeasons: DesignTokens.colors.colorSeasons,
};

export const theme = {
  colors: flatColors,
  spacing: DesignTokens.spacing,
  typography: DesignTokens.typography,
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
  themeColors,
};

export default theme;

export { useThemeStore, startAppearanceListener, stopAppearanceListener } from "./themeStore";
export { resolveColors, lightColors, darkColors } from "./color-resolver";
export { mmkvStorage } from "./mmkv-storage";
export { useThemeTokens } from "./useThemeTokens";
export type { UseThemeTokensReturn } from "./useThemeTokens";
export type { ThemeMode, ResolvedMode, ThemeColors } from "./types";

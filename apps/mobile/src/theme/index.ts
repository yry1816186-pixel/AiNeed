import { Dimensions, Platform, StatusBar } from "react-native";
import { DesignTokens, darkTokens } from "./tokens/design-tokens";
import type { DesignTokensType, DarkTokensType } from "./tokens/design-tokens";

export { DesignTokens, darkTokens } from "./tokens/design-tokens";
export type { DesignTokensType, DarkTokensType } from "./tokens/design-tokens";

export * from "./tokens/colors";
export * from "./tokens/spacing";
export * from "./tokens/typography";
export * from "./tokens/shadows";
export * from "./tokens/animations";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

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
  semantic: DesignTokens.colors.semantic,

  primary: {
    50: "#FDF8F5",
    100: "#FAEDE6",
    200: "#F5DBC9",
    300: "#EDC4A8",
    400: "#E2A782",
    500: DesignTokens.colors.brand.terracotta,
    600: DesignTokens.colors.brand.terracottaDark,
    700: "#8A533B",
    800: "#714532",
    900: "#5D3A2A",
    950: "#321E16",
  },

  sage: {
    50: "#F5F7F3",
    100: "#EBEEE7",
    200: "#D7DDD0",
    300: "#B8C4AD",
    400: "#9AA88C",
    500: DesignTokens.colors.brand.sage,
    600: DesignTokens.colors.brand.sageDark,
    700: "#5A6451",
    800: "#4A5243",
    900: "#3E4438",
    950: "#21241C",
  },

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
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
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
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
    950: "#022C22",
  },

  accent: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
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
      lineHeight:
        DesignTokens.typography.sizes.xs *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    sm: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight:
        DesignTokens.typography.sizes.sm *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    md: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight:
        DesignTokens.typography.sizes.md *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    lg: {
      fontSize: DesignTokens.typography.sizes.lg,
      lineHeight:
        DesignTokens.typography.sizes.lg *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    xl: {
      fontSize: DesignTokens.typography.sizes.xl,
      lineHeight:
        DesignTokens.typography.sizes.xl *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
  },

  body: {
    xs: {
      fontSize: DesignTokens.typography.sizes.xs,
      lineHeight:
        DesignTokens.typography.sizes.xs *
        DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    sm: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight:
        DesignTokens.typography.sizes.sm *
        DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    md: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight:
        DesignTokens.typography.sizes.md *
        DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    lg: {
      fontSize: DesignTokens.typography.sizes.lg,
      lineHeight:
        DesignTokens.typography.sizes.lg *
        DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
  },

  caption: {
    xs: {
      fontSize: DesignTokens.typography.sizes.xs,
      lineHeight:
        DesignTokens.typography.sizes.xs *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    sm: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight:
        DesignTokens.typography.sizes.sm *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    md: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight:
        DesignTokens.typography.sizes.md *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
  },

  styles: {
    hero: {
      fontSize: DesignTokens.typography.sizes["5xl"],
      lineHeight:
        DesignTokens.typography.sizes["5xl"] *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.bold,
      letterSpacing: DesignTokens.typography.letterSpacing.tight,
    },
    h1: {
      fontSize: DesignTokens.typography.sizes["4xl"],
      lineHeight:
        DesignTokens.typography.sizes["4xl"] *
        DesignTokens.typography.lineHeights.tight,
      fontWeight: DesignTokens.typography.fontWeights.bold,
      letterSpacing: DesignTokens.typography.letterSpacing.tight,
    },
    h2: {
      fontSize: DesignTokens.typography.sizes["3xl"],
      lineHeight:
        DesignTokens.typography.sizes["3xl"] *
        DesignTokens.typography.lineHeights.snug,
      fontWeight: DesignTokens.typography.fontWeights.bold,
      letterSpacing: DesignTokens.typography.letterSpacing.tight,
    },
    h3: {
      fontSize: DesignTokens.typography.sizes["2xl"],
      lineHeight:
        DesignTokens.typography.sizes["2xl"] *
        DesignTokens.typography.lineHeights.snug,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    h4: {
      fontSize: DesignTokens.typography.sizes.xl,
      lineHeight:
        DesignTokens.typography.sizes.xl *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    body: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight:
        DesignTokens.typography.sizes.md *
        DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    bodySmall: {
      fontSize: DesignTokens.typography.sizes.base,
      lineHeight:
        DesignTokens.typography.sizes.base *
        DesignTokens.typography.lineHeights.relaxed,
      fontWeight: DesignTokens.typography.fontWeights.regular,
    },
    caption: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight:
        DesignTokens.typography.sizes.sm *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    label: {
      fontSize: DesignTokens.typography.sizes.base,
      lineHeight:
        DesignTokens.typography.sizes.base *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.medium,
    },
    button: {
      fontSize: DesignTokens.typography.sizes.md,
      lineHeight:
        DesignTokens.typography.sizes.md *
        DesignTokens.typography.lineHeights.normal,
      fontWeight: DesignTokens.typography.fontWeights.semibold,
    },
    price: {
      fontSize: DesignTokens.typography.sizes.xl,
      lineHeight:
        DesignTokens.typography.sizes.xl *
        DesignTokens.typography.lineHeights.normal,
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
  "4xl": 32,
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

export const theme = {
  colors: {
    primary: Colors.primary[500],
    primaryLight: Colors.primary[400],
    primaryDark: Colors.primary[600],
    secondary: Colors.sage[500],
    secondaryLight: Colors.sage[400],
    secondaryDark: Colors.sage[600],
    background: Colors.neutral[50],
    surface: Colors.neutral.white,
    text: Colors.neutral[900],
    textSecondary: Colors.neutral[600],
    textTertiary: Colors.neutral[500],
    border: Colors.neutral[200],
    success: Colors.success[500],
    error: Colors.error[500],
    warning: Colors.warning[500],
    info: DesignTokens.colors.semantic.info,
    neutral: Colors.neutral,
    brand: Colors.brand,
    like: "#FF4757",
    likeLight: "#FFF0F0",
    cartLight: "#F0F0FF",
    gold: "#FFB800",
    goldDark: "#D9A441",
    purple: "#9C27B0",
    amber: "#FFB300",
    placeholderBg: "#E2E8F0",
    subtleBg: "#F1F3F4",
    divider: "#F1F3F4",
    overlayDark: "rgba(0,0,0,0.45)",
    overlayDarkLight: "rgba(0,0,0,0.3)",
    overlayLight: "rgba(255,255,255,0.9)",
    overlayWhiteLow: "rgba(255,255,255,0.15)",
    overlayWhiteMid: "rgba(255,255,255,0.2)",
    overlayWhiteMed: "rgba(255,255,255,0.25)",
    overlayWhiteHigh: "rgba(255,255,255,0.7)",
    overlayWhiteFull: "rgba(255,255,255,0.75)",
    overlayLikeBg: "rgba(255,71,87,0.12)",
    overlayDislikeBg: "rgba(150,150,150,0.12)",
    overlayGoldBg: "rgba(255,184,0,0.2)",
    overlayGoldBorder: "rgba(255,184,0,0.4)",
    overlayWhite: "rgba(255,255,255,0.85)",
  },
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
};

export default theme;

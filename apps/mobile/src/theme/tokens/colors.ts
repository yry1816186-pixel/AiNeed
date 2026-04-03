import { DesignTokens } from "./design-tokens";

export const BrandColors = {
  primary: DesignTokens.colors.brand.terracotta,
  secondary: DesignTokens.colors.brand.sage,
  accent: DesignTokens.colors.brand.camel,
  success: DesignTokens.colors.semantic.success,
  warning: DesignTokens.colors.semantic.warning,
  error: DesignTokens.colors.semantic.error,
  info: DesignTokens.colors.semantic.info,
} as const;

export const NeutralColors = DesignTokens.colors.neutral;

export const PrimaryColors = {
  50: "#FDF8F5",
  100: "#FAF0EA",
  200: "#F5E0D5",
  300: "#EBC9B7",
  400: "#D9A88C",
  500: DesignTokens.colors.brand.terracotta,
  600: DesignTokens.colors.brand.terracottaDark,
  700: "#8A5339",
  800: "#6D422C",
  900: "#4A2D1E",
  950: "#2D1B12",
} as const;

export const SecondaryColors = {
  50: "#F5F7F3",
  100: "#EBEFE8",
  200: "#D7DFD2",
  300: "#B8C5AF",
  400: "#9AAF8C",
  500: DesignTokens.colors.brand.sage,
  600: DesignTokens.colors.brand.sageDark,
  700: "#5A6650",
  800: "#485240",
  900: "#323930",
  950: "#1E231C",
} as const;

export const GradientPresets = {
  hero: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  primary: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  secondary: [...DesignTokens.gradients.sage] as [string, string, ...string[]],
  warm: [...DesignTokens.gradients.warm] as [string, string, ...string[]],
  cool: [...DesignTokens.gradients.cool] as [string, string, ...string[]],
  brand: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  sage: [...DesignTokens.gradients.sage] as [string, string, ...string[]],
  glass: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.05)"] as [string, string, ...string[]],
  glassDark: ["rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)"] as [string, string, ...string[]],
  shimmer: [
    "rgba(255,255,255,0)",
    "rgba(255,255,255,0.3)",
    "rgba(255,255,255,0)",
  ] as [string, string, ...string[]],
} as const;

export const SemanticColors = {
  success: {
    light: DesignTokens.colors.semantic.successLight,
    main: DesignTokens.colors.semantic.success,
    dark: "#3D5E4D",
  },
  warning: {
    light: DesignTokens.colors.semantic.warningLight,
    main: DesignTokens.colors.semantic.warning,
    dark: "#A67D2E",
  },
  error: {
    light: DesignTokens.colors.semantic.errorLight,
    main: DesignTokens.colors.semantic.error,
    dark: "#8E3327",
  },
  info: {
    light: DesignTokens.colors.semantic.infoLight,
    main: DesignTokens.colors.semantic.info,
    dark: "#5F6F7F",
  },
} as const;

export const FashionColors = {
  blush: "#FFB6C1",
  coral: "#FF7F7F",
  mint: "#98FB98",
  lavender: "#E6E6FA",
  peach: "#FFDAB9",
  champagne: "#F7E7CE",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  navy: "#1E3A5F",
  burgundy: "#800020",
  olive: "#808000",
  camel: DesignTokens.colors.brand.camel,
  taupe: "#483C32",
  charcoal: "#36454F",
} as const;

export const colors = {
  brand: BrandColors,
  neutral: NeutralColors,
  primary: PrimaryColors,
  secondary: SecondaryColors,
  gradients: GradientPresets,
  semantic: SemanticColors,
  fashion: FashionColors,
};

export default colors;

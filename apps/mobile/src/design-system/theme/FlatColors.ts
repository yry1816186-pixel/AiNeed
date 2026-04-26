import type { DesignTokens } from "./tokens/design-tokens";

type TokenSet = typeof DesignTokens;

/** Numeric shade palette (50-900) for color sub-palettes */
export interface ColorShadePalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/** WarmPrimary palette with ocean/mint/coral sub-palettes */
export interface WarmPrimaryPalette {
  main: string;
  ocean: ColorShadePalette;
  mint: ColorShadePalette;
  coral: ColorShadePalette;
}

type BrandColors = TokenSet["colors"]["brand"] & {
  primary: string;
  warmPrimary: WarmPrimaryPalette;
  warmAccent: string;
  warmSecondary: string;
};

type GradientColors = TokenSet["gradients"] & {
  warmAccent: string[];
  coolAccent: string[];
  heroAccent: string[];
  coralRose: string[];
  oceanMint: string[];
  oceanDeep: string[];
};

export interface FlatColors {
  brand: BrandColors;
  neutral: TokenSet["colors"]["neutral"];
  semantic: TokenSet["colors"]["semantic"] & {
    successDark: string;
    warningDark: string;
    errorDark: string;
    like: string;
    bookmark: string;
    chartGood: string;
    chartMedium: string;
    chartPoor: string;
    chartGrid: string;
    skeletonBase: string;
    warmBlush: string;
    slateMist: string;
    goldenGlow: string;
    sageMist: string;
    yellow: string;
    brown: string;
    wechat: string;
    weibo: string;
    qq: string;
    mutedSage: string;
    fashion: TokenSet["colors"]["fashion"];
  };
  backgrounds: TokenSet["colors"]["backgrounds"];
  text: TokenSet["colors"]["text"];
  borders: TokenSet["colors"]["borders"];
  colorSeasons: TokenSet["colors"]["colorSeasons"];
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textBrand: string;
  border: string;
  borderLight: string;
  borderStrong: string;
  borderBrand: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  subtleBg: string;
  gold: string;
  placeholderBg: string;
  overlay: string;
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  error: string;
  errorLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  divider: string;
  cartLight: string;
  terracottaDark: string;
  amber: string;
  secondary: string;
  secondaryLight: string;
  warmPrimary: WarmPrimaryPalette;
  warmAccent: string;
  warmSecondary: string;
  like: string;
  ocean: string;
  mint: string;
  coral: string;
  main: string;
  light: string;
  dark: string;
  oceanMint: string;
  fashion: string;
  purple: string;
  gradients: GradientColors;
}

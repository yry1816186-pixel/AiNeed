// FlatColors type - standalone definition to avoid circular dependencies
// This file must NOT import from contexts/ or any file that imports from design-system/theme/index.ts

import type { DesignTokens } from "./tokens/design-tokens";

type TokenSet = typeof DesignTokens;

export interface FlatColors {
  brand: TokenSet["colors"]["brand"];
  neutral: TokenSet["colors"]["neutral"];
  semantic: TokenSet["colors"]["semantic"];
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
  purple: string;
  amber: string;
  secondary: string;
}

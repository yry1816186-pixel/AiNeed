import { useTheme } from "../../shared/contexts/ThemeContext";
import type {
  ThemeContextType,
  DesignTokensType,
  DarkTokensType,
} from "../../shared/contexts/ThemeContext";

export interface UseThemeTokensReturn {
  isDark: boolean;
  theme: ThemeContextType["theme"];
  colors: ThemeContextType["colors"];
  tokens: ThemeContextType["tokens"];
  typography: ThemeContextType["typography"];
  spacing: ThemeContextType["spacing"];
  shadows: ThemeContextType["shadows"];
  borderRadius: ThemeContextType["borderRadius"];
  gradients: ThemeContextType["gradients"];
  animation: ThemeContextType["animation"];
}

export function useThemeTokens(): UseThemeTokensReturn {
  const {
    theme,
    isDark,
    colors,
    tokens,
    typography,
    spacing,
    shadows,
    borderRadius,
    gradients,
    animation,
  } = useTheme();

  return {
    theme,
    isDark,
    colors,
    tokens,
    typography,
    spacing,
    shadows,
    borderRadius,
    gradients,
    animation,
  };
}

export type { ThemeContextType, DesignTokensType, DarkTokensType };

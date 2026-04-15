/**
 * React Paper MD3 主题 Provider
 *
 * 消费统一的 ThemeContext，根据当前 theme 状态动态生成 React Paper MD3 主题。
 * 品牌色统一使用 Terracotta #C67B5C（暗色模式提亮至 #D68B6C）。
 * 所有颜色来自 DesignTokens，禁止硬编码。
 */
import React, { useMemo } from "react";
import { PaperProvider, MD3LightTheme, MD3DarkTheme, configureFonts } from "react-native-paper";
import { useTheme } from "../../contexts/ThemeContext";
import { DesignTokens, darkTokens } from "../../theme/tokens/design-tokens";

/** 从 DesignTokens 生成 React Paper MD3 Light 主题 */
function createLightPaperTheme() {
  const c = DesignTokens.colors;

  return {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: c.brand.terracotta,           // #C67B5C
      primaryContainer: c.brand.terracottaLight,
      secondary: c.brand.sage,
      secondaryContainer: c.brand.sageLight,
      tertiary: c.brand.camel,
      tertiaryContainer: c.brand.camelLight,
      surface: c.backgrounds.primary,         // #FFFFFF
      surfaceVariant: c.backgrounds.secondary,
      surfaceDisabled: c.backgrounds.tertiary,
      background: c.backgrounds.secondary,
      error: c.semantic.error,
      errorContainer: c.semantic.errorLight,
      onPrimary: c.neutral.white,
      onPrimaryContainer: c.brand.terracottaDark,
      onSecondary: c.neutral.white,
      onSecondaryContainer: c.brand.sageDark,
      onTertiary: c.neutral.white,
      onTertiaryContainer: c.brand.camelDark,
      onSurface: c.text.primary,
      onSurfaceVariant: c.text.secondary,
      onSurfaceDisabled: c.text.tertiary,
      onBackground: c.text.primary,
      onError: c.neutral.white,
      onErrorContainer: c.semantic.error,
      outline: c.borders.default,
      outlineVariant: c.borders.light,
      inverseSurface: c.neutral[800],
      inverseOnSurface: c.neutral[100],
      inversePrimary: c.brand.terracottaLight,
      elevation: {
        level0: "transparent",
        level1: c.backgrounds.elevated,
        level2: c.backgrounds.elevated,
        level3: c.backgrounds.elevated,
        level4: c.backgrounds.elevated,
        level5: c.backgrounds.elevated,
      },
    },
    roundness: DesignTokens.borderRadius.lg,
  };
}

/** 从 darkTokens 生成 React Paper MD3 Dark 主题 */
function createDarkPaperTheme() {
  const c = darkTokens.colors;

  return {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: c.brand.terracotta,            // #D68B6C
      primaryContainer: c.brand.terracottaDark,
      secondary: c.brand.sage,
      secondaryContainer: c.brand.sageDark,
      tertiary: c.brand.camel,
      tertiaryContainer: c.brand.camelDark,
      surface: c.backgrounds.primary,          // #161412 (暖黑)
      surfaceVariant: c.backgrounds.secondary,
      surfaceDisabled: c.backgrounds.tertiary,
      background: c.backgrounds.primary,
      error: c.semantic.error,
      errorContainer: c.semantic.errorLight,
      onPrimary: c.neutral[900],
      onPrimaryContainer: c.brand.terracottaLight,
      onSecondary: c.neutral[900],
      onSecondaryContainer: c.brand.sageLight,
      onTertiary: c.neutral[900],
      onTertiaryContainer: c.brand.camelLight,
      onSurface: c.text.primary,
      onSurfaceVariant: c.text.secondary,
      onSurfaceDisabled: c.text.tertiary,
      onBackground: c.text.primary,
      onError: c.neutral[900],
      onErrorContainer: c.semantic.error,
      outline: c.borders.default,
      outlineVariant: c.borders.light,
      inverseSurface: c.neutral[100],
      inverseOnSurface: c.neutral[900],
      inversePrimary: c.brand.terracottaLight,
      elevation: {
        level0: "transparent",
        level1: c.backgrounds.elevated,
        level2: c.backgrounds.elevated,
        level3: c.backgrounds.elevated,
        level4: c.backgrounds.elevated,
        level5: c.backgrounds.elevated,
      },
    },
    roundness: darkTokens.borderRadius.lg,
  };
}

// 预计算静态主题对象，避免每次渲染重建
const lightPaperTheme = createLightPaperTheme();
const darkPaperTheme = createDarkPaperTheme();

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * PaperThemeProvider 消费统一 ThemeContext，
 * 根据当前 isDark 状态选择对应的 React Paper MD3 主题。
 * 必须嵌套在 ThemeProvider 内部使用。
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { isDark } = useTheme();
  const paperTheme = isDark ? darkPaperTheme : lightPaperTheme;

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

export { lightPaperTheme, darkPaperTheme };

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useColorScheme, Appearance, StyleSheet, type ColorValue } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DesignTokens, darkTokens } from "../../design-system/theme";
import type { DesignTokensType, DarkTokensType } from "../../design-system/theme";
import {
  seasonAccentColors,
  normalizeColorSeason,
  type ColorSeason,
  type SeasonAccentColors,
} from "../../design-system/theme";
import { FeatureFlagDefaults } from "../../constants/feature-flags";
import type { FlatColors } from "../../design-system/theme/FlatColors";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type TokenSet = typeof DesignTokens;

function buildFlatColors(base: TokenSet["colors"]): FlatColors {
  return {
    brand: base.brand,
    neutral: base.neutral,
    semantic: base.semantic,
    backgrounds: base.backgrounds,
    text: base.text,
    borders: base.borders,
    colorSeasons: base.colorSeasons,
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
    gold: "DesignTokens.colors.semantic.warning",
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
    cartLight: "#FFF5F0",
    terracottaDark: DesignTokens.colors.brand.terracottaDark,
    amber: DesignTokens.colors.semantic.warning,
    secondary: base.brand.sage,
  };
}

const lightFlatColors = buildFlatColors(DesignTokens.colors);
const darkFlatColors = buildFlatColors(darkTokens.colors);

export interface ThemeContextType {
  theme: ResolvedTheme;
  mode: ThemeMode;
  isDark: boolean;
  tokens: TokenSet;
  colors: FlatColors;
  typography: TokenSet["typography"];
  spacing: TokenSet["spacing"];
  borderRadius: TokenSet["borderRadius"];
  shadows: TokenSet["shadows"];
  gradients: TokenSet["gradients"];
  animation: TokenSet["animation"];
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colorSeason: ColorSeason | null;
  seasonAccent: SeasonAccentColors | null;
  setSeasonAccent: (season: ColorSeason | null) => void;
}

const THEME_STORAGE_KEY = "@xuno_theme_mode";
const SEASON_STORAGE_KEY = "@xuno_color_season";

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [colorSeason, setColorSeasonState] = useState<ColorSeason | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadPersisted = async () => {
      try {
        const [savedMode, savedSeason] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(SEASON_STORAGE_KEY),
        ]);
        if (savedMode === "light" || savedMode === "dark" || savedMode === "system") {
          setModeState(savedMode);
        }
        if (savedSeason && (savedSeason === "spring" || savedSeason === "summer" || savedSeason === "autumn" || savedSeason === "winter")) {
          setColorSeasonState(savedSeason as ColorSeason);
        }
      } catch (e) {
        console.error('Failed to load theme:', e);
      } finally {
        setIsReady(true);
      }
    };
    void loadPersisted();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      setModeState((prev) => prev);
    });
    return () => subscription.remove();
  }, []);

  const isDark = FeatureFlagDefaults.dark_mode && (mode === "dark" || (mode === "system" && systemColorScheme === "dark"));
  const resolvedTheme: ResolvedTheme = isDark ? "dark" : "light";

  const tokens: TokenSet = (isDark ? darkTokens : DesignTokens) as TokenSet;
  const flatColors: FlatColors = isDark ? darkFlatColors : lightFlatColors;

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Failed to save theme:', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    void setMode(nextMode);
  }, [isDark, setMode]);

  const setSeasonAccent = useCallback(async (season: ColorSeason | null) => {
    setColorSeasonState(season);
    try {
      if (season) {
        await AsyncStorage.setItem(SEASON_STORAGE_KEY, season);
      } else {
        await AsyncStorage.removeItem(SEASON_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to reset theme:', e);
    }
  }, []);

  const seasonAccent: SeasonAccentColors | null = colorSeason
    ? seasonAccentColors[colorSeason]
    : null;

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: resolvedTheme,
      mode,
      isDark,
      tokens,
      colors: flatColors,
      typography: tokens.typography,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      shadows: tokens.shadows,
      gradients: tokens.gradients,
      animation: tokens.animation,
      setMode,
      toggleTheme,
      colorSeason,
      seasonAccent,
      setSeasonAccent,
    }),
    [resolvedTheme, mode, isDark, tokens, flatColors, setMode, toggleTheme, colorSeason, seasonAccent, setSeasonAccent],
  );

  if (!isReady) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider (from contexts/ThemeContext)");
  }
  return context;
}

export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: FlatColors) => T
): (colors: FlatColors) => T {
  return (colors: FlatColors) => StyleSheet.create(factory(colors));
}

export { ThemeContext };
export type { DesignTokensType, DarkTokensType, FlatColors };
export { normalizeColorSeason, seasonAccentColors, seasonLabels, seasonDescriptions } from "../../design-system/theme";
export type { ColorSeason, SeasonAccentColors };

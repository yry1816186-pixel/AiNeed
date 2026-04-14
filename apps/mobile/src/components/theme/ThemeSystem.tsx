import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  useColorScheme,
  Appearance,
  Pressable,
  ColorValue,
  ViewStyle,
  StyleProp,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import * as Haptics from '@/src/polyfills/expo-haptics';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import {
  Spacing,
  BorderRadius,
  Shadows,
  gradients as themeGradients,
  theme as baseTheme,
} from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const THEME_STORAGE_KEY = "@xuno_theme";
const ACCENT_COLOR_KEY = "@xuno_accent";

/** Ionicons 图标名称联合类型 */
type ThemeIoniconsIconName =
  | "checkmark"
  | "sunny"
  | "moon"
  | "phone-portrait";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor =
  | "purple"
  | "blue"
  | "green"
  | "orange"
  | "pink"
  | "red";

interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  card: string;
  cardElevated: string;
  overlay: string;
  shadow: string;
}

interface Theme {
  mode: "light" | "dark";
  colors: ThemeColors;
  gradients: {
    primary: string[];
    secondary: string[];
    warm: string[];
    cool: string[];
    hero: string[];
    card: string[];
  };
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  shadows: typeof Shadows;
}

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const accentColors: Record<
  AccentColor,
  { primary: string; light: string; dark: string }
> = {
  purple: { primary: "#667EEA", light: "#A5B4FC", dark: "#4C1D95" },
  blue: { primary: "#3B82F6", light: "#93C5FD", dark: "#1E3A8A" },
  green: { primary: "#10B981", light: "#6EE7B7", dark: "#064E3B" },
  orange: { primary: "#F59E0B", light: "#FCD34D", dark: "#78350F" },
  pink: { primary: "#EC4899", light: "#F9A8D4", dark: "#831843" },
  red: { primary: "#EF4444", light: "#FCA5A5", dark: "#7F1D1D" },
};

interface AccentColorOptionProps {
  color: AccentColor;
  isSelected: boolean;
  onPress: () => void;
  textColor: string;
}

const AccentColorOption: React.FC<AccentColorOptionProps> = ({
  color,
  isSelected,
  onPress,
  textColor,
}) => {
  const colorConfig = accentColors[color];
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.15 : 1, {
      damping: 15,
      stiffness: 200,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity style={styles.colorOption} onPress={onPress}>
      <AnimatedView
        style={[
          styles.colorCircle,
          { backgroundColor: colorConfig.primary },
          isSelected && styles.colorCircleSelected,
          animatedStyle,
        ]}
      >
        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
      </AnimatedView>
      <Text style={[styles.colorLabel, { color: textColor }]}>
        {color.charAt(0).toUpperCase() + color.slice(1)}
      </Text>
    </TouchableOpacity>
  );
};

const lightColors: Omit<
  ThemeColors,
  "primary" | "primaryLight" | "primaryDark"
> = {
  secondary: "#764BA2",
  background: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceSecondary: "#F5F5F5",
  text: "#18181B",
  textSecondary: "#71717A",
  textTertiary: "#A1A1AA",
  border: "#E4E4E7",
  borderLight: "#F4F4F5",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  card: "#FFFFFF",
  cardElevated: "#FFFFFF",
  overlay: "rgba(0,0,0,0.5)",
  shadow: "#000000",
};

const darkColors: Omit<
  ThemeColors,
  "primary" | "primaryLight" | "primaryDark"
> = {
  secondary: "#A78BFA",
  background: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceSecondary: "#262626",
  text: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textTertiary: "#71717A",
  border: "#3F3F46",
  borderLight: "#27272A",
  success: "#34D399",
  error: "#F87171",
  warning: "#FBBF24",
  info: "#60A5FA",
  card: "#1A1A1A",
  cardElevated: "#262626",
  overlay: "rgba(0,0,0,0.7)",
  shadow: "#000000",
};

const createTheme = (mode: "light" | "dark", accent: AccentColor): Theme => {
  const accentConfig = accentColors[accent];
  const baseColors = mode === "light" ? lightColors : darkColors;

  // Brand primary is always Terracotta (#C67B5C). Accent is a secondary emphasis color.
  const brandPrimary = "#C67B5C";
  const brandPrimaryLight = "#E2A782";
  const brandPrimaryDark = "#A65E3F";

  const colors: ThemeColors = {
    primary: brandPrimary,
    primaryLight: brandPrimaryLight,
    primaryDark: brandPrimaryDark,
    ...baseColors,
    // Override secondary with the user-chosen accent color
    secondary: accentConfig.primary,
  };

  return {
    mode,
    colors,
    gradients: {
      primary: [brandPrimary, brandPrimaryDark],
      secondary: [accentConfig.light, accentConfig.primary],
      warm: ["#F59E0B", "#EF4444", "#EC4899"],
      cool: ["#3B82F6", "#8B5CF6", "#EC4899"],
      hero: [brandPrimary, brandPrimaryDark],
      card: mode === "light" ? ["#FFFFFF", "#FAFAFA"] : ["#1A1A1A", "#0F0F0F"],
    },
    spacing: Spacing,
    borderRadius: BorderRadius,
    shadows: Shadows,
  };
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  defaultAccent?: AccentColor;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = "system",
  defaultAccent = "purple",
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultMode);
  const [accentColor, setAccentColorState] =
    useState<AccentColor>(defaultAccent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreferences();
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === "system") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  const loadThemePreferences = async () => {
    try {
      const [savedMode, savedAccent] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(ACCENT_COLOR_KEY),
      ]);

      if (savedMode) {
        setThemeModeState(savedMode as ThemeMode);
      }
      if (savedAccent) {
        setAccentColorState(savedAccent as AccentColor);
      }
    } catch (error) {
      console.error("Failed to load theme preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Failed to save theme mode:", error);
    }
  }, []);

  const setAccentColor = useCallback(async (color: AccentColor) => {
    setAccentColorState(color);
    try {
      await AsyncStorage.setItem(ACCENT_COLOR_KEY, color);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Failed to save accent color:", error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newMode =
      themeMode === "light" ? "dark" : themeMode === "dark" ? "light" : "light";
    setThemeMode(newMode);
  }, [themeMode, setThemeMode]);

  const isDark = useMemo(() => {
    if (themeMode === "system") {
      return systemColorScheme === "dark";
    }
    return themeMode === "dark";
  }, [themeMode, systemColorScheme]);

  const theme = useMemo(() => {
    return createTheme(isDark ? "dark" : "light", accentColor);
  }, [isDark, accentColor]);

  const value: ThemeContextValue = {
    theme,
    themeMode,
    accentColor,
    setThemeMode,
    setAccentColor,
    toggleTheme,
    isDark,
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export interface ThemedViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "background" | "surface" | "card" | "transparent";
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  children,
  style,
  variant = "background",
}) => {
  const { theme } = useTheme();

  const backgroundColor = {
    background: theme.colors.background,
    surface: theme.colors.surface,
    card: theme.colors.card,
    transparent: "transparent",
  }[variant];

  return <View style={[{ backgroundColor }, style]}>{children}</View>;
};

export interface ThemedTextProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?:
    | "primary"
    | "secondary"
    | "tertiary"
    | "accent"
    | "error"
    | "success";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  weight?: "normal" | "medium" | "semibold" | "bold";
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  children,
  style,
  variant = "primary",
  size = "md",
  weight = "normal",
}) => {
  const { theme } = useTheme();

  const color = {
    primary: theme.colors.text,
    secondary: theme.colors.textSecondary,
    tertiary: theme.colors.textTertiary,
    accent: theme.colors.secondary,
    error: theme.colors.error,
    success: theme.colors.success,
  }[variant];

  const fontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
    xxl: 32,
  }[size];

  const fontWeight = {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  }[weight];

  return (
    <Text style={[{ color, fontSize, fontWeight }, style]}>{children}</Text>
  );
};

export interface ThemeSwitchProps {
  style?: StyleProp<ViewStyle>;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ style }) => {
  const { themeMode, setThemeMode, isDark, theme } = useTheme();
  const switchTranslateX = useSharedValue(isDark ? 24 : 0);
  const iconRotation = useSharedValue(isDark ? 180 : 0);

  useEffect(() => {
    switchTranslateX.value = withSpring(isDark ? 24 : 0, {
      damping: 15,
      stiffness: 200,
    });
    iconRotation.value = withSpring(isDark ? 180 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isDark]);

  const switchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: switchTranslateX.value }],
  }));

  const sunAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${iconRotation.value}deg` }],
    opacity: interpolate(iconRotation.value, [0, 90], [1, 0]),
  }));

  const moonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${iconRotation.value - 180}deg` }],
    opacity: interpolate(iconRotation.value, [90, 180], [0, 1]),
  }));

  const handleToggle = () => {
    if (themeMode === "system") {
      setThemeMode(isDark ? "light" : "dark");
    } else {
      setThemeMode(themeMode === "light" ? "dark" : "light");
    }
  };

  return (
    <TouchableOpacity
      style={[styles.themeSwitch, style]}
      onPress={handleToggle}
    >
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: isDark
              ? theme.colors.primary
              : theme.colors.border,
          },
        ]}
      >
        <AnimatedView style={[styles.switchThumb, switchAnimatedStyle]}>
          <View style={styles.iconContainer}>
            <AnimatedView
              style={[
                StyleSheet.absoluteFill,
                styles.iconCenter,
                sunAnimatedStyle,
              ]}
            >
              <Ionicons
                name="sunny"
                size={14}
                color={isDark ? "#fff" : theme.colors.textSecondary}
              />
            </AnimatedView>
            <AnimatedView
              style={[
                StyleSheet.absoluteFill,
                styles.iconCenter,
                moonAnimatedStyle,
              ]}
            >
              <Ionicons name="moon" size={14} color="#fff" />
            </AnimatedView>
          </View>
        </AnimatedView>
      </View>
    </TouchableOpacity>
  );
};

export interface AccentColorPickerProps {
  style?: StyleProp<ViewStyle>;
}

export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
  style,
}) => {
  const { accentColor, setAccentColor, theme } = useTheme();
  const colorOptions = Object.keys(accentColors) as AccentColor[];

  return (
    <View style={[styles.accentPicker, style]}>
      <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>
        辅助强调色
      </Text>
      <View style={styles.colorOptions}>
        {colorOptions.map((color) => (
          <AccentColorOption
            key={color}
            color={color}
            isSelected={accentColor === color}
            onPress={() => setAccentColor(color)}
            textColor={theme.colors.textSecondary}
          />
        ))}
      </View>
    </View>
  );
};

export interface ThemeSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSettingsSheet: React.FC<ThemeSettingsSheetProps> = ({
  visible,
  onClose,
}) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const translateY = useSharedValue(SCREEN_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withTiming(SCREEN_WIDTH, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: "light", label: "浅色", icon: "sunny" },
    { mode: "dark", label: "深色", icon: "moon" },
    { mode: "system", label: "跟随系统", icon: "phone-portrait" },
  ];

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedPressable
        style={[styles.backdrop, backdropAnimatedStyle]}
        onPress={onClose}
      />
      <AnimatedView
        style={[
          styles.sheet,
          { backgroundColor: theme.colors.surface },
          sheetAnimatedStyle,
        ]}
      >
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>
          外观设置
        </Text>

        <View style={styles.themeOptions}>
          {themeOptions.map((option) => {
            const isSelected = themeMode === option.mode;
            const effectiveDark =
              option.mode === "system" ? isDark : option.mode === "dark";

            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.themeOption,
                  { backgroundColor: theme.colors.surfaceSecondary },
                  isSelected && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setThemeMode(option.mode)}
              >
                <View
                  style={[
                    styles.themeOptionIcon,
                    {
                      backgroundColor: effectiveDark
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as ThemeIoniconsIconName}
                    size={20}
                    color={effectiveDark ? "#fff" : theme.colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.themeOptionLabel,
                    { color: theme.colors.text },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.checkMark,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <AccentColorPicker style={styles.accentSection} />
      </AnimatedView>
    </View>
  );
};

export interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "warm" | "cool" | "hero";
  customColors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  style?: StyleProp<ViewStyle>;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = "primary",
  customColors,
  style,
}) => {
  const { theme } = useTheme();

  const gradientColors = (customColors ||
    theme.gradients[variant] ||
    themeGradients.primary) as unknown as readonly [
    string,
    string,
    ...string[],
  ];

  return (
    <LinearGradient
      colors={[...gradientColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill as ViewStyle, style]}
    >
      {children}
    </LinearGradient>
  );
};

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 80,
  tint,
}) => {
  const { isDark, theme } = useTheme();
  const defaultTint = tint || (isDark ? "dark" : "light");

  return (
    <View
      style={[
        styles.glassCard,
        { backgroundColor: `${theme.colors.surface}40` },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={defaultTint}
        style={StyleSheet.absoluteFill as ViewStyle}
      >
        <View
          style={[
            StyleSheet.absoluteFill as ViewStyle,
            { backgroundColor: `${theme.colors.surface}20` },
          ]}
        />
      </BlurView>
      <View style={{ position: "relative", zIndex: 1 }}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  themeSwitch: {
    padding: 4,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  accentPicker: {
    marginTop: 24,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  colorOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  colorOption: {
    alignItems: "center",
    width: 60,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  colorCircleSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  colorLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: "#E4E4E7",
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  themeOptions: {
    flexDirection: "row",
    gap: 12,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    position: "relative",
  },
  themeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  accentSection: {
    marginTop: 24,
  },
  glassCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
});

const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

export default {
  ThemeProvider,
  useTheme,
  ThemedView,
  ThemedText,
  ThemeSwitch,
  AccentColorPicker,
  ThemeSettingsSheet,
  GradientBackground,
  GlassCard,
};

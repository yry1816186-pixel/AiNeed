/**
 * 寻裳 ThemeSystem (兼容层)
 *
 * @deprecated 此文件为向后兼容层。新代码请直接使用：
 *   - ThemeProvider / useTheme 来自 `src/contexts/ThemeContext`
 *   - PaperThemeProvider 来自 `src/design-system/ui/PaperThemeProvider`
 *
 * 原有的独立 ThemeProvider 和 AccentColor 系统已废弃。
 * 所有组件现在消费统一的 ThemeContext。
 * 品牌色统一使用 Terracotta #C67B5C（暗色模式 #D68B6C）。
 */
import React, {
  useEffect,
  ReactNode,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Pressable,
  ColorValue,
  ViewStyle,
  StyleProp,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import {
  Spacing,
  BorderRadius,
  Shadows,
  gradients as themeGradients,
} from '../../design-system/theme';
import { DesignTokens } from "../../design-system/theme";
import {
  ThemeProvider as UnifiedThemeProvider,
  useTheme as useUnifiedTheme,
  type ThemeMode,
  type ThemeContextType,
} from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

// ─── Re-export unified ThemeProvider ──────────────────────────────────────

/**
 * @deprecated 使用 `import { ThemeProvider } from '../contexts/ThemeContext'` 代替。
 * 此 re-export 保持向后兼容，实际指向统一的 ThemeProvider。
 */
export const ThemeProvider = UnifiedThemeProvider;

/**
 * @deprecated 使用 `import { useTheme } from '../contexts/ThemeContext'` 代替。
 * 此 re-export 保持向后兼容，实际指向统一的 useTheme。
 */
export const useTheme = useUnifiedTheme;

// ─── Deprecated AccentColor ───────────────────────────────────────────────

/**
 * @deprecated AccentColor 系统已废弃，与品牌色 Terracotta 冲突。
 * 新代码不应使用 AccentColor。
 */
export type AccentColor = "purple" | "blue" | "green" | "orange" | "pink" | "red";

// ─── ThemedView ───────────────────────────────────────────────────────────

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
  const { colors } = useUnifiedTheme();

  const backgroundColor = {
    background: colors.backgrounds.primary,
    surface: colors.backgrounds.elevated,
    card: colors.backgrounds.secondary,
    transparent: "transparent",
  }[variant];

  return <View style={[{ backgroundColor }, style]}>{children}</View>;
};

// ─── ThemedText ───────────────────────────────────────────────────────────

export interface ThemedTextProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "secondary" | "tertiary" | "accent" | "error" | "success";
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
  const { colors } = useUnifiedTheme();

  const color = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    tertiary: colors.text.tertiary,
    accent: colors.brand.terracotta,
    error: colors.semantic.error,
    success: colors.semantic.success,
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

  return <Text style={[{ color, fontSize, fontWeight }, style]}>{children}</Text>;
};

// ─── ThemeSwitch ──────────────────────────────────────────────────────────

/** Ionicons 图标名称联合类型 */
type ThemeIoniconsIconName = "checkmark" | "sunny" | "moon" | "phone-portrait";

export interface ThemeSwitchProps {
  style?: StyleProp<ViewStyle>;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ style }) => {
  const { mode, isDark, setMode, colors } = useUnifiedTheme();
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
    if (mode === "system") {
      void setMode(isDark ? "light" : "dark");
    } else {
      void setMode(mode === "light" ? "dark" : "light");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <TouchableOpacity style={[styles.themeSwitch, style]} onPress={handleToggle}>
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: isDark ? colors.brand.terracotta : colors.borders.default,
          },
        ]}
      >
        <AnimatedView style={[styles.switchThumb, switchAnimatedStyle]}>
          <View style={styles.iconContainer}>
            <AnimatedView style={[StyleSheet.absoluteFill, styles.iconCenter, sunAnimatedStyle]}>
              <Ionicons
                name="sunny"
                size={14}
                color={isDark ? DesignTokens.colors.backgrounds.primary : colors.text.secondary}
              />
            </AnimatedView>
            <AnimatedView style={[StyleSheet.absoluteFill, styles.iconCenter, moonAnimatedStyle]}>
              <Ionicons name="moon" size={14} color={DesignTokens.colors.backgrounds.primary} />
            </AnimatedView>
          </View>
        </AnimatedView>
      </View>
    </TouchableOpacity>
  );
};

// ─── AccentColorPicker (deprecated) ───────────────────────────────────────

/**
 * @deprecated AccentColorPicker 已废弃，与品牌色 Terracotta 冲突。
 * 保留组件但内部不再提供 AccentColor 切换功能。
 */
export interface AccentColorPickerProps {
  style?: StyleProp<ViewStyle>;
}

export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({ style }) => {
  const { colors } = useUnifiedTheme();

  return (
    <View style={[styles.accentPicker, style]}>
      <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>
        品牌强调色
      </Text>
      <View style={styles.colorOptions}>
        <View style={styles.colorOption}>
          <View
            style={[
              styles.colorCircle,
              { backgroundColor: colors.brand.terracotta },
              styles.colorCircleSelected,
            ]}
          >
            <Ionicons name="checkmark" size={16} color={DesignTokens.colors.backgrounds.primary} />
          </View>
          <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>
            Terracotta
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── ThemeSettingsSheet ───────────────────────────────────────────────────

export interface ThemeSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ThemeSettingsSheet: React.FC<ThemeSettingsSheetProps> = ({ visible, onClose }) => {
  const { colors, mode, setMode, isDark } = useUnifiedTheme();
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

  if (!visible) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <AnimatedPressable style={[styles.backdrop, backdropAnimatedStyle]} onPress={onClose} />
      <AnimatedView
        style={[styles.sheet, { backgroundColor: colors.backgrounds.elevated }, sheetAnimatedStyle]}
      >
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>外观设置</Text>

        <View style={styles.themeOptions}>
          {themeOptions.map((option) => {
            const isSelected = mode === option.mode;
            const effectiveDark = option.mode === "system" ? isDark : option.mode === "dark";

            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.themeOption,
                  { backgroundColor: colors.backgrounds.tertiary },
                  isSelected && {
                    borderColor: colors.brand.terracotta,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  void setMode(option.mode);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View
                  style={[
                    styles.themeOptionIcon,
                    {
                      backgroundColor: effectiveDark
                        ? colors.brand.terracotta
                        : colors.borders.default,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as ThemeIoniconsIconName}
                    size={20}
                    color={effectiveDark ? DesignTokens.colors.backgrounds.primary : colors.text.secondary}
                  />
                </View>
                <Text style={[styles.themeOptionLabel, { color: colors.text.primary }]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkMark, { backgroundColor: colors.brand.terracotta }]}>
                    <Ionicons name="checkmark" size={12} color={DesignTokens.colors.backgrounds.primary} />
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

// ─── GradientBackground ───────────────────────────────────────────────────

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
  const { gradients } = useUnifiedTheme();

  const gradientColors = (customColors ||
    gradients[variant === "primary" ? "brand" : variant === "secondary" ? "sage" : variant] ||
    themeGradients.primary) as unknown as readonly [string, string, ...string[]];

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

// ─── GlassCard ────────────────────────────────────────────────────────────

export interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, intensity = 80, tint }) => {
  const { isDark, colors } = useUnifiedTheme();
  const defaultTint = tint || (isDark ? "dark" : "light");

  return (
    <View style={[styles.glassCard, { backgroundColor: `${colors.backgrounds.elevated}40` }, style]}>
      <BlurView
        intensity={intensity}
        tint={defaultTint}
        style={StyleSheet.absoluteFill as ViewStyle}
      >
        <View
          style={[
            StyleSheet.absoluteFill as ViewStyle,
            { backgroundColor: `${colors.backgrounds.elevated}20` },
          ]}
        />
      </BlurView>
      <View style={{ position: "relative", zIndex: 1 }}>{children}</View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────

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
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DesignTokens.colors.neutral.black,
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
    shadowColor: DesignTokens.colors.neutral.black,
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
    backgroundColor: DesignTokens.colors.neutral.black,
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

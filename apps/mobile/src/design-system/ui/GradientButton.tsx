import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

// 引入主题令牌
import {
  Colors,
  Typography as ThemeTypography,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  DesignTokens,
  SpringConfigs,
} from '../../design-system/theme';


interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "success" | "ocean";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  icon?: string; // Ionicons name
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * GradientButton - 渐变按钮
 *
 * 设计特点：
 * - 多种渐变配色方案
 * - 按压动画反馈 (scale 0.95)
 * - 加载状态指示器
 * - 图标支持
 * - 3种尺寸规格
 * - 季节色彩自适应：primary 变体在有季节强调色时使用季节渐变
 */
export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
}) => {
  const { seasonAccent } = useTheme();

  // 动画值
  const scaleValue = useSharedValue(1);

  // 渐变配色映射 - 统一使用品牌色体系
  // primary 变体在有季节强调色时使用季节渐变
  const gradientColors: Record<string, [string, string]> = {
    primary: seasonAccent?.gradient ?? [Colors.primary[400], Colors.primary[600]],
    secondary: [Colors.sage[400], Colors.sage[600]],
    success: [Colors.success[400], Colors.success[600]],
    ocean: [Colors.sky[400], Colors.sky[600]],
  };

  // 尺寸配置
  const sizeConfig = {
    small: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      fontSize: ThemeTypography.sizes.sm,
      borderRadius: ThemeBorderRadius.lg,
    },
    medium: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      fontSize: ThemeTypography.sizes.base,
      borderRadius: ThemeBorderRadius.xl,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      fontSize: ThemeTypography.sizes.lg,
      borderRadius: ThemeBorderRadius.xl,
    },
  };

  // 按压动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  // 处理按压事件
  const handlePressIn = () => {
    if (!disabled && !loading) {
      scaleValue.value = withSpring(0.95, SpringConfigs.snappy);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scaleValue.value = withSpring(1, SpringConfigs.bouncy);
    }
  };

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={disabled || loading}
        style={[styles.button, sizeConfig[size], disabled && styles.disabled]}
      >
        <LinearGradient
          colors={gradientColors[variant] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color={DesignTokens.colors.text.inverse} />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={size === "small" ? 18 : 20} color={DesignTokens.colors.text.inverse} />}
              <Text style={[styles.title, { fontSize: sizeConfig[size].fontSize }]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: "hidden",
    ...ThemeShadows.md,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontWeight: ThemeTypography.fontWeights.bold,
    color: DesignTokens.colors.text.inverse,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GradientButton;

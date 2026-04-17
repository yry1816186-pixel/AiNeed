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
import { Spacing } from '../theme';
import { DesignTokens } from '../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import {
  Colors,
  Typography as ThemeTypography,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  SpringConfigs,
} from '../../design-system/theme';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";


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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
      paddingVertical: DesignTokens.spacing['2.5'],
      paddingHorizontal: Spacing.md,
      fontSize: ThemeTypography.sizes.sm,
      borderRadius: ThemeBorderRadius.lg,
    },
    medium: {
      paddingVertical: DesignTokens.spacing['3.5'],
      paddingHorizontal: DesignTokens.spacing[5],
      fontSize: ThemeTypography.sizes.base,
      borderRadius: ThemeBorderRadius.xl,
    },
    large: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
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
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={size === "small" ? 18 : 20} color={colors.textInverse} />}
              <Text style={[styles.title, { fontSize: sizeConfig[size].fontSize }]}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) => ({
  button: {
    overflow: "hidden",
    ...ThemeShadows.md,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  title: {
    fontWeight: ThemeTypography.fontWeights.bold,
    color: colors.textInverse,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
}))

export default GradientButton;

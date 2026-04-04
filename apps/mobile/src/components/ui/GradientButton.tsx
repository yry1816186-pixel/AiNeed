import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// 引入主题令牌
import { colors } from '../../theme/tokens/colors';
import { typography } from '../../theme/tokens/typography';
import { spacing } from '../../theme/tokens/spacing';
import { shadows } from '../../theme/tokens/shadows';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'ocean';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string; // Ionicons name
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * GradientButton - 国赛一等奖水准渐变按钮
 *
 * 设计特点：
 * - 多种渐变配色方案（珊瑚粉/薄荷绿/深海蓝）
 * - 按压动画反馈 (scale 0.95)
 * - 加载状态指示器
 * - 图标支持
 * - 3种尺寸规格
 */
export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
}) => {
  // 动画值
  const scaleValue = useSharedValue(1);

  // 渐变配色映射
  const gradientColors = {
    primary: [colors.warmPrimary.coral[500], colors.warmPrimary.coral[600]],
    secondary: [colors.warmPrimary.mint[500], colors.warmPrimary.mint[600]],
    success: ['#51CF66', '#40C057'],
    ocean: [colors.warmPrimary.ocean[500], colors.warmPrimary.ocean[600]],
  };

  // 尺寸配置
  const sizeConfig = {
    small: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      fontSize: typography.fontSize.sm,
      borderRadius: spacing.borderRadius.lg,
    },
    medium: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      fontSize: typography.fontSize.base,
      borderRadius: spacing.borderRadius.xl,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      fontSize: typography.fontSize.lg,
      borderRadius: spacing.borderRadius.xl,
    },
  };

  // 按压动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  // 处理按压事件
  const handlePressIn = () => {
    if (!disabled && !loading) {
      scaleValue.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scaleValue.value = withSpring(1, { damping: 15, stiffness: 400 });
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
        style={[
          styles.button,
          sizeConfig[size],
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={gradientColors[variant] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {icon && (
                <Ionicons name={icon as any} size={size === 'small' ? 18 : 20} color="#FFFFFF" />
              )}
              <Text
                style={[
                  styles.title,
                  { fontSize: sizeConfig[size].fontSize },
                ]}
              >
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    ...shadows.presets.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GradientButton;

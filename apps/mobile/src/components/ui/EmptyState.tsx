import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

// 引入主题令牌
import { colors } from '../../theme/tokens/colors';
import { typography } from '../../theme/tokens/typography';
import { spacing } from '../../theme/tokens/spacing';

interface EmptyStateProps {
  icon?: string; // Ionicons name
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * EmptyState - 国赛一等奖水准空状态占位组件
 *
 * 设计特点：
 * - 大图标 + 渐变背景圆形容器
 * - 清晰的标题 + 副标题层级
 * - 可选的操作按钮（渐变样式）
 * - 柔和的入场动画 (FadeInUp)
 * - 多种场景支持（无数据/网络错误/搜索为空等）
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'folder-open-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  return (
    <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.container}>
      {/* 图标容器 */}
      <LinearGradient
        colors={[colors.warmPrimary.coral[50], colors.warmPrimary.mint[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons
          name={icon as any}
          size={64}
          color={colors.warmPrimary.coral[400]}
        />
      </LinearGradient>

      {/* 文字内容 */}
      <Text style={styles.title}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {/* 操作按钮 */}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.warmPrimary.coral[500], colors.warmPrimary.coral[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.layout.modalPadding * 2,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.layout.sectionGap,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.layout.cardGap / 2,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: spacing.layout.sectionGap,
  },
  actionButton: {
    borderRadius: spacing.borderRadius.xl,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  actionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
});

export default EmptyState;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// 引入主题令牌
import { colors } from '../../theme/tokens/colors';
import { spacing } from '../../theme/tokens/spacing';

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

/**
 * Shimmer - 单个骨架屏元素
 */
const Shimmer: React.FC<ShimmerProps> = ({
  width,
  height,
  borderRadius = spacing.borderRadius.md,
  style,
}) => {
  const translateX = useSharedValue(-200);

  // 动画效果
  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.shimmerContainer,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerEffect, animatedStyle]} />
    </View>
  );
};

/**
 * LoadingShimmer - 国赛一等奖水准骨架屏加载组件
 *
 * 设计特点：
 * - 多种预设模板（卡片/列表/详情）
 * - 流畅的shimmer动画（从左到右）
 * - 自定义尺寸支持
 * - 符合新主题令牌的颜色系统
 */
export const LoadingShimmer: React.FC<{
  variant?: 'card' | 'list' | 'detail' | 'profile';
}> = ({ variant = 'card' }) => {
  switch (variant) {
    case 'card':
      return (
        <View style={styles.cardTemplate}>
          <Shimmer width={140} height={180} borderRadius={spacing.borderRadius['2xl']} />
          <View style={styles.cardText}>
            <Shimmer width={120} height={16} />
            <Shimmer width={80} height={12} style={{ marginTop: 8 }} />
            <Shimmer width={60} height={14} style={{ marginTop: 8 }} />
          </View>
        </View>
      );

    case 'list':
      return (
        <View style={styles.listTemplate}>
          <Shimmer width={60} height={60} borderRadius={30} />
          <View style={styles.listText}>
            <Shimmer width={150} height={16} />
            <Shimmer width={200} height={12} style={{ marginTop: 8 }} />
          </View>
        </View>
      );

    case 'detail':
      return (
        <View style={styles.detailTemplate}>
          <Shimmer width="100%" height={300} borderRadius={0} />
          <View style={{ padding: 20 }}>
            <Shimmer width={200} height={28} />
            <Shimmer width={150} height={16} style={{ marginTop: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <Shimmer width={80} height={24} borderRadius={12} />
              <Shimmer width={80} height={24} borderRadius={12} />
              <Shimmer width={80} height={24} borderRadius={12} />
            </View>
          </View>
        </View>
      );

    case 'profile':
      return (
        <View style={styles.profileTemplate}>
          <Shimmer width="100%" height={160} borderRadius={spacing.borderRadius['2xl']} />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Shimmer width="100%" height={80} borderRadius={spacing.borderRadius.xl} />
              </View>
            ))}
          </View>
        </View>
      );

    default:
      return null;
  }
};

const styles = StyleSheet.create({
  shimmerContainer: {
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // 卡片模板
  cardTemplate: {
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: {
    marginTop: 10,
    alignItems: 'center',
  },

  // 列表模板
  listTemplate: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  listText: {
    flex: 1,
  },

  // 详情模板
  detailTemplate: {
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius['2xl'],
    overflow: 'hidden',
  },

  // 个人中心模板
  profileTemplate: {
    marginHorizontal: 20,
  },
});

export default LoadingShimmer;

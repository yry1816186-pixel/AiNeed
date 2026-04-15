import React, { useEffect } from "react";
import { View, StyleSheet, DimensionValue, ViewStyle } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Colors, Spacing, BorderRadius } from '../design-system/theme';
import { useReducedMotion } from "../../hooks/useReducedMotion";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

// ============================================================================
// Shimmer Animation Hook
// ============================================================================

/**
 * useShimmerAnimation - 骨架屏闪光动画 hook
 * 使用 react-native-reanimated 实现流畅的从左到右 shimmer 效果
 */
function useShimmerAnimation(enabled = true) {
  const shimmerProgress = useSharedValue(0);
  const { reducedMotion } = useReducedMotion();
  const shouldAnimate = enabled && !reducedMotion;

  useEffect(() => {
    if (shouldAnimate) {
      shimmerProgress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }
  }, [shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerProgress.value, [0, 1], [-200, 200]) }],
  }));

  return { animatedStyle, shouldAnimate };
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  /** 是否启用 shimmer 动画（默认 true） */
  animated?: boolean;
  /** shimmer 高光颜色 */
  shimmerColor?: string;
  /** 底色 */
  baseColor?: string;
}

/**
 * Skeleton - 基础骨架屏元素
 *
 * 支持两种模式：
 * 1. shimmer 动画模式（默认）- 使用 reanimated 实现流畅的从左到右闪光
 * 2. 静态渐变模式（animated=false）- 使用 LinearGradient
 */
export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
  shimmerColor = "rgba(255,255,255,0.4)",
  baseColor,
}: SkeletonProps) {
  const resolvedBaseColor = baseColor || Colors.neutral[200];
  const { animatedStyle, shouldAnimate } = useShimmerAnimation(animated);

  if (shouldAnimate) {
    return (
      <View
        style={[
          styles.skeleton,
          { width: width as DimensionValue, height: height as DimensionValue, borderRadius, backgroundColor: resolvedBaseColor },
          style,
        ]}
      >
        <View style={styles.shimmerContainer}>
          <AnimatedView style={[styles.shimmer, animatedStyle]}>
            <LinearGradient
              colors={["transparent", shimmerColor, "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </AnimatedView>
        </View>
      </View>
    );
  }

  // 静态渐变模式（向后兼容 / 无障碍模式）
  return (
    <View
      style={[
        styles.skeleton,
        { width: width as DimensionValue, height: height as DimensionValue, borderRadius, backgroundColor: resolvedBaseColor },
        style,
      ]}
    >
      <LinearGradient
        colors={[Colors.neutral[200], Colors.neutral[100], Colors.neutral[200]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
    </View>
  );
}

// ============================================================================
// Composite Skeleton Components
// ============================================================================

export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  spacing = 8,
  style,
}: {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "60%" : "100%"}
          height={lineHeight}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="100%" height={150} borderRadius={8} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="30%" height={18} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.listItem} />
      ))}
    </View>
  );
}

export function SkeletonGrid({
  columns = 2,
  rows = 3,
  gap = 16,
  style,
}: {
  columns?: number;
  rows?: number;
  gap?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.grid, { gap }, style]}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <View key={colIndex} style={styles.gridItem}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// LoadingShimmer - 变体骨架屏组件（合并自 LoadingShimmer.tsx）
// ============================================================================

/**
 * Shimmer - 单个骨架屏元素（兼容 LoadingShimmer 内部组件）
 */
export const Shimmer: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({ width, height, borderRadius = BorderRadius.md, style }) => {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} style={style} />;
};

/**
 * LoadingShimmer - 变体骨架屏加载组件
 *
 * 设计特点：
 * - 多种预设模板（卡片/列表/详情/个人中心）
 * - 流畅的 shimmer 动画（从左到右）
 * - 自定义尺寸支持
 * - 符合主题令牌的颜色系统
 * - 支持无障碍 reducedMotion
 */
export const LoadingShimmer: React.FC<{
  variant?: "card" | "list" | "detail" | "profile";
}> = ({ variant = "card" }) => {
  switch (variant) {
    case "card":
      return (
        <View style={styles.cardTemplate}>
          <Shimmer width={140} height={180} borderRadius={BorderRadius["2xl"]} />
          <View style={styles.cardText}>
            <Shimmer width={120} height={16} />
            <Shimmer width={80} height={12} style={{ marginTop: 8 }} />
            <Shimmer width={60} height={14} style={{ marginTop: 8 }} />
          </View>
        </View>
      );

    case "list":
      return (
        <View style={styles.listTemplate}>
          <Shimmer width={60} height={60} borderRadius={30} />
          <View style={styles.listText}>
            <Shimmer width={150} height={16} />
            <Shimmer width={200} height={12} style={{ marginTop: 8 }} />
          </View>
        </View>
      );

    case "detail":
      return (
        <View style={styles.detailTemplate}>
          <Shimmer width="100%" height={300} borderRadius={0} />
          <View style={{ padding: 20 }}>
            <Shimmer width={200} height={28} />
            <Shimmer width={150} height={16} style={{ marginTop: 12 }} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <Shimmer width={80} height={24} borderRadius={12} />
              <Shimmer width={80} height={24} borderRadius={12} />
              <Shimmer width={80} height={24} borderRadius={12} />
            </View>
          </View>
        </View>
      );

    case "profile":
      return (
        <View style={styles.profileTemplate}>
          <Shimmer width="100%" height={160} borderRadius={BorderRadius["2xl"]} />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1 }}>
                <Shimmer width="100%" height={80} borderRadius={BorderRadius.xl} />
              </View>
            ))}
          </View>
        </View>
      );

    default:
      return null;
  }
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmer: {
    width: 400,
    height: "100%",
  },
  gradient: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardContent: {
    padding: 12,
  },
  listItem: {
    marginBottom: 12,
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  // LoadingShimmer 模板样式
  cardTemplate: {
    alignItems: "center",
    marginRight: 16,
  },
  cardText: {
    marginTop: 10,
    alignItems: "center",
  },
  listTemplate: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  listText: {
    flex: 1,
  },
  detailTemplate: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  profileTemplate: {
    marginHorizontal: 20,
  },
});

export default Skeleton;

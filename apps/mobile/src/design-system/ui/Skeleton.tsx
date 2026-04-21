/**
 * Skeleton - UI layer re-export from skeleton/Skeleton
 *
 * @deprecated Use `skeleton/Skeleton` instead. This file re-exports
 * the canonical implementation for backward compatibility.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Colors, Spacing, BorderRadius } from "../../design-system/theme";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";

// Re-export from canonical skeleton implementation
export {
  Skeleton as SkeletonBase,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonGrid,
  Shimmer,
  LoadingShimmer,
} from "../skeleton/Skeleton";

function useShimmerAnimation(speed = 1200) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: speed, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: speed, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => {
      // Animation auto-cancels when component unmounts via Reanimated
    };
  }, [speed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0, 1], [0.3, 1]),
  }));

  return animatedStyle;
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton - shimmer loading placeholder
 *
 * @deprecated Use `skeleton/Skeleton` for the canonical implementation with
 * proper shimmer animation. This version uses a simpler opacity pulse.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.md,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const animatedStyle = useShimmerAnimation();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.neutral[200],
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export interface CircleSkeletonProps {
  size?: number;
  style?: ViewStyle;
}

/** @deprecated Use `skeleton/Skeleton` instead */
export const CircleSkeleton: React.FC<CircleSkeletonProps> = ({ size = 48, style }) => {
  const { colors } = useTheme();
  const animatedStyle = useShimmerAnimation();
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.neutral[200],
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export interface TextSkeletonProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: number;
  style?: ViewStyle;
}

/** @deprecated Use `skeleton/Skeleton` or `SkeletonText` instead */
export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = 60,
  style,
}) => {
  const { colors } = useTheme();
  const animatedStyle = useShimmerAnimation();
  return (
    <View style={[{ width: "100%" }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Animated.View
          key={index}
          style={{
            width: index === lines - 1 ? `${lastLineWidth}%` : "100%",
            height: lineHeight,
            borderRadius: BorderRadius.sm,
            backgroundColor: colors.neutral[200],
            marginBottom: index < lines - 1 ? Spacing[2] : 0,
            ...animatedStyle,
          }}
        />
      ))}
    </View>
  );
};

export interface CardSkeletonProps {
  style?: ViewStyle;
}

/** @deprecated Use `skeleton/SkeletonCard` instead */
export const CardSkeleton: React.FC<CardSkeletonProps> = ({ style }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const animatedStyle = useShimmerAnimation();
  return (
    <Animated.View style={[styles.card, animatedStyle, style]}>
      <View style={[styles.cardImage, { backgroundColor: colors.neutral[100] }]} />
      <View style={styles.cardContent}>
        <View style={[styles.line, { width: "70%", backgroundColor: colors.neutral[200] }]} />
        <View style={[styles.line, { width: "50%", backgroundColor: colors.neutral[200] }]} />
        <View
          style={[styles.line, { width: "40%", height: 18, backgroundColor: colors.neutral[200] }]}
        />
      </View>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: 180 },
  cardContent: { padding: Spacing.md, gap: Spacing[2] },
  line: { height: 14, borderRadius: BorderRadius.sm },
}));

export default Skeleton;

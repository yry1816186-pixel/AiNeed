import React, { useEffect, useCallback } from "react";
import { View, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

const BASE_COLOR = DesignTokens.colors.semantic.skeletonBase;
const SHIMMER_COLOR = DesignTokens.colors.semantic.skeletonShimmer;

export interface ShimmerSkeletonProps {
  /** Width of the skeleton rectangle */
  width?: DimensionValue;
  /** Height of the skeleton rectangle */
  height?: number;
  /** Border radius (default: 12) */
  borderRadius?: number;
  /** Override the base (background) color */
  baseColor?: string;
  /** Override the shimmer highlight color */
  shimmerColor?: string;
  /** Animation duration in ms (default: 1200) */
  duration?: number;
  /** Additional style overrides */
  style?: ViewStyle;
}

export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 12,
  baseColor = BASE_COLOR,
  shimmerColor = SHIMMER_COLOR,
  duration = 1200,
  style,
}) => {
  const progress = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      false // forward-only loop; interpolate handles the sweep
    );
  }, [duration, progress]);

  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      containerWidth.value = event.nativeEvent.layout.width;
    },
    [containerWidth]
  );

  // Shimmer overlay sweeps from -100% to +100% of container width
  const shimmerStyle = useAnimatedStyle(() => {
    const w = containerWidth.value;
    if (w === 0) {
      return { transform: [{ translateX: -999 }] };
    }
    // Sweep from left edge (-w) to right edge (+w)
    const tx = interpolate(progress.value, [0, 1], [-w, w], Extrapolation.CLAMP);
    return {
      transform: [{ translateX: tx }],
    };
  });

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      {/* Shimmer overlay with gradient approximation */}
      <View style={styles.shimmerClip}>
        <Animated.View style={[styles.shimmerBand, shimmerStyle]}>
          <View style={[styles.shimmerSegment, { backgroundColor: "transparent" }]} />
          <View style={[styles.shimmerSegment, { backgroundColor: shimmerColor }]} />
          <View style={[styles.shimmerSegment, { backgroundColor: "transparent" }]} />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  shimmerBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    // Width matches container so the 3-segment gradient sweeps fully across
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  shimmerSegment: {
    flex: 1,
    height: "100%",
  },
});

export default ShimmerSkeleton;

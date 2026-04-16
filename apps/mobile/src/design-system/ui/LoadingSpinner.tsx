import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Shadows } from '../../design-system/theme';

export type SpinnerSize = "sm" | "md" | "lg";

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  style?: ViewStyle;
  overlay?: boolean;
  text?: string;
}

const sizeMap: Record<SpinnerSize, number> = { sm: 20, md: 36, lg: 52 };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  color = Colors.primary[500],
  style,
  overlay = false,
  text,
}) => {
  const rotation = useSharedValue(0);
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
    pulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const spinnerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value * 360}deg` },
      { scale: interpolate(pulseProgress.value, [0, 1], [1, 1.08]) },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseProgress.value, [0, 1], [0.6, 1]),
  }));

  const spinnerSize = sizeMap[size];

  const spinner = (
    <Animated.View style={[spinnerAnimatedStyle, style]}>
      <View style={[styles.spinner, { width: spinnerSize, height: spinnerSize }]}>
        <View
          style={[
            styles.arc,
            {
              borderColor: color,
              width: spinnerSize,
              height: spinnerSize,
              borderRadius: spinnerSize / 2,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              width: spinnerSize * 0.2,
              height: spinnerSize * 0.2,
              borderRadius: spinnerSize * 0.1,
              top: spinnerSize * 0.05,
              left: (spinnerSize - spinnerSize * 0.2) / 2,
            },
          ]}
        />
      </View>
    </Animated.View>
  );

  if (overlay) {
    return (
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          {spinner}
          {text && (
            <Animated.Text style={[styles.overlayText, textAnimatedStyle]}>
              {text}
            </Animated.Text>
          )}
        </View>
      </View>
    );
  }

  return spinner;
};

export const InlineSpinner: React.FC<{ size?: SpinnerSize; color?: string; style?: ViewStyle }> = ({
  size = "sm",
  color,
  style,
}) => {
  const rotation = useSharedValue(0);
  const spinnerSize = sizeMap[size];
  const c = color || Colors.primary[500];

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    width: spinnerSize,
    height: spinnerSize,
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <View
        style={[
          styles.arc,
          {
            borderColor: c,
            width: spinnerSize,
            height: spinnerSize,
            borderRadius: spinnerSize / 2,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  spinner: { position: "relative", justifyContent: "center", alignItems: "center" },
  arc: { borderWidth: 2.5, borderTopColor: "transparent", borderRightColor: "transparent" },
  dot: { position: "absolute" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay.dark,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContent: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.lg,
  },
  overlayText: {
    marginTop: Spacing.md,
    color: Colors.neutral[600],
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LoadingSpinner;

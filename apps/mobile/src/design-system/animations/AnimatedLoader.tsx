import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated as RNAnimated,
  ViewStyle,
  Easing as RNEasing,
} from "react-native";
import { Duration } from "../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";

export interface AnimatedLoaderProps {
  variant?: "pulse" | "shimmer" | "spinner";
  size?: number;
  color?: string;
  style?: ViewStyle;
  borderRadius?: number;
  width?: number | string;
  height?: number;
}

export const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({
  variant = "pulse",
  size = 40,
  color = "#C67B5C",
  style,
  borderRadius = 8,
  width = "100%",
  height = 20,
}) => {
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  const shimmerAnim = useRef(new RNAnimated.Value(0)).current;
  const spinAnim = useRef(new RNAnimated.Value(0)).current;

  const isEnabled =
    !reducedMotion && featureFlags.isEnabled(FeatureFlagKeys.ENABLE_LOADING_ANIMATION);

  useEffect(() => {
    if (!isEnabled) return;

    if (variant === "pulse") {
      const anim = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 0.3,
            duration: Duration.slower,
            useNativeDriver: true,
            easing: RNEasing.inOut(RNEasing.ease),
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: Duration.slower,
            useNativeDriver: true,
            easing: RNEasing.inOut(RNEasing.ease),
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }

    if (variant === "shimmer") {
      const anim = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
            easing: RNEasing.inOut(RNEasing.ease),
          }),
          RNAnimated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }

    if (variant === "spinner") {
      const anim = RNAnimated.loop(
        RNAnimated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: RNEasing.linear,
        })
      );
      anim.start();
      return () => anim.stop();
    }
  }, [variant, isEnabled]);

  if (variant === "spinner") {
    const rotation = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={[styles.centered, style]}>
        <RNAnimated.View
          style={[
            styles.spinner,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
              transform: [{ rotate: isEnabled ? rotation : "0deg" }],
            },
          ]}
        />
      </View>
    );
  }

  if (variant === "shimmer") {
    const translateX = isEnabled
      ? shimmerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-200, 200],
        })
      : 0;

    return (
      <View
        style={[
          {
            width: width as number,
            height,
            borderRadius,
            backgroundColor: "#E5E7EB",
            overflow: "hidden",
          },
          style,
        ]}
      >
        <RNAnimated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ translateX }],
              opacity: 0.4,
            },
          ]}
        >
          <View
            style={{
              width: 200,
              height: "100%",
              backgroundColor: "#FFF",
            }}
          />
        </RNAnimated.View>
      </View>
    );
  }

  return (
    <RNAnimated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "#E5E7EB",
          opacity: isEnabled ? pulseAnim : 0.5,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    borderWidth: 3,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
});

export default AnimatedLoader;

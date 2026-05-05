import React, { useCallback } from "react";
import { ViewStyle, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { SpringConfigs } from "../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";

export interface PressableButtonProps {
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  hapticFeedback?: boolean;
  hapticStyle?: "light" | "medium" | "heavy";
  pressScale?: number;
  style?: ViewStyle;
  animated?: boolean;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

export const PressableButton: React.FC<PressableButtonProps> = ({
  onPress,
  onPressIn: onPressInProp,
  onPressOut: onPressOutProp,
  onLongPress,
  disabled = false,
  hapticFeedback = true,
  hapticStyle = "light",
  pressScale = 0.97,
  style,
  animated: animEnabled = true,
  children,
  accessibilityLabel,
}) => {
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();
  const scaleAnim = useSharedValue(1);

  const isEnabled =
    animEnabled &&
    !reducedMotion &&
    featureFlags.isEnabled(FeatureFlagKeys.ENABLE_BUTTON_PRESS_FEEDBACK);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isEnabled ? scaleAnim.value : 1 }],
  }));

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && Platform.OS !== "web") {
      const styleMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      Haptics.impactAsync(styleMap[hapticStyle]);
    }
  }, [hapticFeedback, hapticStyle]);

  const handlePressIn = useCallback(() => {
    if (isEnabled) {
      triggerHaptic();
      scaleAnim.value = withSpring(pressScale, SpringConfigs.snappy);
    }
    onPressInProp?.();
  }, [isEnabled, onPressInProp, triggerHaptic, pressScale]);

  const handlePressOut = useCallback(() => {
    if (isEnabled) {
      scaleAnim.value = withSpring(1, SpringConfigs.bouncy);
    }
    onPressOutProp?.();
  }, [isEnabled, onPressOutProp]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

export default PressableButton;

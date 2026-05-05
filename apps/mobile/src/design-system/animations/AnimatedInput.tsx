import React, { useCallback, useState } from "react";
import { ViewStyle, TextStyle, Platform } from "react-native";
import {
  TextInput,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as Haptics from "@/src/polyfills/expo-haptics";
import { Duration, SpringConfigs } from "../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";

export interface AnimatedInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  focusedBorderColor?: string;
  defaultBorderColor?: string;
  label?: string;
}

export const AnimatedInputWrapper: React.FC<AnimatedInputProps> = ({
  containerStyle,
  inputStyle,
  focusedBorderColor = "#C67B5C",
  defaultBorderColor = "#D1D5DB",
  label,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();
  const [isFocused, setIsFocused] = useState(false);

  const borderColorAnim = useSharedValue(0);
  const labelTranslateY = useSharedValue(0);
  const labelScale = useSharedValue(1);

  const isEnabled =
    !reducedMotion && featureFlags.isEnabled(FeatureFlagKeys.ENABLE_INPUT_FOCUS_ANIMATION);

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(true);
      if (isEnabled) {
        borderColorAnim.value = withTiming(1, { duration: Duration.fast });
        labelTranslateY.value = withTiming(-10, { duration: Duration.fast });
        labelScale.value = withTiming(0.85, { duration: Duration.fast });
      }
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      onFocus?.(e);
    },
    [isEnabled, onFocus]
  );

  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      setIsFocused(false);
      if (isEnabled) {
        borderColorAnim.value = withTiming(0, { duration: Duration.fast });
        labelTranslateY.value = withTiming(0, { duration: Duration.fast });
        labelScale.value = withTiming(1, { duration: Duration.fast });
      }
      onBlur?.(e);
    },
    [isEnabled, onBlur]
  );

  const containerStyleAnimated = useAnimatedStyle(() => ({
    borderColor: isEnabled
      ? isFocused
        ? focusedBorderColor
        : defaultBorderColor
      : defaultBorderColor,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: isEnabled ? labelTranslateY.value : 0 },
      { scale: isEnabled ? labelScale.value : 1 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          borderWidth: 1.5,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: "#F9FAFB",
        },
        containerStyleAnimated,
        containerStyle,
      ]}
    >
      {label && (
        <Animated.Text
          style={[
            {
              fontSize: 12,
              fontWeight: "500",
              color: isFocused ? focusedBorderColor : "#9CA3AF",
              marginBottom: 2,
            },
            labelAnimatedStyle,
          ]}
        >
          {label}
        </Animated.Text>
      )}
      <TextInput
        {...textInputProps}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          {
            fontSize: 16,
            color: "#1A1A18",
            paddingVertical: 4,
          },
          inputStyle,
        ]}
        placeholderTextColor="#9CA3AF"
      />
    </Animated.View>
  );
};

export default AnimatedInputWrapper;

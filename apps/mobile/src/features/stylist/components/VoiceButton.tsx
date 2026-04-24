import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  cancelAnimation,
} from "react-native-reanimated";
import { Microphone } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

export interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
}

/**
 * VoiceButton - Voice recording button with pulse ring animation.
 *
 * Design:
 * - 56x56 terracotta gradient mic button
 * - Pulse ring expands when listening (scale 1 -> 1.8, fading out)
 * - Button itself subtly pulses scale when active
 * - Uses phosphor-react-native Microphone icon
 */
export const VoiceButton: React.FC<VoiceButtonProps> = ({ isListening, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      ringScale.value = withRepeat(withTiming(1.8, { duration: 1200 }), -1, false);
      ringOpacity.value = withRepeat(withSequence(withTiming(0.3), withTiming(0)), -1, false);
      buttonScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
    } else {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(buttonScale);
      ringScale.value = 1;
      ringOpacity.value = 0;
      buttonScale.value = withSpring(1, SpringConfigs.snappy);
    }

    return () => {
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(buttonScale);
    };
  }, [isListening]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const terracotta = DesignTokens.colors.brand.terracotta;
  const terracottaLight = DesignTokens.colors.brand.terracottaLight;

  return (
    <View style={styles.wrapper}>
      {/* Pulse ring */}
      <Animated.View
        style={[styles.pulseRing, { borderColor: terracotta }, ringStyle]}
        pointerEvents="none"
      />

      {/* Mic button */}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Voice input">
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: terracotta,
              borderColor: terracottaLight,
            },
            buttonAnimStyle,
          ]}
        >
          <Microphone size={24} color={DesignTokens.colors.neutral.white} weight="fill" />
        </Animated.View>
      </Pressable>
    </View>
  );
};

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    wrapper: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    pulseRing: {
      position: "absolute",
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 2,
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      ...DesignTokens.shadows.md,
    },
  })
);

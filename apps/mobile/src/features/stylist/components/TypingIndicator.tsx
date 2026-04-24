import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

/**
 * TypingIndicator - Three bouncing dots indicating AI is typing.
 *
 * Design:
 * - 3 terracotta dots, each 8px circle, bouncing in sequence
 * - Staggered delay per dot for a natural wave effect
 * - Light surface card container with subtle border
 */
export const TypingIndicator: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    const bounce = (sv: Animated.SharedValue<number>) =>
      withDelay(
        0,
        withRepeat(
          withSequence(withTiming(-8, { duration: 300 }), withTiming(0, { duration: 300 })),
          -1,
          false
        )
      );

    dot1Y.value = bounce(dot1Y);
    dot2Y.value = withDelay(150, bounce(dot2Y));
    dot3Y.value = withDelay(300, bounce(dot3Y));

    return () => {
      cancelAnimation(dot1Y);
      cancelAnimation(dot2Y);
      cancelAnimation(dot3Y);
    };
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1Y.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2Y.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3Y.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, dot1Style]} />
      <Animated.View style={[styles.dot, dot2Style]} />
      <Animated.View style={[styles.dot, dot3Style]} />
    </View>
  );
};

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      padding: 12,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: DesignTokens.borderRadius.xl,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignSelf: "flex-start",
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: DesignTokens.colors.brand.terracotta,
    },
  })
);

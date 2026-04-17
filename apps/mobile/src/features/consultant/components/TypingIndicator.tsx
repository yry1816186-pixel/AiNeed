import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


export const TypingIndicator: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  useEffect(() => {
    const bounce = (value: Animated.SharedValue<number>, delayMs: number) => {
      value.value = withDelay(delayMs, withRepeat(withTiming(-6, { duration: 300 }), -1, true));
    };
    bounce(dot1Y, 0);
    bounce(dot2Y, 150);
    bounce(dot3Y, 300);
  }, [dot1Y, dot2Y, dot3Y]);

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1Y.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2Y.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3Y.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, dot1Style]} />
      <Animated.View style={[styles.dot, dot2Style]} />
      <Animated.View style={[styles.dot, dot3Style]} />
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
}))

export default TypingIndicator;

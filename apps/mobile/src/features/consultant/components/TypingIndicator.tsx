import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";

export const TypingIndicator: React.FC = () => {
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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
});

export default TypingIndicator;

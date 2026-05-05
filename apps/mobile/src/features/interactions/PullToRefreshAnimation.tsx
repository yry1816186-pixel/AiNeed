import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { Duration } from "../../design-system/theme/tokens/animations";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const OUTER_RADIUS = 16;
const STROKE_WIDTH = 3;
const SVG_SIZE = (OUTER_RADIUS + STROKE_WIDTH) * 2;
const CENTER = SVG_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * OUTER_RADIUS;

interface PullToRefreshAnimationProps {
  progress: Animated.SharedValue<number>; // 0-1 pull progress
  refreshing: boolean;
}

export const PullToRefreshAnimation: React.FC<PullToRefreshAnimationProps> = ({
  progress,
  refreshing,
}) => {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      rotation.value = withRepeat(
        withTiming(360, {
          duration: Duration.slower * 3,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
    }
    return () => cancelAnimation(rotation);
  }, [refreshing, rotation]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Animated arc: dashoffset decreases as progress increases (revealing the arc)
  const arcAnimStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? 1 : progress.value * 0.8 + 0.2,
  }));

  const dashOffset = refreshing
    ? CIRCUMFERENCE * 0.3
    : CIRCUMFERENCE * (1 - progress.value);

  return (
    <View style={styles.container}>
      <Animated.View style={[containerAnimStyle, arcAnimStyle]}>
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          {/* Outer ring */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_RADIUS}
            fill="none"
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
          />
          {/* Animated arc */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_RADIUS}
            fill="none"
            stroke={colors.primary}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${CENTER}, ${CENTER})`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
});

export default PullToRefreshAnimation;

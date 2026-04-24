import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  withSpring,
  withRepeat,
  interpolate,
  useDerivedValue,
} from "react-native-reanimated";

interface PullToRefreshProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 80;
const RING_SIZE = 32;
const STROKE_WIDTH = 3;

export function PullToRefresh({ isRefreshing, onRefresh, children }: PullToRefreshProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const scrollY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const hasTriggeredRefresh = useRef(false);

  // Spinning ring rotation when refreshing
  useEffect(() => {
    if (isRefreshing) {
      rotation.value = withRepeat(withTiming(360, { duration: 800 }), -1, false);
      checkScale.value = withSpring(0, SpringConfigs.snappy);
    } else {
      rotation.value = withSpring(0, SpringConfigs.snappy);
      checkScale.value = withSpring(1, SpringConfigs.bouncy);
      hasTriggeredRefresh.current = false;
    }
  }, [isRefreshing, rotation, checkScale]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Derived pull distance (negative scrollY when overscrolled at top)
  const pullDistance = useDerivedValue(() => {
    return Math.max(0, -scrollY.value);
  });

  const ringAnimatedStyle = useAnimatedStyle(() => {
    const distance = pullDistance.value;
    const opacity = interpolate(distance, [0, 30], [0, 1]);
    const translateY = interpolate(distance, [0, PULL_THRESHOLD], [-RING_SIZE, 0], "clamp");

    return {
      opacity,
      transform: [{ translateY }, { rotate: `${rotation.value}deg` }],
    };
  });

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: interpolate(checkScale.value, [0, 1], [0, 1]),
  }));

  const indicatorContainerStyle = useAnimatedStyle(() => {
    const distance = pullDistance.value;
    const height = interpolate(distance, [0, PULL_THRESHOLD], [0, 60], "clamp");
    return { height };
  });

  return (
    <View style={styles.container}>
      {/* Pull indicator area */}
      <Animated.View style={[styles.indicatorContainer, indicatorContainerStyle]}>
        <View style={styles.indicatorContent}>
          {/* Spinning ring */}
          <Animated.View style={ringAnimatedStyle}>
            <View style={styles.ringContainer}>
              <View style={styles.ring} />
            </View>
          </Animated.View>

          {/* Checkmark on complete */}
          <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
            <Text style={styles.checkmark}>✓</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
  },
  indicatorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  indicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: DesignTokens.spacing[2],
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: DesignTokens.colors.brand.terracotta,
    borderTopColor: "transparent",
  },
  checkContainer: {
    position: "absolute",
  },
  checkmark: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: DesignTokens.colors.semantic.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
}));

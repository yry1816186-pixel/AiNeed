import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors } from '../design-system/theme';
import { SpringConfigs, Duration } from "../../theme/tokens/animations";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export interface AnimatedHeartButtonProps {
  /** Whether the item is currently favorited */
  isFavorite: boolean;
  /** Called when the heart is pressed */
  onPress: () => void;
  /** Current favorite count (optional, for +1 animation) */
  count?: number;
  /** Size of the heart icon */
  size?: number;
  /** Additional style */
  style?: any;
}

/**
 * Animated heart button with:
 * - Bouncy spring fill animation (outline -> filled)
 * - +1 popup fade-out on favorite
 * - Uses SpringConfigs.bouncy for celebration feel
 * - Respects reducedMotion
 */
export const AnimatedHeartButton: React.FC<AnimatedHeartButtonProps> = ({
  isFavorite,
  onPress,
  count,
  size = 24,
  style,
}) => {
  const { reducedMotion } = useReducedMotion();
  const scale = useSharedValue(1);
  const fillProgress = useSharedValue(isFavorite ? 1 : 0);
  const plusOneOpacity = useSharedValue(0);
  const plusOneTranslateY = useSharedValue(0);

  // Animate fill on isFavorite change
  useEffect(() => {
    if (reducedMotion) {
      fillProgress.value = isFavorite ? 1 : 0;
      scale.value = 1;
      return;
    }

    if (isFavorite) {
      // Bouncy fill animation: scale up then settle
      scale.value = withSequence(
        withSpring(1.4, SpringConfigs.bouncy),
        withSpring(1, SpringConfigs.bouncy)
      );
      fillProgress.value = withTiming(1, { duration: Duration.fastest });

      // +1 popup animation
      plusOneOpacity.value = withSequence(
        withTiming(1, { duration: Duration.fastest }),
        withDelay(600, withTiming(0, { duration: Duration.slow }))
      );
      plusOneTranslateY.value = withSequence(
        withTiming(-20, { duration: Duration.fast, easing: Easing.out(Easing.ease) }),
        withDelay(600, withTiming(-30, { duration: Duration.slow }))
      );
    } else {
      // Unfavorite: quick scale down then back
      scale.value = withSequence(
        withTiming(0.8, { duration: Duration.fastest }),
        withSpring(1, SpringConfigs.snappy)
      );
      fillProgress.value = withTiming(0, { duration: Duration.fast });
      plusOneOpacity.value = 0;
    }
  }, [isFavorite, reducedMotion]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const plusOneStyle = useAnimatedStyle(() => ({
    opacity: plusOneOpacity.value,
    transform: [{ translateY: plusOneTranslateY.value }],
  }));

  const iconName = isFavorite ? "heart" : "heart-outline";
  const iconColor = isFavorite ? Colors.rose[500] : Colors.neutral[400];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? "取消收藏" : "收藏"}
      style={[styles.container, style]}
    >
      <Animated.View style={heartStyle}>
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={iconColor} />
      </Animated.View>

      {/* +1 popup */}
      {isFavorite && (
        <Animated.View style={[styles.plusOneContainer, plusOneStyle]}>
          <Text style={styles.plusOneText}>+1</Text>
        </Animated.View>
      )}

      {/* Count badge */}
      {count !== undefined && count > 0 && (
        <Text style={styles.countText}>{count}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  plusOneContainer: {
    position: "absolute",
    top: -8,
    right: -16,
  },
  plusOneText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.rose[500],
  },
  countText: {
    fontSize: 10,
    color: Colors.neutral[500],
    marginTop: 2,
  },
});

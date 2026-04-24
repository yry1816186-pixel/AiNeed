import React, { useEffect, createContext, useContext, useMemo } from "react";
import { ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Context for coordinating shared transitions across screens
// ---------------------------------------------------------------------------

interface TransitionState {
  isActive: boolean;
  progress: Animated.SharedValue<number>;
}

const SharedTransitionContext = createContext<TransitionState | null>(null);

/**
 * Provider that controls the shared transition lifecycle.
 * Wrap both the "from" and "to" screens with this provider during navigation.
 */
export const SharedTransitionProvider: React.FC<{
  children: React.ReactNode;
  isActive: boolean;
}> = ({ children, isActive }) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isActive, progress]);

  const value = useMemo(() => ({ isActive, progress }), [isActive, progress]);

  return (
    <SharedTransitionContext.Provider value={value}>{children}</SharedTransitionContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook: useSharedTransition
// ---------------------------------------------------------------------------

/**
 * Returns an animated style for cross-fade + scale shared transition.
 * Elements with the same `id` will visually share the transition.
 *
 * Usage:
 * ```tsx
 * const animatedStyle = useSharedTransition("product-image-42");
 * return <Animated.View style={animatedStyle}>...</Animated.View>;
 * ```
 */
export function useSharedTransition(_id: string): Record<string, unknown> {
  const context = useContext(SharedTransitionContext);
  const fallbackProgress = useSharedValue(1);

  const progress = context?.progress ?? fallbackProgress;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return animatedStyle as unknown as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component: SharedTransition wrapper
// ---------------------------------------------------------------------------

export interface SharedTransitionProps {
  /** Unique id -- elements with the same id share the transition */
  id: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Wrapper component for shared element transitions between screens.
 * Renders an Animated.View with cross-fade + scale animation.
 *
 * Usage:
 * ```tsx
 * <SharedTransition id="hero-image" style={{ flex: 1 }}>
 *   <Image source={...} />
 * </SharedTransition>
 * ```
 */
export const SharedTransition: React.FC<SharedTransitionProps> = ({ id, children, style }) => {
  const animatedStyle = useSharedTransition(id);

  return <Animated.View style={[animatedStyle as ViewStyle, style]}>{children}</Animated.View>;
};

export default SharedTransition;

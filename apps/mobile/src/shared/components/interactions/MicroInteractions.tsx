import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";

import * as Haptics from "@/src/polyfills/expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
  cancelAnimation,
  useAnimatedRef,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors } from '../../../design-system/theme';
import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const { width: _SCREEN_WIDTH, height: _SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);
const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

const bounceSpringConfig = {
  damping: 8,
  stiffness: 300,
  mass: 0.3,
};

export interface RippleEffectProps {
  color?: string;
  duration?: number;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  enableHaptic?: boolean;
  hapticStyle?: "light" | "medium" | "heavy" | "success" | "warning" | "error";
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleCircleProps {
  color: string;
  duration: number;
  onComplete: (id: number) => void;
  ripple: Ripple;
}

const RippleCircle: React.FC<RippleCircleProps> = ({ color, duration, onComplete, ripple }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration }, (finished) => {
      if (finished) {
        runOnJS(onComplete)(ripple.id);
      }
    });
  }, [duration, onComplete, progress, ripple.id]);

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ripple.x },
      { translateY: ripple.y },
      { scale: interpolate(progress.value, [0, 1], [0, 4]) },
    ],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.5, 0.3, 0]),
  }));

  return (
    <AnimatedView
      style={[styles.ripple, { backgroundColor: color }, rippleAnimatedStyle]}
      pointerEvents="none"
    />
  );
};

export const RippleEffect: React.FC<RippleEffectProps> = ({
  color = "rgba(255,255,255,0.3)",
  duration = 600,
  children,
  style,
  onPress,
  onLongPress,
  enableHaptic = true,
  hapticStyle = "light",
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counterRef = useRef(0);
  const containerRef = useAnimatedRef<View>();
  const scale = useSharedValue(1);
  const { reducedMotionSV } = useReducedMotion();

  const triggerHaptic = useCallback(() => {
    if (!enableHaptic) {
      return;
    }

    switch (hapticStyle) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  }, [enableHaptic, hapticStyle]);

  const removeRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
  }, []);

  const addRipple = useCallback((x: number, y: number) => {
    const id = counterRef.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
  }, []);

  const gesture = Gesture.Tap()
    .onBegin((event) => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(0.97, { duration: 0 });
      } else {
        scale.value = withSpring(0.97, springConfig);
      }
      runOnJS(addRipple)(event.x, event.y);
      runOnJS(triggerHaptic)();
    })
    .onFinalize(() => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(1, { duration: 0 });
      } else {
        scale.value = withSpring(1, springConfig);
      }
    })
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(0.95, { duration: 0 });
      } else {
        scale.value = withSpring(0.95, springConfig);
      }
      runOnJS(triggerHaptic)();
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
    })
    .onEnd(() => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(1, { duration: 0 });
      } else {
        scale.value = withSpring(1, springConfig);
      }
    });

  const composedGesture = Gesture.Race(gesture, longPressGesture);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView
        ref={containerRef}
        style={[styles.rippleContainer, style, containerAnimatedStyle]}
      >
        {children}
        {ripples.map((ripple) => (
          <RippleCircle
            key={ripple.id}
            color={color}
            duration={duration}
            onComplete={removeRipple}
            ripple={ripple}
          />
        ))}
      </AnimatedView>
    </GestureDetector>
  );
};

export interface MagneticButtonProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  magneticStrength?: number;
  enableHaptic?: boolean;
  glowColor?: string;
  enableGlow?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  style,
  onPress,
  magneticStrength = 0.3,
  enableHaptic = true,
  glowColor = Colors.primary[500],
  enableGlow = true,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const { reducedMotionSV } = useReducedMotion();

  const gesture = Gesture.Pan()
    .onBegin(() => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(1.05, { duration: 0 });
      } else {
        scale.value = withSpring(1.05, bounceSpringConfig);
      }
      glowIntensity.value = withTiming(1, { duration: 200 });
      if (enableHaptic) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onUpdate((event) => {
      translateX.value = event.translationX * magneticStrength;
      translateY.value = event.translationY * magneticStrength;
      rotation.value = interpolate(event.translationX, [-50, 0, 50], [-5, 0, 5], Extrapolate.CLAMP);
    })
    .onEnd(() => {
      if (reducedMotionSV.value) {
        translateX.value = withTiming(0, { duration: 0 });
        translateY.value = withTiming(0, { duration: 0 });
        scale.value = withTiming(1, { duration: 0 });
        rotation.value = withTiming(0, { duration: 0 });
      } else {
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
        scale.value = withSpring(1, springConfig);
        rotation.value = withSpring(0, springConfig);
      }
      glowIntensity.value = withTiming(0, { duration: 300 });
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowIntensity.value, [0, 1], [0, 0.6]),
    shadowRadius: interpolate(glowIntensity.value, [0, 1], [0, 25]),
    elevation: interpolate(glowIntensity.value, [0, 1], [0, 15]),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedPressable style={[style, animatedStyle, enableGlow && glowAnimatedStyle]}>
        {children}
      </AnimatedPressable>
    </GestureDetector>
  );
};

export interface BounceCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  bounceIntensity?: "light" | "medium" | "heavy";
  enable3D?: boolean;
  perspective?: number;
}

export const BounceCard: React.FC<BounceCardProps> = ({
  children,
  style,
  onPress,
  bounceIntensity = "medium",
  enable3D = true,
  perspective = 1000,
}) => {
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const translateZ = useSharedValue(0);
  const { reducedMotionSV } = useReducedMotion();

  const intensityMap = {
    light: { scale: 0.98, rotation: 3 },
    medium: { scale: 0.95, rotation: 8 },
    heavy: { scale: 0.92, rotation: 15 },
  };

  const config = intensityMap[bounceIntensity];

  const gesture = Gesture.Tap()
    .onBegin(() => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(config.scale, { duration: 0 });
      } else {
        scale.value = withSpring(config.scale, bounceSpringConfig);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onFinalize(() => {
      if (reducedMotionSV.value) {
        scale.value = withTiming(1, { duration: 0 });
      } else {
        scale.value = withSpring(1, bounceSpringConfig);
      }
    })
    .onEnd(() => {
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!enable3D) {
        return;
      }
      rotateX.value = interpolate(
        event.translationY,
        [-100, 0, 100],
        [config.rotation, 0, -config.rotation],
        Extrapolate.CLAMP
      );
      rotateY.value = interpolate(
        event.translationX,
        [-100, 0, 100],
        [-config.rotation, 0, config.rotation],
        Extrapolate.CLAMP
      );
      translateZ.value = interpolate(
        Math.sqrt(event.translationX ** 2 + event.translationY ** 2),
        [0, 100],
        [0, 20],
        Extrapolate.CLAMP
      );
    })
    .onEnd(() => {
      if (reducedMotionSV.value) {
        rotateX.value = withTiming(0, { duration: 0 });
        rotateY.value = withTiming(0, { duration: 0 });
        translateZ.value = withTiming(0, { duration: 0 });
      } else {
        rotateX.value = withSpring(0, springConfig);
        rotateY.value = withSpring(0, springConfig);
        translateZ.value = withSpring(0, springConfig);
      }
    });

  const composedGesture = Gesture.Simultaneous(gesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { perspective },
        { scale: scale.value },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>
    </GestureDetector>
  );
};

export interface SwipeActionProps {
  children: React.ReactNode;
  style?: ViewStyle;
  leftActions?: {
    icon: string;
    label: string;
    color: string;
    onPress: () => void;
  }[];
  rightActions?: {
    icon: string;
    label: string;
    color: string;
    onPress: () => void;
  }[];
  swipeThreshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const SwipeAction: React.FC<SwipeActionProps> = ({
  children,
  style,
  leftActions = [],
  rightActions = [],
  swipeThreshold = 100,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const translateX = useSharedValue(0);
  const actionOpacity = useSharedValue(0);
  const _activeAction = useSharedValue<string | null>(null);
  const { reducedMotionSV } = useReducedMotion();

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      actionOpacity.value = Math.min(Math.abs(event.translationX) / swipeThreshold, 1);
    })
    .onEnd((event) => {
      if (event.translationX > swipeThreshold && rightActions.length > 0) {
        translateX.value = withTiming(150, { duration: reducedMotionSV.value ? 0 : 200 });
        if (onSwipeRight) {
          runOnJS(onSwipeRight)();
        }
      } else if (event.translationX < -swipeThreshold && leftActions.length > 0) {
        translateX.value = withTiming(-150, { duration: reducedMotionSV.value ? 0 : 200 });
        if (onSwipeLeft) {
          runOnJS(onSwipeLeft)();
        }
      } else {
        if (reducedMotionSV.value) {
          translateX.value = withTiming(0, { duration: 0 });
        } else {
          translateX.value = withSpring(0, springConfig);
        }
        actionOpacity.value = withTiming(0, { duration: reducedMotionSV.value ? 0 : 200 });
      }
    });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, swipeThreshold], [0, 1]),
    transform: [{ translateX: interpolate(translateX.value, [-100, 0], [0, -100]) }],
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, 0], [1, 0]),
    transform: [{ translateX: interpolate(translateX.value, [0, 100], [100, 0]) }],
  }));

  return (
    <View style={[styles.swipeContainer, style]}>
      <View style={styles.actionsContainer}>
        {leftActions.length > 0 && (
          <AnimatedView style={[styles.leftActions, leftActionStyle]}>
            {leftActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={action.onPress}
              >
                <Ionicons name={action.icon} size={24} color={DesignTokens.colors.text.inverse} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </AnimatedView>
        )}
        {rightActions.length > 0 && (
          <AnimatedView style={[styles.rightActions, rightActionStyle]}>
            {rightActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={action.onPress}
              >
                <Ionicons name={action.icon} size={24} color={DesignTokens.colors.text.inverse} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </AnimatedView>
        )}
      </View>
      <GestureDetector gesture={gesture}>
        <AnimatedView style={contentAnimatedStyle}>{children}</AnimatedView>
      </GestureDetector>
    </View>
  );
};

export interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  style?: ViewStyle;
  headerHeight?: number;
  renderHeader?: (progress: number) => React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshing = false,
  style,
  headerHeight = 80,
  renderHeader,
}) => {
  const translateY = useSharedValue(0);
  const progress = useSharedValue(0);
  const isRefreshing = useSharedValue(false);
  const rotation = useSharedValue(0);
  const { reducedMotion, reducedMotionSV } = useReducedMotion();

  useEffect(() => {
    if (refreshing) {
      isRefreshing.value = true;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      isRefreshing.value = false;
      rotation.value = withTiming(0, { duration: 200 });
      if (reducedMotion) {
        translateY.value = withTiming(0, { duration: 0 });
      } else {
        translateY.value = withSpring(0, springConfig);
      }
    }
  }, [refreshing, reducedMotion]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0 && !isRefreshing.value) {
        translateY.value = event.translationY * 0.5;
        progress.value = Math.min(event.translationY / headerHeight, 1);
      }
    })
    .onEnd((event) => {
      if (event.translationY > headerHeight && !isRefreshing.value) {
        if (reducedMotionSV.value) {
          translateY.value = withTiming(headerHeight, { duration: 0 });
        } else {
          translateY.value = withSpring(headerHeight, springConfig);
        }
        progress.value = 1;
        isRefreshing.value = true;
        rotation.value = withRepeat(
          withTiming(360, { duration: 1000, easing: Easing.linear }),
          -1,
          false
        );
        runOnJS(onRefresh)();
      } else {
        if (reducedMotionSV.value) {
          translateY.value = withTiming(0, { duration: 0 });
        } else {
          translateY.value = withSpring(0, springConfig);
        }
        progress.value = 0;
      }
    });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const spinnerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const defaultHeader = (prog: number) => (
    <View style={styles.refreshHeader}>
      <AnimatedView style={spinnerAnimatedStyle}>
        <Ionicons name="refresh" size={28} color={Colors.primary[500]} />
      </AnimatedView>
      <Text style={styles.refreshText}>
        {refreshing ? "刷新中..." : prog > 0.5 ? "松开刷新" : "下拉刷新"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.pullContainer, style]}>
      <AnimatedView
        style={[styles.headerContainer, { height: headerHeight }, contentAnimatedStyle]}
      >
        {renderHeader ? renderHeader(progress.value) : defaultHeader(progress.value)}
      </AnimatedView>
      <GestureDetector gesture={gesture}>
        <AnimatedView style={contentAnimatedStyle}>{children}</AnimatedView>
      </GestureDetector>
    </View>
  );
};

export interface LongPressDragProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onDragStart?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  dragDisabled?: boolean;
}

export const LongPressDrag: React.FC<LongPressDragProps> = ({
  children,
  style,
  onDragStart,
  onDragEnd,
  onPositionChange,
  dragDisabled = false,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const { reducedMotionSV } = useReducedMotion();

  const gesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      if (dragDisabled) {
        return;
      }
      isDragging.value = true;
      if (reducedMotionSV.value) {
        scale.value = withTiming(1.05, { duration: 0 });
      } else {
        scale.value = withSpring(1.05, bounceSpringConfig);
      }
      opacity.value = withTiming(0.9, { duration: 150 });
      zIndex.value = 100;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (onDragStart) {
        runOnJS(onDragStart)();
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!isDragging.value) {
        return;
      }
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      if (onPositionChange) {
        runOnJS(onPositionChange)({
          x: event.translationX,
          y: event.translationY,
        });
      }
    })
    .onEnd((event) => {
      if (!isDragging.value) {
        return;
      }
      isDragging.value = false;
      if (reducedMotionSV.value) {
        scale.value = withTiming(1, { duration: 0 });
        translateX.value = withTiming(0, { duration: 0 });
        translateY.value = withTiming(0, { duration: 0 });
      } else {
        scale.value = withSpring(1, springConfig);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      }
      opacity.value = withTiming(1, { duration: 150 });
      zIndex.value = 1;
      if (onDragEnd) {
        runOnJS(onDragEnd)({ x: event.translationX, y: event.translationY });
      }
    });

  const composedGesture = Gesture.Simultaneous(gesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>
    </GestureDetector>
  );
};

export interface PinchZoomProps {
  children: React.ReactNode;
  style?: ViewStyle;
  minScale?: number;
  maxScale?: number;
  onScaleChange?: (scale: number) => void;
  onDoubleTap?: () => void;
}

export const PinchZoom: React.FC<PinchZoomProps> = ({
  children,
  style,
  minScale = 0.5,
  maxScale = 3,
  onScaleChange,
  onDoubleTap,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const _focalX = useSharedValue(0);
  const _focalY = useSharedValue(0);
  const { reducedMotionSV } = useReducedMotion();

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
      if (onScaleChange) {
        runOnJS(onScaleChange)(scale.value);
      }
    })
    .onEnd(() => {
      if (scale.value < minScale) {
        scale.value = reducedMotionSV.value
          ? withTiming(minScale, { duration: 0 })
          : withSpring(minScale, springConfig);
      } else if (scale.value > maxScale) {
        scale.value = reducedMotionSV.value
          ? withTiming(maxScale, { duration: 0 })
          : withSpring(maxScale, springConfig);
      }
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        if (reducedMotionSV.value) {
          translateX.value = withTiming(0, { duration: 0 });
          translateY.value = withTiming(0, { duration: 0 });
        } else {
          translateX.value = withSpring(0, springConfig);
          translateY.value = withSpring(0, springConfig);
        }
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        if (reducedMotionSV.value) {
          scale.value = withTiming(1, { duration: 0 });
          translateX.value = withTiming(0, { duration: 0 });
          translateY.value = withTiming(0, { duration: 0 });
        } else {
          scale.value = withSpring(1, springConfig);
          translateX.value = withSpring(0, springConfig);
          translateY.value = withSpring(0, springConfig);
        }
        savedScale.value = 1;
      } else {
        scale.value = reducedMotionSV.value
          ? withTiming(2, { duration: 0 })
          : withSpring(2, springConfig);
        savedScale.value = 2;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (onDoubleTap) {
        runOnJS(onDoubleTap)();
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView style={[style, animatedStyle]}>{children}</AnimatedView>
    </GestureDetector>
  );
};

export interface HapticFeedbackProps {
  trigger: boolean;
  style?: "impact" | "notification" | "selection";
  impactStyle?: Haptics.ImpactFeedbackStyle;
  notificationType?: Haptics.NotificationFeedbackType;
  onComplete?: () => void;
}

export const useHapticFeedback = () => {
  const impact = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
      Haptics.impactAsync(style);
    },
    []
  );

  const notification = useCallback(
    (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
      Haptics.notificationAsync(type);
    },
    []
  );

  const selection = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  return { impact, notification, selection };
};

const styles = StyleSheet.create({
  rippleContainer: {
    overflow: "hidden",
  },
  ripple: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -50,
    left: -50,
  },
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
  },
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  leftActions: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
  },
  rightActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
  },
  actionButton: {
    width: 75,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    color: DesignTokens.colors.text.inverse,
    marginTop: 4,
    fontWeight: "500",
  },
  pullContainer: {
    flex: 1,
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshHeader: {
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.neutral[500],
  },
});

export default {
  RippleEffect,
  MagneticButton,
  BounceCard,
  SwipeAction,
  PullToRefresh,
  LongPressDrag,
  PinchZoom,
  useHapticFeedback,
};

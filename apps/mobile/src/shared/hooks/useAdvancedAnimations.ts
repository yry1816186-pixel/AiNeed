import React, { useEffect, useCallback } from "react";
import {
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Gesture } from "react-native-gesture-handler";
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
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { DesignTokens, flatColors as colors } from '../../design-system/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const { createAnimatedComponent } = AnimatedReanimated;

export interface ParallaxConfig {
  speed: number;
  direction: "vertical" | "horizontal";
  enabled: boolean;
}

export interface LiquidGlassConfig {
  blur: number;
  saturation: number;
  brightness: number;
  contrast: number;
  tint: "light" | "dark" | "extraLight" | "extraDark";
  borderRadius: number;
}

export const useParallax = (
  config: ParallaxConfig = { speed: 0.5, direction: "vertical", enabled: true }
) => {
  const { colors } = useTheme();
  const scrollY = useSharedValue(0);
  const translateY = useSharedValue(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { y } = event.nativeEvent.contentOffset;
      scrollY.value = y;
      translateY.value = y * config.speed;
    },
    [config.speed]
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (!config.enabled) {
      return {};
    }
    return {
      transform: [
        config.direction === "vertical"
          ? { translateY: -translateY.value }
          : { translateX: -translateY.value },
      ],
    };
  });

  return { onScroll, animatedStyle, scrollY };
};

export const useLiquidGlass = (
  config: LiquidGlassConfig = {
    blur: 20,
    saturation: 1.5,
    brightness: 1.1,
    contrast: 1,
    tint: "light",
    borderRadius: 24,
  }
) => {
  const intensity = useSharedValue(config.blur);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    intensity.value = withTiming(config.blur + 10, { duration: 150 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    intensity.value = withTiming(config.blur, { duration: 150 });
  };

  return {
    animatedStyle,
    intensity,
    onPressIn,
    onPressOut,
  };
};

export const use3DCard = () => {
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const perspective = 1000;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      rotateX.value = interpolate(
        event.translationY,
        [-100, 0, 100],
        [10, 0, -10],
        Extrapolate.CLAMP
      );
      rotateY.value = interpolate(
        event.translationX,
        [-100, 0, 100],
        [-10, 0, 10],
        Extrapolate.CLAMP
      );
    })
    .onEnd(() => {
      rotateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      rotateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const onPressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return {
    animatedStyle,
    gesture,
    onPressIn,
    onPressOut,
  };
};

export const useMagneticButton = () => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      const maxDistance = 30;
      translateX.value = Math.max(-maxDistance, Math.min(maxDistance, event.translationX * 0.5));
      translateY.value = Math.max(-maxDistance, Math.min(maxDistance, event.translationY * 0.5));
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    });

  const onPressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return {
    animatedStyle,
    gesture,
    onPressIn,
    onPressOut,
  };
};

export const useShimmer = () => {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerValue.value, [0, 0.5, 1], [0.3, 0.7, 0.3], Extrapolate.CLAMP),
  }));

  return animatedStyle;
};

export const usePulse = (duration: number = 1000) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      ),
      -1,
      true
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return animatedStyle;
};

export const useFloating = () => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
};

export const useGlow = (color: string = DesignTokens.colors.brand.terracotta) => {
  const glowValue = useSharedValue(0);

  useEffect(() => {
    glowValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(glowValue.value, [0, 1], [0.2, 0.6]),
    shadowRadius: interpolate(glowValue.value, [0, 1], [10, 25]),
    elevation: interpolate(glowValue.value, [0, 1], [5, 15]),
  }));

  return animatedStyle;
};

export const useRipple = () => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0.5);

  const startRipple = () => {
    scale.value = 0;
    opacity.value = 0.5;
    scale.value = withTiming(4, { duration: 500 });
    opacity.value = withTiming(0, { duration: 500 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { startRipple, animatedStyle };
};

export const useStaggeredAnimation = (itemCount: number, staggerDelay: number = 100) => {
  const progress = useSharedValue(0);

  const start = useCallback(() => {
    progress.value = 0;
    progress.value = withTiming(itemCount, {
      duration: Math.max(itemCount - 1, 0) * staggerDelay + 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [itemCount, progress, staggerDelay]);

  const useAnimatedStyleAt = (index: number) =>
    useAnimatedStyle(() => {
      const itemProgress = interpolate(
        progress.value,
        [index, index + 1],
        [0, 1],
        Extrapolate.CLAMP
      );

      return {
        transform: [
          { translateY: interpolate(itemProgress, [0, 1], [50, 0]) },
          { scale: itemProgress },
        ],
        opacity: itemProgress,
      };
    }, [index]);

  return {
    start,
    getAnimatedStyle: useAnimatedStyleAt,
    useAnimatedStyleAt,
  };
};

export const useScrollProgress = () => {
  const progress = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { y } = event.nativeEvent.contentOffset;
      const { height } = event.nativeEvent.contentSize;
      const { height: layoutHeight } = event.nativeEvent.layoutMeasurement;

      scrollY.value = y;
      progress.value = y / (height - layoutHeight);
    },
    [progress, scrollY]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return { onScroll, progress, scrollY, animatedStyle };
};

export const useHapticFeedback = () => {
  const trigger = useCallback(
    (style: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
      const {
        impactAsync,
        ImpactFeedbackStyle,
        notificationAsync,
        NotificationFeedbackType,
      } = require("expo-haptics");

      switch (style) {
        case "light":
          impactAsync(ImpactFeedbackStyle.Light);
          break;
        case "medium":
          impactAsync(ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          impactAsync(ImpactFeedbackStyle.Heavy);
          break;
        case "success":
          notificationAsync(NotificationFeedbackType.Success);
          break;
        case "warning":
          notificationAsync(NotificationFeedbackType.Warning);
          break;
        case "error":
          notificationAsync(NotificationFeedbackType.Error);
          break;
      }
    },
    []
  );

  return trigger;
};

export const useSkeletonAnimation = () => {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerPosition.value * SCREEN_WIDTH }],
  }));

  return animatedStyle;
};

export const useBounce = () => {
  const scale = useSharedValue(1);

  const bounce = () => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 400 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { bounce, animatedStyle };
};

export const useFlip = () => {
  const rotateY = useSharedValue(0);
  const frontOpacity = useSharedValue(1);
  const backOpacity = useSharedValue(0);

  const flip = () => {
    if (rotateY.value === 0) {
      rotateY.value = withTiming(180, { duration: 500 });
      frontOpacity.value = withTiming(0, { duration: 250 });
      backOpacity.value = withDelay(250, withTiming(1, { duration: 250 }));
    } else {
      rotateY.value = withTiming(0, { duration: 500 });
      backOpacity.value = withTiming(0, { duration: 250 });
      frontOpacity.value = withDelay(250, withTiming(1, { duration: 250 }));
    }
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotateY.value}deg` }],
    opacity: frontOpacity.value,
    backfaceVisibility: "hidden",
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${rotateY.value + 180}deg` }],
    opacity: backOpacity.value,
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  return { flip, frontStyle, backStyle };
};

export const useTypewriter = (text: string, speed: number = 50) => {
  const _displayedText = useSharedValue("");
  const [displayText, setDisplayText] = React.useState("");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayText;
};

export const useCountUp = (end: number, duration: number = 1000) => {
  const value = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState(0);

  const start = () => {
    value.value = withTiming(end, { duration });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue(Math.round(value.value));
    }, 16);

    return () => clearInterval(interval);
  }, []);

  return { start, displayValue };
};

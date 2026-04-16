import React, { useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Platform, StatusBar } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
  cancelAnimation,
  useDerivedValue,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedLinearGradient = AnimatedReanimated.createAnimatedComponent(LinearGradient);

export type CompanionState = "idle" | "listening" | "thinking" | "responding" | "collapsed";

export interface EnhancedAICompanionBallProps {
  state?: CompanionState;
  onPress?: () => void;
  onLongPress?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  position?: { x: number; y: number };
  size?: number;
  showHint?: boolean;
  hintMessage?: string;
  enableVoiceInput?: boolean;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onVoiceResult?: (text: string) => void;
  enableParticleEffect?: boolean;
  enableColorFlow?: boolean;
}

const STATE_CONFIG = {
  idle: {
    gradient: [colors.secondary, colors.primary] as [string, string],
    gradientFlow: [
      colors.secondary,
      colors.primary,
      colors.primaryLight,
      colors.secondary,
    ] as [string, string, string, string],
    innerGradient: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.05)"] as [string, string],
    glowColor: colors.secondary,
    particleColor: colors.secondary,
    animation: "breathe",
  },
  listening: {
    gradient: [colors.neutral[500], colors.textTertiary] as [string, string],
    gradientFlow: [colors.neutral[500], colors.textTertiary, "#B8C5D1", colors.neutral[500]] as [string, string, string, string], // custom gradient mid-tone
    innerGradient: ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.08)"] as [string, string],
    glowColor: colors.neutral[500],
    particleColor: colors.textTertiary,
    animation: "pulse",
  },
  thinking: {
    gradient: [colors.warning, colors.primary] as [string, string],
    gradientFlow: [colors.warning, colors.primary, "#F5D89A", colors.warning] as [string, string, string, string], // custom gradient mid-tone
    innerGradient: ["rgba(255,255,255,0.4)", "rgba(255,255,255,0.1)"] as [string, string],
    glowColor: colors.warning,
    particleColor: colors.primary,
    animation: "pulse",
  },
  responding: {
    gradient: [colors.success, "colors.secondary"] as [string, string],
    gradientFlow: [colors.success, "colors.secondary", "#9DC4B5", colors.success] as [string, string, string, string], // custom color
    innerGradient: ["rgba(255,255,255,0.32)", "rgba(255,255,255,0.06)"] as [string, string],
    glowColor: colors.success,
    particleColor: "colors.secondary", // custom color
    animation: "glow",
  },
  collapsed: {
    gradient: [colors.primary, colors.primary] as [
      string,
      string
    ],
    gradientFlow: [
      colors.primary,
      colors.primary,
      colors.primaryLight,
      colors.primary,
    ] as [string, string, string, string],
    innerGradient: ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.03)"] as [string, string],
    glowColor: colors.primary,
    particleColor: colors.primary,
    animation: "none",
  },
};

interface ParticleProps {
  index: number;
  color: string;
  ballSize: number;
  isActive: boolean;
}

const Particle: React.FC<ParticleProps> = ({ index, color, ballSize, isActive }) => {
  const angle = useSharedValue(index * 72 * (Math.PI / 180));
  const radius = useSharedValue(ballSize * 0.6);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const floatOffset = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      angle.value = withRepeat(
        withTiming(angle.value + Math.PI * 2, {
          duration: 8000 + index * 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      radius.value = withRepeat(
        withSequence(
          withTiming(ballSize * 0.8, {
            duration: 2000 + index * 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(ballSize * 0.5, {
            duration: 2000 + index * 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );

      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, {
            duration: 1500 + index * 300,
            easing: Easing.ease,
          }),
          withTiming(0.3, {
            duration: 1500 + index * 300,
            easing: Easing.ease,
          })
        ),
        -1,
        true
      );

      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800 + index * 400, easing: Easing.ease }),
          withTiming(0.6, {
            duration: 1800 + index * 400,
            easing: Easing.ease,
          })
        ),
        -1,
        true
      );

      floatOffset.value = withRepeat(
        withSequence(
          withTiming(5, {
            duration: 1000 + index * 200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-5, {
            duration: 1000 + index * 200,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(angle);
      cancelAnimation(radius);
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(floatOffset);
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isActive, ballSize, index]);

  const animatedStyle = useAnimatedStyle(() => {
    const x = Math.cos(angle.value) * radius.value;
    const y = Math.sin(angle.value) * radius.value;

    return {
      transform: [{ translateX: x }, { translateY: y + floatOffset.value }, { scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <AnimatedView
      style={[
        styles.particle,
        {
          width: DesignTokens.spacing['1.5'],
          height: DesignTokens.spacing['1.5'],
          borderRadius: 3,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const EnhancedAICompanionBall: React.FC<EnhancedAICompanionBallProps> = ({
  state = "idle",
  onPress,
  onLongPress,
  onDragEnd,
  position,
  size = 64,
  showHint = false,
  hintMessage = "有什么可以帮你的？",
  _enableVoiceInput = true,
  onVoiceStart,
  onVoiceEnd,
  onVoiceResult,
  enableParticleEffect = true,
  enableColorFlow = true,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const [isDragging, setIsDragging] = useState(false);
  const [_isVoiceMode, _setIsVoiceMode] = useState(false);

  const defaultX = SCREEN_WIDTH - size - 20;
  const defaultY = SCREEN_HEIGHT - size - insets.bottom - 100;

  const translateX = useSharedValue(position?.x ?? defaultX);
  const translateY = useSharedValue(position?.y ?? defaultY);
  const scale = useSharedValue(1);
  const glowValue = useSharedValue(0);
  const breatheValue = useSharedValue(0);
  const pulseValue = useSharedValue(0);
  const hintOpacity = useSharedValue(0);
  const hintTranslateX = useSharedValue(20);
  const innerGlowValue = useSharedValue(0);
  const colorFlowAngle = useSharedValue(0);
  const shimmerValue = useSharedValue(0);
  const rippleValue = useSharedValue(0);
  const [rippleKey, setRippleKey] = useState(0);

  const config = STATE_CONFIG[state];
  const particleCount = 5;

  useEffect(() => {
    if (state === "idle") {
      breatheValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      pulseValue.value = 0;
      glowValue.value = 0;
      innerGlowValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      if (enableColorFlow) {
        colorFlowAngle.value = withRepeat(
          withTiming(360, { duration: 12000, easing: Easing.linear }),
          -1,
          false
        );
      }

      shimmerValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (state === "listening" || state === "thinking") {
      cancelAnimation(breatheValue);
      cancelAnimation(innerGlowValue);
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      innerGlowValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      if (enableColorFlow) {
        colorFlowAngle.value = withRepeat(
          withTiming(360, { duration: 6000, easing: Easing.linear }),
          -1,
          false
        );
      }

      shimmerValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (state === "responding") {
      cancelAnimation(breatheValue);
      cancelAnimation(pulseValue);
      cancelAnimation(innerGlowValue);
      glowValue.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.5, { duration: 800 })),
        -1,
        true
      );
      innerGlowValue.value = 0.8;

      if (enableColorFlow) {
        colorFlowAngle.value = withRepeat(
          withTiming(360, { duration: 8000, easing: Easing.linear }),
          -1,
          false
        );
      }

      shimmerValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(breatheValue);
      cancelAnimation(pulseValue);
      cancelAnimation(glowValue);
      cancelAnimation(innerGlowValue);
      cancelAnimation(colorFlowAngle);
      cancelAnimation(shimmerValue);
    }
  }, [state, enableColorFlow]);

  useEffect(() => {
    if (showHint && state === "idle") {
      hintOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
      hintTranslateX.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 150 }));
    } else {
      hintOpacity.value = withTiming(0, { duration: 200 });
      hintTranslateX.value = withTiming(20, { duration: 200 });
    }
  }, [showHint, state]);

  const triggerRipple = useCallback(() => {
    rippleValue.value = 0;
    setRippleKey((prev) => prev + 1);
    rippleValue.value = withSequence(
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 0 })
    );
  }, []);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(setIsDragging)(true);
      scale.value = withSpring(1.1, { damping: 15, stiffness: 200 });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + (position?.x ?? defaultX);
      translateY.value = event.translationY + (position?.y ?? defaultY);
    })
    .onEnd((event) => {
      runOnJS(setIsDragging)(false);
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });

      let finalX = event.translationX + (position?.x ?? defaultX);
      let finalY = event.translationY + (position?.y ?? defaultY);

      const margin = 16;
      const minX = margin;
      const maxX = SCREEN_WIDTH - size - margin;
      const minY = (Platform.OS === "ios" ? insets.top : StatusBar.currentHeight || 24) + margin;
      const maxY = SCREEN_HEIGHT - insets.bottom - size - 80;

      finalX = Math.max(minX, Math.min(maxX, finalX));
      finalY = Math.max(minY, Math.min(maxY, finalY));

      const leftDistance = finalX - minX;
      const rightDistance = maxX - finalX;

      if (leftDistance < rightDistance) {
        finalX = minX;
      } else {
        finalX = maxX;
      }

      translateX.value = withSpring(finalX, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(finalY, { damping: 15, stiffness: 150 });

      if (onDragEnd) {
        runOnJS(onDragEnd)(finalX, finalY);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (!isDragging && onPress) {
      scale.value = withSequence(
        withSpring(0.9, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
      runOnJS(triggerRipple)();
      runOnJS(onPress)();
    }
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (onLongPress) {
        scale.value = withSpring(1.2, { damping: 15, stiffness: 150 });
        runOnJS(onLongPress)();
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    });

  const composedGesture = Gesture.Race(panGesture, longPressGesture, tapGesture);

  const ballAnimatedStyle = useAnimatedStyle(() => {
    let animatedScale = scale.value;

    if (state === "idle") {
      animatedScale *= interpolate(breatheValue.value, [0, 1], [1, 1.05]);
    } else if (state === "listening" || state === "thinking") {
      animatedScale *= interpolate(pulseValue.value, [0, 1], [0.95, 1.1]);
    }

    const glowOpacity =
      glowValue.value > 0
        ? interpolate(glowValue.value, [0, 1], [0.2, 0.6])
        : interpolate(breatheValue.value, [0, 1], [0.15, 0.4]);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: animatedScale },
      ],
      shadowColor: config.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: interpolate(breatheValue.value, [0, 1], [20, 40]),
      elevation: 8,
    };
  });

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateX: hintTranslateX.value }],
  }));

  const innerGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(innerGlowValue.value, [0, 1], [0.4, 0.9]),
    transform: [{ scale: interpolate(innerGlowValue.value, [0, 1], [0.82, 0.96]) }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerValue.value * 0.5,
    transform: [{ translateX: interpolate(shimmerValue.value, [0, 1], [-size, size]) }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(rippleValue.value, [0, 1], [0.6, 0]),
    transform: [{ scale: interpolate(rippleValue.value, [0, 1], [0.8, 1.5]) }],
  }));

  const _gradientAngle = useDerivedValue(() => {
    return colorFlowAngle.value;
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView style={[styles.container, ballAnimatedStyle]}>
        {showHint && state === "idle" && (
          <AnimatedView style={[styles.hintContainer, { right: size + 12 }, hintAnimatedStyle]}>
            <View style={styles.hintBubble}>
              <Text style={styles.hintText}>{hintMessage}</Text>
            </View>
            <View style={[styles.hintArrow, { right: -6 }]} />
          </AnimatedView>
        )}

        <View style={[styles.ballContainer, { width: size, height: size }]}>
          {enableParticleEffect && state !== "collapsed" && (
            <View style={[styles.particleContainer, { width: size, height: size }]}>
              {Array.from({ length: particleCount }).map((_, index) => (
                <Particle
                  key={index}
                  index={index}
                  color={config.particleColor}
                  ballSize={size}
                  isActive={true}
                />
              ))}
            </View>
          )}

          <LinearGradient
            colors={enableColorFlow ? config.gradientFlow : config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ball, { width: size, height: size, borderRadius: size / 2 }]}
          >
            <AnimatedView style={[styles.innerGlow, innerGlowAnimatedStyle]}>
              <LinearGradient
                colors={config.innerGradient}
                start={{ x: 0.2, y: 0.2 }}
                end={{ x: 0.9, y: 0.9 }}
                style={[styles.innerGlowGradient, { borderRadius: size / 2 - 6 }]}
              />
            </AnimatedView>

            <View style={styles.highlight} />

            <AnimatedView style={[styles.shimmer, shimmerAnimatedStyle]}>
              <View style={[styles.shimmerLine, { height: size }]} />
            </AnimatedView>
          </LinearGradient>

          <AnimatedView
            key={rippleKey}
            style={[
              styles.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: config.glowColor,
              },
              rippleAnimatedStyle,
            ]}
          />
        </View>
      </AnimatedView>
    </GestureDetector>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    position: "absolute",
    zIndex: 9999,
  },
  ballContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  particleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  particle: {
    position: "absolute",
    shadowColor: colors.surface,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  ball: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  innerGlow: {
    position: "absolute",
    top: DesignTokens.spacing['1.5'],
    left: DesignTokens.spacing['1.5'],
    right: DesignTokens.spacing['1.5'],
    bottom: DesignTokens.spacing['1.5'],
  },
  innerGlowGradient: {
    flex: 1,
  },
  highlight: {
    position: "absolute",
    top: DesignTokens.spacing['2.5'],
    left: DesignTokens.spacing['3.5'],
    width: 18,
    height: 9,
    borderRadius: 9,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    transform: [{ rotate: "-30deg" }],
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  shimmerLine: {
    width: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ skewX: "-20deg" }],
  },
  ripple: {
    position: "absolute",
    borderWidth: 2,
  },
  hintContainer: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    flexDirection: "row",
    alignItems: "center",
  },
  hintBubble: {
    backgroundColor: DesignTokens.colors.neutral[800],
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 14,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  hintText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textInverse,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  hintArrow: {
    position: "absolute",
    width: DesignTokens.spacing[3],
    height: DesignTokens.spacing[3],
    backgroundColor: DesignTokens.colors.neutral[800],
    transform: [{ rotate: "45deg" }],
  },
}))

import React, { useEffect, useCallback, useState, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, Platform, StatusBar } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  interpolateColor,
  Easing,
  runOnJS,
  cancelAnimation,
  useDerivedValue,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const FOOTER_CLEARANCE = 180;

export type CompanionState = "idle" | "listening" | "thinking" | "responding" | "collapsed";

export interface AICompanionBallProps {
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
}

const STATE_CONFIG = {
  idle: {
    gradient: [colors.secondary, colors.primary] as [string, string],
    innerGradient: ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.05)"] as [string, string],
    glowColor: colors.secondary,
    animation: "breathe",
  },
  listening: {
    gradient: [colors.neutral[500], "colors.textTertiary"] as [string, string], // custom color
    innerGradient: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.08)"] as [string, string],
    glowColor: colors.neutral[500],
    animation: "pulse",
  },
  thinking: {
    gradient: [colors.warning, "colors.primary"] as [string, string], // custom color
    innerGradient: ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.1)"] as [string, string],
    glowColor: colors.warning,
    animation: "pulse",
  },
  responding: {
    gradient: [colors.success, "colors.secondary"] as [string, string], // custom color
    innerGradient: ["rgba(255,255,255,0.28)", "rgba(255,255,255,0.06)"] as [string, string],
    glowColor: colors.success,
    animation: "glow",
  },
  collapsed: {
    gradient: [colors.primary, colors.primary] as [
      string,
      string
    ],
    innerGradient: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.03)"] as [string, string],
    glowColor: colors.primary,
    animation: "none",
  },
};

const _STATE_ORDER: CompanionState[] = ["idle", "listening", "thinking", "responding", "collapsed"];

export const AICompanionBall: React.FC<AICompanionBallProps> = ({
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
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const [isDragging, setIsDragging] = useState(false);
  const [_isVoiceMode, _setIsVoiceMode] = useState(false);
  const prevStateRef = useRef<CompanionState>(state);

  const defaultX = SCREEN_WIDTH - size - 20;
  const defaultY = SCREEN_HEIGHT - size - insets.bottom - FOOTER_CLEARANCE;

  const translateX = useSharedValue(position?.x ?? defaultX);
  const translateY = useSharedValue(position?.y ?? defaultY);
  const scale = useSharedValue(1);
  const glowValue = useSharedValue(0);
  const breatheValue = useSharedValue(0);
  const pulseValue = useSharedValue(0);
  const hintOpacity = useSharedValue(0);
  const hintTranslateX = useSharedValue(20);
  const innerGlowValue = useSharedValue(0);
  const colorTransition = useSharedValue(0);

  const config = STATE_CONFIG[state];

  useEffect(() => {
    if (prevStateRef.current !== state) {
      colorTransition.value = withTiming(1, { duration: 500 });
      prevStateRef.current = state;
    }
  }, [state]);

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
    } else {
      cancelAnimation(breatheValue);
      cancelAnimation(pulseValue);
      cancelAnimation(glowValue);
      cancelAnimation(innerGlowValue);
    }
  }, [state]);

  useEffect(() => {
    if (showHint && state === "idle") {
      hintOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
      hintTranslateX.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 150 }));
    } else {
      hintOpacity.value = withTiming(0, { duration: 200 });
      hintTranslateX.value = withTiming(20, { duration: 200 });
    }
  }, [showHint, state]);

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
      const maxY = SCREEN_HEIGHT - insets.bottom - size - FOOTER_CLEARANCE;

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
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(
        withSpring(0.9, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
      runOnJS(onPress)();
    }
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      if (onLongPress) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
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
        ? interpolate(glowValue.value, [0, 1], [0.2, 0.5])
        : interpolate(breatheValue.value, [0, 1], [0.1, 0.3]);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: animatedScale },
      ],
      shadowColor: config.glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: interpolate(breatheValue.value, [0, 1], [15, 30]),
      elevation: 8,
    };
  });

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ translateX: hintTranslateX.value }],
  }));

  const innerGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(innerGlowValue.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(innerGlowValue.value, [0, 1], [0.85, 0.95]) }],
  }));

  const getStateLabel = useCallback((currentState: CompanionState): string => {
    const labels: Record<CompanionState, string> = {
      idle: "AI造型师助手，等待中",
      listening: "AI造型师助手，正在聆听",
      thinking: "AI造型师助手，正在思考",
      responding: "AI造型师助手，正在回复",
      collapsed: "AI造型师助手",
    };
    return labels[currentState];
  }, []);

  const getStateHint = useCallback((currentState: CompanionState): string => {
    if (currentState === "idle") {
      return "点击开始与AI造型师对话，长按显示快捷菜单";
    }
    return "当前正在处理中，请稍候";
  }, []);

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedView
        style={[styles.container, ballAnimatedStyle]}
        accessibilityLabel={getStateLabel(state)}
        accessibilityHint={getStateHint(state)}
        accessibilityRole="button"
        accessibilityState={{ disabled: state === "thinking" || state === "responding" }}
      >
        {showHint && state === "idle" && (
          <AnimatedView style={[styles.hintContainer, { right: size + 12 }, hintAnimatedStyle]}>
            <View style={styles.hintBubble}>
              <Text style={styles.hintText}>{hintMessage}</Text>
            </View>
            <View style={[styles.hintArrow, { right: -6 }]} />
          </AnimatedView>
        )}

        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ball, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <AnimatedView style={[styles.innerGlow, innerGlowAnimatedStyle]}>
            <LinearGradient
              colors={config.innerGradient}
              start={{ x: 0.3, y: 0.3 }}
              end={{ x: 0.8, y: 0.8 }}
              style={[styles.innerGlowGradient, { borderRadius: size / 2 - 4 }]}
            />
          </AnimatedView>
          <View style={styles.highlight} />
          <Text style={[styles.aiText, { fontSize: size * 0.28 }]}>AI</Text>
        </LinearGradient>
      </AnimatedView>
    </GestureDetector>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    position: "absolute",
    zIndex: 9999,
  },
  ball: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  innerGlow: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
    right: Spacing.xs,
    bottom: Spacing.xs,
  },
  innerGlowGradient: {
    flex: 1,
  },
  highlight: {
    position: "absolute",
    top: Spacing.sm,
    left: DesignTokens.spacing[3],
    width: Spacing.md,
    height: Spacing.sm,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    transform: [{ rotate: "-30deg" }],
  },
  aiText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "700",
    letterSpacing: 1,
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
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  hintText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textInverse,
    fontWeight: "500",
  },
  hintArrow: {
    position: "absolute",
    width: DesignTokens.spacing[3],
    height: DesignTokens.spacing[3],
    backgroundColor: DesignTokens.colors.neutral[800],
    transform: [{ rotate: "45deg" }],
  },
}))

import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useGlow } from '../../../hooks/useAdvancedAnimations';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { SpringConfigs, Duration } from '../../../design-system/theme/tokens/animations';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { Spacing } from '../../../design-system/theme';


const TERRACOTTA = colors.primary; // #C67B5C
const CAMEL = colors.primary; // #B5A08C
const SAGE = colors.secondary; // #8B9A7D
const _TERRACOTTA_LIGHT = colors.primaryLight; // #D4917A

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUBBLE_WIDTH = SCREEN_WIDTH * 0.6;

// Stage timing constants (ms)
const _STAGE_1_DURATION = 2000;
const STAGE_2_START = 2000;
const _STAGE_2_DURATION = 2000;
const STAGE_3_START = 4000;
const _STAGE_3_DURATION = 2000;
const TOTAL_CYCLE = 6000;

// ============ Reduced Motion: Static text with pulsing gradient bar ============

function ReducedMotionAnimation() {
    const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      false
    );
    return () => cancelAnimation(opacity);
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={r.container}>
      <View style={r.contentRow}>
        <Text style={r.staticText}>AI 正在思考...</Text>
        <View style={r.gradientBar}>
          <Animated.View style={[r.gradientFill, barStyle]} />
        </View>
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing[3],
    borderBottomLeftRadius: 4,
    maxWidth: BUBBLE_WIDTH,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  staticText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: TERRACOTTA,
    fontWeight: "500",
  },
  gradientBar: {
    flex: 1,
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: "rgba(198, 123, 92, 0.15)",
    overflow: "hidden",
  },
  gradientFill: {
    width: "100%",
    height: "100%",
    borderRadius: 3,
    backgroundColor: TERRACOTTA,
  },
});

// ============ Stage 1: Terracotta Gradient Lines (0-2s) ============

function GradientLines({ stageProgress }: { _stageProgress: Animated.SharedValue<number> }) {
  const line1X = useSharedValue(-BUBBLE_WIDTH);
  const line2X = useSharedValue(-BUBBLE_WIDTH);
  const line3X = useSharedValue(-BUBBLE_WIDTH);

  useEffect(() => {
    line1X.value = withDelay(
      0,
      withTiming(BUBBLE_WIDTH, { duration: 1800, easing: Easing.out(Easing.ease) })
    );
    line2X.value = withDelay(
      300,
      withTiming(BUBBLE_WIDTH, { duration: 1800, easing: Easing.out(Easing.ease) })
    );
    line3X.value = withDelay(
      600,
      withTiming(BUBBLE_WIDTH, { duration: 1800, easing: Easing.out(Easing.ease) })
    );
    return () => {
      cancelAnimation(line1X);
      cancelAnimation(line2X);
      cancelAnimation(line3X);
    };
  }, []);

  const line1Style = useAnimatedStyle(() => ({ transform: [{ translateX: line1X.value }] }));
  const line2Style = useAnimatedStyle(() => ({ transform: [{ translateX: line2X.value }] }));
  const line3Style = useAnimatedStyle(() => ({ transform: [{ translateX: line3X.value }] }));

  return (
    <View style={s.linesContainer}>
      <View style={s.lineTrack}>
        <Animated.View style={[s.gradientLine, s.lineShort, line1Style]} />
      </View>
      <View style={s.lineTrack}>
        <Animated.View style={[s.gradientLine, s.lineMedium, line2Style]} />
      </View>
      <View style={s.lineTrack}>
        <Animated.View style={[s.gradientLine, s.lineShort, line3Style]} />
      </View>
    </View>
  );
}

// ============ Stage 2: Clothing Silhouette (2-4s) ============

function ClothingSilhouette({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(0.5, { duration: 1500, easing: Easing.out(Easing.ease) });
    } else {
      opacity.value = 0;
    }
    return () => cancelAnimation(opacity);
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[s.silhouetteContainer, animStyle]}>
      <Svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        {/* Dress silhouette */}
        <Path
          d="M22 8 L20 18 L14 50 L24 44 L30 50 L36 44 L46 50 L40 18 L38 8 Z"
          stroke={TERRACOTTA}
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 2"
        />
        {/* Hanger */}
        <Path d="M26 4 L30 8 L34 4" stroke={CAMEL} strokeWidth="1" fill="none" />
      </Svg>
    </Animated.View>
  );
}

// ============ Stage 3: Complete Outfit (4-6s) ============

function CompleteOutfit({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: Duration.normal, easing: Easing.out(Easing.ease) });
      scale.value = withSpring(1, SpringConfigs.bouncy);
    } else {
      opacity.value = 0;
      scale.value = 0.8;
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[s.outfitContainer, animStyle]}>
      <Svg width="80" height="60" viewBox="0 0 80 60" fill="none">
        <Defs>
          <LinearGradient
            id="outfitGrad"
            x1="0"
            y1="0"
            x2="80"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={TERRACOTTA} />
            <Stop offset="0.5" stopColor={CAMEL} />
            <Stop offset="1" stopColor={SAGE} />
          </LinearGradient>
        </Defs>
        {/* Top / shirt */}
        <Path
          d="M28 6 L24 14 L18 14 L18 30 L42 30 L42 14 L36 14 L32 6 Z"
          fill="url(#outfitGrad)"
          opacity="0.9"
        />
        {/* Skirt */}
        <Path d="M20 30 L16 54 L44 54 L40 30 Z" fill={SAGE} opacity="0.7" />
        {/* Belt */}
        <Path d="M20 30 L40 30 L40 33 L20 33 Z" fill={CAMEL} opacity="0.8" />
      </Svg>
    </Animated.View>
  );
}

// ============ Main Component ============

function AIThinkingAnimationInner() {
  const { reducedMotion } = useReducedMotion();
  const [stage, setStage] = React.useState<1 | 2 | 3>(1);
  const gradientProgress = useSharedValue(0);
  const glowStyle = useGlow(TERRACOTTA);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const timer2 = setTimeout(() => setStage(2), STAGE_2_START);
    const timer3 = setTimeout(() => setStage(3), STAGE_3_START);
    const timerReset = setTimeout(() => setStage(1), TOTAL_CYCLE);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerReset);
    };
  }, [stage, reducedMotion]);

  if (reducedMotion) {
    return <ReducedMotionAnimation />;
  }

  return (
    <Animated.View style={[s.container, glowStyle]}>
      {stage === 1 && <GradientLines stageProgress={gradientProgress} />}
      {stage === 2 && <ClothingSilhouette visible={stage >= 2} />}
      {stage === 3 && <CompleteOutfit visible={stage >= 3} />}
    </Animated.View>
  );
}

export const AIThinkingAnimation = React.memo(AIThinkingAnimationInner);

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing[3],
    borderBottomLeftRadius: 4,
    maxWidth: BUBBLE_WIDTH,
    minHeight: DesignTokens.spacing[11],
  },
  linesContainer: {
    width: "100%",
    gap: DesignTokens.spacing['1.5'],
    paddingVertical: Spacing.xs,
  },
  lineTrack: {
    height: Spacing.xs,
    borderRadius: 2,
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    overflow: "hidden",
  },
  gradientLine: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: TERRACOTTA,
  },
  lineShort: {
    width: "40%",
  },
  lineMedium: {
    width: "60%",
  },
  silhouetteContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
  },
  outfitContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
  },
});

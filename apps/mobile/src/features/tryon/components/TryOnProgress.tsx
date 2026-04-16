import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors } from '../design-system/theme';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { SpringConfigs, Duration, LoadingAnimations } from '../../../design-system/theme/tokens/animations';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useStaggeredAnimation } from '../../../hooks/useAdvancedAnimations';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** 3-step progress data */
const STEPS = [
  { key: "analyze", label: "分析体型", icon: "body-outline" as const },
  { key: "match", label: "匹配服装", icon: "shirt-outline" as const },
  { key: "generate", label: "生成效果图", icon: "sparkles-outline" as const },
] as const;

export interface TryOnProgressProps {
  /** Current step index (0-based). -1 = not started */
  currentStep: number;
  /** Overall progress 0..1 */
  progress: number;
  /** Optional style override */
  style?: ViewStyle;
}

/** Animated step icon with per-step animation */
function StepIcon({
  icon,
  isActive,
  isComplete,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap | string;
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  const { reducedMotion } = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0.8);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const rotation = useSharedValue(0);
  const scanY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    // Entrance animation
    scale.value = withDelay(
      index * 100,
      withSpring(1, SpringConfigs.bouncy)
    );
    opacity.value = withDelay(
      index * 100,
      withTiming(1, { duration: Duration.normal })
    );
  }, [index, reducedMotion]);

  // Step-specific animations when active
  useEffect(() => {
    if (reducedMotion || !isActive) {
      if (!isActive) {
        rotation.value = 0;
        scanY.value = 0;
      }
      return;
    }

    // Step 0: Scan line animation (body outline)
    if (index === 0) {
      scanY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    // Step 1: Shirt rotation
    if (index === 1) {
      rotation.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    // Step 2: Sparkles pulse
    if (index === 2) {
      scale.value = withRepeat(
        withSequence(
          withSpring(1.2, SpringConfigs.bouncy),
          withSpring(1, SpringConfigs.bouncy)
        ),
        -1,
        true
      );
    }

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(scanY);
    };
  }, [isActive, index, reducedMotion]);

  // Completion bounce
  useEffect(() => {
    if (isComplete && !reducedMotion) {
      scale.value = withSpring(1, SpringConfigs.bouncy);
    }
  }, [isComplete, reducedMotion]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanY.value, [0, 1], [-12, 12]) }],
    opacity: isActive && index === 0 ? 0.8 : 0,
  }));

  const iconColor = isComplete
    ? Colors.primary[500]
    : isActive
      ? Colors.primary[400]
      : Colors.neutral[400];

  const bgColor = isComplete
    ? Colors.primary[50]
    : isActive
      ? Colors.primary[100]
      : Colors.neutral[100];

  return (
    <View style={styles.stepIconContainer}>
      <Animated.View
        style={[
          styles.stepIconCircle,
          { backgroundColor: bgColor },
          iconAnimatedStyle,
        ]}
      >
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={iconColor} />
        {/* Scan line for body analysis step */}
        {index === 0 && (
          <Animated.View style={[styles.scanLine, scanLineStyle]}>
            <View style={[styles.scanLineInner, { backgroundColor: Colors.primary[400] }]} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

/** Progress bar with brand gradient */
function GradientProgressBar({ progress }: { progress: number }) {
  const { reducedMotion } = useReducedMotion();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      animatedWidth.value = progress;
    } else {
      animatedWidth.value = withSpring(progress, SpringConfigs.gentle);
    }
  }, [progress, reducedMotion]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%`,
  }));

  return (
    <View style={styles.progressBarTrack}>
      <Animated.View style={[styles.progressBarFill, barStyle]}>
        <LinearGradient
          colors={[Colors.primary[400], Colors.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * TryOnProgress - 3-step progress visualization for virtual try-on
 *
 * Steps: Analyze body -> Match clothing -> Generate result
 * Each step has a unique icon animation.
 * Progress bar uses brand gradient (primary[400] -> primary[600]).
 * Uses StaggeredAnimation for step entrance.
 */
export const TryOnProgress: React.FC<TryOnProgressProps> = ({
  currentStep,
  progress,
  style,
}) => {
  const staggered = useStaggeredAnimation(STEPS.length, 100);

  useEffect(() => {
    staggered.start();
  }, []);

  const stepProgress = useMemo(() => {
    if (currentStep < 0) return [-1, -1, -1];
    return STEPS.map((_, i) => {
      if (i < currentStep) return 1; // complete
      if (i === currentStep) return Math.min(1, (progress - i / 3) * 3); // active
      return 0; // pending
    });
  }, [currentStep, progress]);

  return (
    <View style={[styles.container, style]}>
      {/* Step icons row */}
      <View style={styles.stepsRow}>
        {STEPS.map((step, i) => {
          const staggerStyle = staggered.useAnimatedStyleAt(i);
          return (
            <Animated.View key={step.key} style={[styles.stepWrapper, staggerStyle]}>
              <StepIcon
                icon={step.icon}
                isActive={i === currentStep}
                isComplete={i < currentStep}
                index={i}
              />
              <Text
                style={[
                  styles.stepLabel,
                  i === currentStep && styles.stepLabelActive,
                  i < currentStep && styles.stepLabelComplete,
                ]}
              >
                {step.label}
              </Text>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    i < currentStep && styles.connectorComplete,
                  ]}
                />
              )}
            </Animated.View>
          );
        })}
      </View>

      {/* Gradient progress bar */}
      <GradientProgressBar progress={progress} />

      {/* Current step label */}
      {currentStep >= 0 && currentStep < STEPS.length && (
        <Text style={styles.currentStepText}>
          {STEPS[currentStep].label}中... {Math.round(progress * 100)}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  stepWrapper: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  stepIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 2,
  },
  scanLineInner: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  stepLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
    marginTop: 8,
    textAlign: "center",
  },
  stepLabelActive: {
    color: Colors.primary[500],
    fontWeight: "600",
  },
  stepLabelComplete: {
    color: Colors.primary[600],
    fontWeight: "500",
  },
  connector: {
    position: "absolute",
    top: 24,
    right: -20,
    width: 40,
    height: 2,
    backgroundColor: Colors.neutral[200],
  },
  connectorComplete: {
    backgroundColor: Colors.primary[400],
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral[200],
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  currentStepText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.primary[500],
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
  },
});

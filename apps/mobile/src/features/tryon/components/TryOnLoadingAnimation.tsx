import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { Spacing, BorderRadius } from "../../../design-system/theme";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../../shared/hooks/useReducedMotion";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ANIMATION_AREA_HEIGHT = 240;

interface Props {
  stage: 1 | 2 | 3;
  progress: number;
}

function StageOneAnimation() {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const outlineOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const scanY = useSharedValue(0);
  const shoulderGlow = useSharedValue(0);
  const waistGlow = useSharedValue(0);
  const hipGlow = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    outlineOpacity.value = withTiming(1, { duration: 500 });

    scanY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    shoulderGlow.value = withDelay(
      500,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1,
        true
      )
    );

    waistGlow.value = withDelay(
      1200,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1,
        true
      )
    );

    hipGlow.value = withDelay(
      1800,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(outlineOpacity);
      cancelAnimation(scanY);
      cancelAnimation(shoulderGlow);
      cancelAnimation(waistGlow);
      cancelAnimation(hipGlow);
    };
  }, [reducedMotion]);

  const outlineStyle = useAnimatedStyle(() => ({
    opacity: outlineOpacity.value,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanY.value, [0, 1], [0, ANIMATION_AREA_HEIGHT - 2]) }],
  }));

  const shoulderStyle = useAnimatedStyle(() => ({
    opacity: shoulderGlow.value,
    transform: [{ scale: interpolate(shoulderGlow.value, [0.3, 1], [1, 1.4]) }],
  }));

  const waistStyle = useAnimatedStyle(() => ({
    opacity: waistGlow.value,
    transform: [{ scale: interpolate(waistGlow.value, [0.3, 1], [1, 1.4]) }],
  }));

  const hipStyle = useAnimatedStyle(() => ({
    opacity: hipGlow.value,
    transform: [{ scale: interpolate(hipGlow.value, [0.3, 1], [1, 1.4]) }],
  }));

  return (
    <View style={styles.animationArea}>
      <Animated.View style={[styles.bodyOutline, outlineStyle]}>
        <Ionicons name="body-outline" size={120} color={colors.primary} />

        <Animated.View style={[styles.keyPoint, styles.shoulderPoint, shoulderStyle]}>
          <View style={[styles.keyPointDot, { backgroundColor: colors.primary }]} />
        </Animated.View>
        <Animated.View style={[styles.keyPoint, styles.waistPoint, waistStyle]}>
          <View style={[styles.keyPointDot, { backgroundColor: colors.primary }]} />
        </Animated.View>
        <Animated.View style={[styles.keyPoint, styles.hipPoint, hipStyle]}>
          <View style={[styles.keyPointDot, { backgroundColor: colors.primary }]} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.scanLine, scanLineStyle]}>
        <LinearGradient
          colors={["transparent", DesignTokens.colors.brand.terracotta, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scanLineGradient}
        />
      </Animated.View>
    </View>
  );
}

function StageTwoAnimation() {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const topX = useSharedValue(reducedMotion ? 0 : SCREEN_WIDTH);
  const bottomX = useSharedValue(reducedMotion ? 0 : SCREEN_WIDTH);
  const shoesX = useSharedValue(reducedMotion ? 0 : SCREEN_WIDTH);
  const topOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const bottomOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const shoesOpacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    topOpacity.value = withDelay(0, withTiming(1, { duration: 200 }));
    topX.value = withDelay(0, withSpring(0, SpringConfigs.bouncy));

    bottomOpacity.value = withDelay(800, withTiming(1, { duration: 200 }));
    bottomX.value = withDelay(800, withSpring(0, SpringConfigs.bouncy));

    shoesOpacity.value = withDelay(1600, withTiming(1, { duration: 200 }));
    shoesX.value = withDelay(1600, withSpring(0, SpringConfigs.bouncy));

    return () => {
      cancelAnimation(topX);
      cancelAnimation(bottomX);
      cancelAnimation(shoesX);
      cancelAnimation(topOpacity);
      cancelAnimation(bottomOpacity);
      cancelAnimation(shoesOpacity);
    };
  }, [reducedMotion]);

  const topStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: topX.value }],
    opacity: topOpacity.value,
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bottomX.value }],
    opacity: bottomOpacity.value,
  }));

  const shoesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shoesX.value }],
    opacity: shoesOpacity.value,
  }));

  return (
    <View style={styles.animationArea}>
      <View style={styles.clothingStack}>
        <Animated.View style={[styles.clothingItem, topStyle]}>
          <View
            style={[
              styles.clothingIconCircle,
              { backgroundColor: DesignTokens.colors.brand.terracottaLight + "20" },
            ]}
          >
            <Ionicons name="shirt-outline" size={28} color={DesignTokens.colors.brand.terracotta} />
          </View>
          <Text style={styles.clothingLabel}>上装</Text>
        </Animated.View>

        <Animated.View style={[styles.clothingItem, bottomStyle]}>
          <View
            style={[
              styles.clothingIconCircle,
              { backgroundColor: DesignTokens.colors.brand.sageLight + "30" },
            ]}
          >
            <Ionicons name="remove-outline" size={28} color={DesignTokens.colors.brand.sageDark} />
          </View>
          <Text style={styles.clothingLabel}>下装</Text>
        </Animated.View>

        <Animated.View style={[styles.clothingItem, shoesStyle]}>
          <View
            style={[
              styles.clothingIconCircle,
              { backgroundColor: DesignTokens.colors.brand.camelLight + "30" },
            ]}
          >
            <Ionicons
              name="footsteps-outline"
              size={28}
              color={DesignTokens.colors.brand.camelDark}
            />
          </View>
          <Text style={styles.clothingLabel}>鞋子</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function StageThreeAnimation({ progress }: { progress: number }) {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const compositeOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      compositeOpacity.value = 1;
      progressWidth.value = progress / 100;
      return;
    }

    compositeOpacity.value = withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) });
  }, [reducedMotion]);

  useEffect(() => {
    progressWidth.value = withSpring(progress / 100, SpringConfigs.gentle);
  }, [progress]);

  const compositeStyle = useAnimatedStyle(() => ({
    opacity: compositeOpacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <View style={styles.animationArea}>
      <Animated.View style={[styles.compositePreview, compositeStyle]}>
        <View style={styles.compositePlaceholder}>
          <Ionicons name="sparkles" size={48} color={DesignTokens.colors.brand.terracotta} />
          <Text style={styles.compositeText}>生成中...</Text>
        </View>
      </Animated.View>

      <View style={styles.stageProgressBarTrack}>
        <Animated.View style={[styles.stageProgressBarFill, progressStyle]}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

export const TryOnLoadingAnimation: React.FC<Props> = ({ stage, progress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const stageText =
    stage === 1 ? "分析体型特征..." : stage === 2 ? "匹配服装..." : "生成试穿效果...";

  const timeEstimate = Math.max(1, Math.ceil((100 - progress) / 20));

  return (
    <View style={styles.container}>
      {stage === 1 && <StageOneAnimation />}
      {stage === 2 && <StageTwoAnimation />}
      {stage === 3 && <StageThreeAnimation progress={progress} />}

      <Text style={styles.stageText}>{stageText}</Text>

      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, { width: `${progress}%` }]}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <Text style={styles.timeEstimate}>预计还需 {timeEstimate} 秒</Text>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: DesignTokens.spacing[5],
  },
  animationArea: {
    width: "100%",
    height: ANIMATION_AREA_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[5],
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.backgroundTertiary,
    overflow: "hidden",
  },
  bodyOutline: {
    alignItems: "center",
    justifyContent: "center",
  },
  keyPoint: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  shoulderPoint: {
    top: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 80,
  },
  waistPoint: {
    top: 70,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 60,
  },
  hipPoint: {
    top: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 70,
  },
  keyPointDot: {
    width: DesignTokens.spacing[2.5],
    height: DesignTokens.spacing[2.5],
    borderRadius: DesignTokens.spacing["1.5"] / 2,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
  scanLineGradient: {
    flex: 1,
    height: 2,
  },
  clothingStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[3],
  },
  clothingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: BorderRadius.xl,
    ...DesignTokens.shadows.sm,
  },
  clothingIconCircle: {
    width: Spacing["2xl"],
    height: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  clothingLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  compositePreview: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  compositePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[3],
  },
  compositeText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  stageProgressBarTrack: {
    width: "80%",
    height: DesignTokens.spacing[1.5],
    borderRadius: BorderRadius.xs,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
    marginTop: DesignTokens.spacing[3],
  },
  stageProgressBarFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  stageText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: DesignTokens.spacing[3],
  },
  progressBarTrack: {
    width: "100%",
    height: DesignTokens.spacing[1.5],
    borderRadius: BorderRadius.xs,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
    marginBottom: DesignTokens.spacing[2],
  },
  progressBarFill: {
    height: "100%",
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  timeEstimate: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
}));

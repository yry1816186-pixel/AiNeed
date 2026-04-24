/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { Spacing } from "../../../design-system/theme";
import { SpringConfigs, Duration } from "../../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../../shared/hooks/useReducedMotion";

export const OrderSuccessAnimation: React.FC = () => {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const bagScale = useSharedValue(reducedMotion ? 1 : 0);
  const checkOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const checkScale = useSharedValue(reducedMotion ? 1 : 0);
  const titleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const titleTranslateY = useSharedValue(reducedMotion ? 0 : 20);
  const subtitleOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const subtitleTranslateY = useSharedValue(reducedMotion ? 0 : 15);
  const ringScale = useSharedValue(reducedMotion ? 1 : 0);
  const ringOpacity = useSharedValue(reducedMotion ? 0.3 : 0);
  const confetti1Y = useSharedValue(reducedMotion ? 0 : -30);
  const confetti1Opacity = useSharedValue(reducedMotion ? 1 : 0);
  const confetti2Y = useSharedValue(reducedMotion ? 0 : -30);
  const confetti2Opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    ringScale.value = withSpring(1.2, SpringConfigs.gentle);
    ringOpacity.value = withTiming(0.15, { duration: Duration.slow });

    bagScale.value = withSpring(1, { damping: 8, stiffness: 100 });

    checkOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    checkScale.value = withDelay(400, withSpring(1, SpringConfigs.bouncy));

    titleOpacity.value = withDelay(600, withTiming(1, { duration: Duration.normal }));
    titleTranslateY.value = withDelay(600, withSpring(0, SpringConfigs.gentle));

    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: Duration.normal }));
    subtitleTranslateY.value = withDelay(900, withSpring(0, SpringConfigs.gentle));

    confetti1Opacity.value = withDelay(300, withTiming(1, { duration: Duration.fast }));
    confetti1Y.value = withDelay(300, withSpring(0, SpringConfigs.bouncy));

    confetti2Opacity.value = withDelay(500, withTiming(1, { duration: Duration.fast }));
    confetti2Y.value = withDelay(500, withSpring(0, SpringConfigs.bouncy));

    return () => {
      cancelAnimation(bagScale);
      cancelAnimation(checkOpacity);
      cancelAnimation(checkScale);
      cancelAnimation(titleOpacity);
      cancelAnimation(titleTranslateY);
      cancelAnimation(subtitleOpacity);
      cancelAnimation(subtitleTranslateY);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
      cancelAnimation(confetti1Y);
      cancelAnimation(confetti1Opacity);
      cancelAnimation(confetti2Y);
      cancelAnimation(confetti2Opacity);
    };
  }, [reducedMotion]);

  const bagAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bagScale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const confetti1Style = useAnimatedStyle(() => ({
    opacity: confetti1Opacity.value,
    transform: [{ translateY: confetti1Y.value }],
  }));

  const confetti2Style = useAnimatedStyle(() => ({
    opacity: confetti2Opacity.value,
    transform: [{ translateY: confetti2Y.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconArea}>
        <Animated.View style={[styles.successRing, ringAnimatedStyle]}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.confettiLeft, confetti1Style]}>
          <Ionicons name="sparkles" size={16} color={DesignTokens.colors.brand.camel} />
        </Animated.View>
        <Animated.View style={[styles.confettiRight, confetti2Style]}>
          <Ionicons name="sparkles" size={14} color={DesignTokens.colors.brand.sage} />
        </Animated.View>

        <Animated.View style={[styles.bagContainer, bagAnimatedStyle]}>
          <View style={styles.bag}>
            <Ionicons
              name="bag-handle-outline"
              size={36}
              color={DesignTokens.colors.brand.terracotta}
            />
          </View>
          <Animated.View style={[styles.checkmark, checkAnimatedStyle]}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={18} color={DesignTokens.colors.neutral.white} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.textContainer, titleAnimatedStyle]}>
        <Text style={styles.successTitle}>下单成功！</Text>
      </Animated.View>

      <Animated.View style={[subtitleAnimatedStyle]}>
        <Text style={styles.successSubtitle}>你的时尚单品正在飞奔而来</Text>
      </Animated.View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  iconArea: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[5],
  },
  successRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  confettiLeft: {
    position: "absolute",
    top: 8,
    left: -4,
  },
  confettiRight: {
    position: "absolute",
    top: 12,
    right: -4,
  },
  bagContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  bag: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DesignTokens.colors.brand.terracotta + "15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DesignTokens.colors.brand.terracotta + "30",
  },
  checkmark: {
    position: "absolute",
    bottom: -4,
    right: -4,
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DesignTokens.colors.semantic.success,
    alignItems: "center",
    justifyContent: "center",
    ...DesignTokens.shadows.sm,
  },
  textContainer: {
    alignItems: "center",
  },
  successTitle: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing[2],
  },
  successSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
  },
}));

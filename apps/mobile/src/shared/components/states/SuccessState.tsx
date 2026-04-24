import React, { useRef, useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../contexts/ThemeContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

const confettiColors = [
  DesignTokens.colors.brand.slateLight,
  DesignTokens.colors.brand.slateDark,
  colors.warning,
  colors.success,
  colors.error,
  DesignTokens.colors.brand.camel,
];

export interface SuccessStateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  confetti?: boolean;
  style?: ViewStyle;
}

interface ConfettiPieceProps {
  index: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index }) => {
  const styles = useStyles(colors);
  const initialX = useRef(Math.random() * SCREEN_WIDTH).current;
  const drift1 = useRef((Math.random() - 0.5) * 100).current;
  const drift2 = useRef((Math.random() - 0.5) * 100).current;
  const drift3 = useRef((Math.random() - 0.5) * 100).current;
  const fallDuration = useRef(2000 + Math.random() * 1000).current;
  const rotationDuration = useRef(1000 + Math.random() * 500).current;

  const confettiY = useSharedValue(-20);
  const confettiX = useSharedValue(initialX);
  const confettiRotation = useSharedValue(0);
  const confettiOpacity = useSharedValue(1);

  useEffect(() => {
    confettiY.value = withTiming(SCREEN_HEIGHT + 50, {
      duration: fallDuration,
      easing: Easing.out(Easing.quad),
    });
    confettiX.value = withSequence(
      withTiming(initialX + drift1, { duration: 500 }),
      withTiming(initialX + drift2, { duration: 500 }),
      withTiming(initialX + drift3, { duration: 500 })
    );
    confettiRotation.value = withRepeat(withTiming(360, { duration: rotationDuration }), -1, false);
    confettiOpacity.value = withDelay(1500, withTiming(0, { duration: 500 }));
  }, [
    confettiOpacity,
    confettiRotation,
    confettiX,
    confettiY,
    drift1,
    drift2,
    drift3,
    fallDuration,
    initialX,
    rotationDuration,
  ]);

  const confettiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: confettiY.value },
      { translateX: confettiX.value },
      { rotateZ: `${confettiRotation.value}deg` },
    ],
    opacity: confettiOpacity.value,
  }));

  return (
    <AnimatedView
      style={[
        styles.confetti,
        { backgroundColor: confettiColors[index % confettiColors.length] },
        confettiAnimatedStyle,
      ]}
    />
  );
};

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  message,
  icon = "checkmark-circle",
  actionLabel,
  onAction,
  confetti = false,
  style,
}) => {
  const styles = useStyles(colors);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, springConfig);

    setTimeout(() => {
      checkScale.value = withSpring(1, { damping: 8, stiffness: 200 });
      if (confetti) {
        runOnJS(setShowConfetti)(true);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      }
    }, 200);
  }, [confetti]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <AnimatedView style={[styles.successContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.successIconContainer, checkAnimatedStyle]}>
        <LinearGradient
          colors={[colors.success, DesignTokens.colors.semantic.success]}
          style={styles.successIconGradient}
        >
          <Ionicons name={icon} size={48} color={colors.textInverse} />
        </LinearGradient>
      </AnimatedView>

      <Text style={styles.successTitle}>{title}</Text>
      {message && <Text style={styles.successMessage}>{message}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.successAction} onPress={onAction}>
          <Text style={styles.successActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {Array(20)
            .fill(0)
            .map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
        </View>
      )}
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  successMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  successAction: {
    paddingVertical: 12,
  },
  successActionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.primary[500],
    fontWeight: "600",
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 2,
    top: -20,
  },
}));

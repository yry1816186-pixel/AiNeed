import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { useTypewriter } from '../../../hooks/useAdvancedAnimations';
import { Duration } from '../../../design-system/theme/tokens/animations';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

/** Blinking cursor shown while typewriter is active */
function TypingCursor() {
  const opacity = useSharedValue(1);
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: Duration.fast, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: Duration.fast, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [reducedMotion]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.cursor, cursorStyle]}>
      <Text style={styles.cursorText}>|</Text>
    </Animated.View>
  );
}

interface TypewriterMessageProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * AI message with typewriter effect.
 * Uses useTypewriter hook from useAdvancedAnimations.
 * Shows blinking cursor while typing, hides cursor when complete.
 */
export const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  text,
  speed = 40,
  onComplete,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { reducedMotion } = useReducedMotion();
  const displayText = useTypewriter(text, reducedMotion ? 0 : speed);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setIsComplete(true);
      onComplete?.();
      return;
    }
    // Calculate when typewriter should finish
    const timeout = text.length * speed;
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete?.();
    }, timeout);
    return () => clearTimeout(timer);
  }, [text, speed, reducedMotion, onComplete]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>{displayText}</Text>
      {!isComplete && <TypingCursor />}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  text: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  cursor: {
    marginLeft: DesignTokens.spacing.px,
    marginBottom: DesignTokens.spacing['0.5'],
  },
  cursorText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.primary,
  },
}))

import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Sparkle } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface AiInsightBubbleProps {
  message: string;
  typewriterSpeed?: number;
}

const DEFAULT_TYPEWRITER_SPEED = 40;
const SPARKLE_ROTATE_DEGREES = 15;
const SPARKLE_DURATION = 1000;
const TERRACOTTA = DesignTokens.colors.brand.terracotta;

export function AiInsightBubble({
  message,
  typewriterSpeed = DEFAULT_TYPEWRITER_SPEED,
}: AiInsightBubbleProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [displayedLength, setDisplayedLength] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sparkleRotation = useSharedValue(0);

  useEffect(() => {
    sparkleRotation.value = withRepeat(
      withSequence(
        withTiming(SPARKLE_ROTATE_DEGREES, { duration: SPARKLE_DURATION }),
        withTiming(-SPARKLE_ROTATE_DEGREES, { duration: SPARKLE_DURATION })
      ),
      -1,
      true
    );
  }, [sparkleRotation]);

  useEffect(() => {
    setDisplayedLength(0);
    setIsTypingComplete(false);

    if (message.length === 0) {
      setIsTypingComplete(true);
      return;
    }

    let currentIndex = 0;
    intervalRef.current = setInterval(() => {
      currentIndex += 1;
      setDisplayedLength(currentIndex);
      if (currentIndex >= message.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTypingComplete(true);
      }
    }, typewriterSpeed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [message, typewriterSpeed]);

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  const displayedText = message.slice(0, displayedLength);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Animated.View style={sparkleAnimatedStyle}>
          <Sparkle size={16} weight="fill" color={TERRACOTTA} />
        </Animated.View>
        <Text style={styles.label}>伊伊有话说</Text>
      </View>
      <View style={styles.messageRow}>
        <Text style={styles.message}>{displayedText}</Text>
        {!isTypingComplete && <Text style={styles.cursor}>|</Text>}
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: colors.surfaceSecondary,
  },
  labelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: DesignTokens.spacing[2],
  },
  label: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: TERRACOTTA,
    marginLeft: DesignTokens.spacing[1.5],
  },
  messageRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
  },
  message: {
    fontSize: DesignTokens.typography.sizes.base,
    fontStyle: "italic",
    color: colors.textSecondary,
    lineHeight: DesignTokens.typography.sizes.base * DesignTokens.typography.lineHeights.relaxed,
    flex: 1,
  },
  cursor: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: DesignTokens.typography.fontWeights.bold,
    color: TERRACOTTA,
  },
}));

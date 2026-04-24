import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Sparkle } from "phosphor-react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { DesignTokens } from "../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";
import { useTheme, createStyles } from "../../shared/contexts/ThemeContext";
import {
  Colors,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  Typography as ThemeTypography,
} from "../theme";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  showAvatar?: boolean;
  /** Optional embedded content (e.g. OutfitResultBubble) */
  children?: React.ReactNode;
}

/**
 * ChatBubble - Chat bubble component with directional spring entrance
 *
 * Features:
 * - User messages: brand gradient background + right alignment + spring from right
 * - AI messages: white card + left alignment + spring from left + triangle indicator
 * - AI avatar: brand gradient circle with Sparkle icon
 * - Timestamp display (optional)
 * - children prop for embedding rich content (e.g. outfit result cards)
 * - Directional entrance: user → FadeInRight, AI → FadeInLeft
 * - Scale spring: 0.95 → 1 with bouncy config
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  timestamp,
  showAvatar = true,
  children,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  // Scale spring entrance: 0.95 → 1
  const scale = useSharedValue(0.95);
  useEffect(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  }, [scale]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Directional entrance: user → right, AI → left
  const entering = isUser
    ? FadeInRight.duration(300).springify().damping(12).stiffness(180)
    : FadeInLeft.duration(300).springify().damping(12).stiffness(180);

  return (
    <Animated.View entering={entering} style={scaleStyle}>
      <View style={[styles.container, !isUser && styles.aiContainer]}>
        {/* AI avatar */}
        {!isUser && showAvatar && (
          <LinearGradient
            colors={DesignTokens.gradients.brand as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Sparkle size={16} color={Colors.neutral.white} weight="fill" />
          </LinearGradient>
        )}

        {/* Message bubble */}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {isUser ? (
            // User message: brand gradient background
            <LinearGradient
              colors={DesignTokens.gradients.brand as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userGradient}
            >
              <Text style={styles.userMessage}>{message}</Text>
              {timestamp && <Text style={styles.userTimestamp}>{timestamp}</Text>}
            </LinearGradient>
          ) : (
            // AI message: white card + triangle indicator
            <>
              <Text style={styles.aiMessage}>{message}</Text>
              {children}
              {timestamp && <Text style={styles.aiTimestamp}>{timestamp}</Text>}
              <View style={styles.triangle} />
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    marginBottom: 12,
    maxWidth: "80%",
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  aiContainer: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  // Bubble styles
  bubble: {
    borderRadius: ThemeBorderRadius["2xl"],
    overflow: "hidden",
    ...ThemeShadows.sm,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.neutral.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },

  // User message styles
  userGradient: {
    padding: 14,
    borderRadius: ThemeBorderRadius["2xl"],
    borderBottomRightRadius: 4,
  },
  userMessage: {
    fontSize: ThemeTypography.sizes.base,
    color: colors.surface,
    lineHeight: 22,
  },
  userTimestamp: {
    fontSize: ThemeTypography.sizes.xs,
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
    textAlign: "right",
  },

  // AI message styles
  aiMessage: {
    fontSize: ThemeTypography.sizes.base,
    color: colors.neutral[900],
    lineHeight: 22,
    padding: 14,
  },
  aiTimestamp: {
    fontSize: ThemeTypography.sizes.xs,
    color: colors.neutral[400],
    marginTop: 6,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  triangle: {
    position: "absolute",
    bottom: 0,
    left: -6,
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftWidth: 0,
    borderRightColor: Colors.neutral.white,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
  },
}));

export default ChatBubble;

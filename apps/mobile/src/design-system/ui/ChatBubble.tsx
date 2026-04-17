import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

// 引入主题令牌
import { DesignTokens } from '../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import {
  Colors,
  Spacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
  Typography as ThemeTypography,
} from '../theme';


interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  showAvatar?: boolean;
}

/**
 * ChatBubble - 国赛一等奖水准聊天气泡
 *
 * 设计特点：
 * - 用户消息：珊瑚粉渐变背景 + 右对齐 + 白色文字
 * - AI消息：白色卡片 + 左对齐 + 深色文字 + 小三角指示器
 * - AI头像支持（渐变圆形）
 * - 时间戳显示（可选）
 * - 入场动画 (FadeInUp)
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  timestamp,
  showAvatar = true,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Animated.View entering={FadeInUp.duration(300).springify()}>
      <View style={[styles.container, !isUser && styles.aiContainer]}>
        {/* AI头像 */}
        {!isUser && showAvatar && (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Ionicons name="sparkles" size={16} color={colors.neutral.white} />
          </LinearGradient>
        )}

        {/* 气泡内容 */}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {isUser ? (
            // 用户消息：渐变背景
            <LinearGradient
              colors={[Colors.primary[500], Colors.primary[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userGradient}
            >
              <Text style={styles.userMessage}>{message}</Text>
              {timestamp && <Text style={styles.userTimestamp}>{timestamp}</Text>}
            </LinearGradient>
          ) : (
            // AI消息：白色卡片 + 小三角
            <>
              <Text style={styles.aiMessage}>{message}</Text>
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
    marginBottom: DesignTokens.spacing[3],
    maxWidth: "80%",
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  aiContainer: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },

  // 气泡样式
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
    borderColor: Colors.neutral[200],
  },

  // 用户消息样式
  userGradient: {
    padding: DesignTokens.spacing['3.5'],
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
    marginTop: DesignTokens.spacing['1.5'],
    textAlign: "right",
  },

  // AI消息样式
  aiMessage: {
    fontSize: ThemeTypography.sizes.base,
    color: Colors.neutral[900],
    lineHeight: 22,
    padding: DesignTokens.spacing['3.5'],
  },
  aiTimestamp: {
    fontSize: ThemeTypography.sizes.xs,
    color: Colors.neutral[400],
    marginTop: DesignTokens.spacing['1.5'],
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingBottom: DesignTokens.spacing['2.5'],
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
}))

export default ChatBubble;

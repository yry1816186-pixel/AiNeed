import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import {
  Spacing,
  BorderRadius,
  DesignTokens,
  flatColors as colors,
} from "../../../design-system/theme";
import type { ChatMessage } from "../stores/aiStylistChatStore";

interface ChatBubbleProps {
  message: ChatMessage;
  isLatestAssistant?: boolean;
  onSpeak?: (text: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isLatestAssistant = false,
  onSpeak,
}) => {
  const isUser = message.role === "user";

  return (
    <View style={[s.container, isUser ? s.userContainer : s.assistantContainer]}>
      {!isUser && (
        <View style={s.avatar}>
          <Ionicons name="sparkles" size={14} color={colors.surface} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.userBubble : s.assistantBubble]}>
        <Text style={[s.bubbleText, isUser ? s.userBubbleText : s.assistantBubbleText]}>
          {message.content}
        </Text>
      </View>
      {!isUser && isLatestAssistant && onSpeak && (
        <TouchableOpacity
          style={s.speakBtn}
          onPress={() => onSpeak(message.content)}
          activeOpacity={0.7}
        >
          <Ionicons name="volume-medium-outline" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  assistantContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[2],
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceSecondary,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 20,
  },
  userBubbleText: {
    color: colors.surface,
  },
  assistantBubbleText: {
    color: colors.textPrimary,
  },
  speakBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing[1],
    marginBottom: 2,
  },
});

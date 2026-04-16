import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import { useTheme, createStyles } from 'undefined';
import { useTranslation } from "../i18n";
import { DesignTokens } from "../theme/tokens/design-tokens";

import { SpringConfigs, ListAnimations, Duration } from "../theme/tokens/animations";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { AIThinkingAnimation } from "../components/aistylist/AIThinkingAnimation";
import { TypewriterMessage } from "../components/aistylist/TypewriterMessage";
import { useAiStylistStore } from "../stores/aiStylistStore";
import { useAiStylistChatStore } from "../stores/aiStylistChatStore";
import { useAnalytics, useScreenTracking, AnalyticsEvents } from "../hooks/useAnalytics";
import type { ChatMessage } from "../stores/aiStylistChatStore";
import type { StylistStackParamList } from "../navigation/types";

type AiStylistChatRoute = RouteProp<StylistStackParamList, "AiStylistChat">;

const SCENE_BUTTONS = [
  { key: "date", label: "约会之夜", icon: "heart-outline" as const, message: "我需要一套约会穿搭" },
  {
    key: "work",
    label: "职场通勤",
    icon: "briefcase-outline" as const,
    message: "我需要一套职场穿搭",
  },
  {
    key: "casual",
    label: "休闲周末",
    icon: "sunny-outline" as const,
    message: "我需要一套休闲周末穿搭",
  },
  {
    key: "formal",
    label: "正式场合",
    icon: "ribbon-outline" as const,
    message: "我需要一套正式场合穿搭",
  },
  {
    key: "travel",
    label: "旅行出行",
    icon: "airplane-outline" as const,
    message: "我需要旅行穿搭建议",
  },
];

export const AiStylistChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AiStylistChatRoute>();
  const sessionId = route.params?.sessionId;
  const { track } = useAnalytics();
  useScreenTracking("AiStylistChat");
  const { seasonAccent } = useTheme();
  const t = useTranslation();

  // 季节强调色，回退到品牌色
  const accentColor = seasonAccent?.accent ?? colors.primary;

  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");

  const { messages, addMessage } = useAiStylistChatStore();

  const {
    currentSessionId,
    isGenerating,
    error,
    createSession,
    sendMessage,
    fetchOutfitPlan,
    clearError,
  } = useAiStylistStore();

  const activeSessionId = sessionId ?? currentSessionId;

  useEffect(() => {
    if (sessionId) {
      useAiStylistStore.getState().setCurrentSessionId(sessionId);
    }
  }, [sessionId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isGenerating) {
      return;
    }

    setInputText("");
    track(AnalyticsEvents.BUTTON_CLICK, { action: "stylist_send_message", messageLength: text.length });

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    let sid = activeSessionId;
    if (!sid) {
      sid = await createSession(text);
    }

    if (sid) {
      const result = await sendMessage(text);
      if (result?.assistantMessage) {
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: result.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMsg);
      }
      if (result?.result) {
        await fetchOutfitPlan(sid);
      }
    }
  }, [inputText, isGenerating, activeSessionId, createSession, sendMessage, fetchOutfitPlan]);

  const handleScenePress = useCallback(
    async (scene: (typeof SCENE_BUTTONS)[number]) => {
      if (isGenerating) {
        return;
      }

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: scene.message,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);

      let sid = activeSessionId;
      if (!sid) {
        sid = await createSession(scene.message);
      }
      if (sid) {
        const result = await sendMessage(scene.message);
        if (result?.assistantMessage) {
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: result.assistantMessage,
            timestamp: new Date().toISOString(),
          };
          addMessage(assistantMsg);
        }
      }
    },
    [isGenerating, activeSessionId, createSession, sendMessage]
  );

  const renderMessage = useCallback(
    (msg: ChatMessage, index: number) => (
      <AnimatedMessageBubble key={msg.id} msg={msg} index={index} />
    ),
    []
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} accessibilityLabel="返回" accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.onlineDot} />
          <Text style={s.headerTitle}>{t.navigation.stylist}</Text>
        </View>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.navigate("ChatHistory")}
          accessibilityLabel="聊天记录"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollViewRef}
          style={s.flex}
          contentContainerStyle={s.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError} accessibilityLabel="关闭错误提示" accessibilityRole="button">
                <Text style={s.errorDismiss}>关闭</Text>
              </TouchableOpacity>
            </View>
          )}

          {messages.length === 0 && (
            <View style={s.welcomeSection}>
              <View style={s.welcomeIcon}>
              <Ionicons name="sparkles" size={32} color={accentColor} />
            </View>
              <Text style={s.welcomeTitle}>{t.stylist.greeting}</Text>
              <Text style={s.welcomeSubtitle}>{t.stylist.askOccasion}</Text>
            </View>
          )}

          {messages.map((msg, idx) => renderMessage(msg, idx))}

          {isGenerating && (
            <View style={[s.messageBubble, s.assistantBubble]}>
              <View style={[s.aiAvatar, { backgroundColor: accentColor }]}>
                <Ionicons name="sparkles" size={12} color={colors.surface} />
              </View>
              <AIThinkingAnimation />
            </View>
          )}
        </ScrollView>

        {/* Scene quick buttons */}
        <View style={s.sceneRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.sceneScrollContent}
          >
            {SCENE_BUTTONS.map((scene) => (
              <TouchableOpacity
                key={scene.key}
                style={[s.sceneButton, { borderColor: accentColor, borderWidth: 1 }]}
                onPress={() => handleScenePress(scene)}
                disabled={isGenerating}
                accessibilityLabel={scene.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: isGenerating }}
              >
                <Ionicons name={scene.icon} size={16} color={accentColor} />
                <Text style={[s.sceneLabel, { color: accentColor }]}>{scene.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input area */}
        <View style={s.inputRow}>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.input}
              placeholder={t.stylist.askStyle}
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              editable={!isGenerating}
              multiline
              maxLength={500}
              accessibilityLabel="输入穿搭需求"
            />
          </View>
          <TouchableOpacity
            style={[s.sendButton, (!inputText.trim() || isGenerating) && s.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
            accessibilityLabel="发送消息"
            accessibilityRole="button"
            accessibilityState={{ disabled: !inputText.trim() || isGenerating }}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? DesignTokens.colors.neutral.white : colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  messagesContainer: { padding: 16, paddingBottom: 8 },
  welcomeSection: { alignItems: "center", paddingVertical: 40 },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  welcomeTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.text },
  welcomeSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  messageBubble: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end" },
  userBubble: { justifyContent: "flex-end" },
  assistantBubble: { justifyContent: "flex-start" },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  bubbleContent: { maxWidth: "75%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubbleContent: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistantBubbleContent: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: DesignTokens.typography.sizes.base, lineHeight: 20 },
  userBubbleText: { color: colors.surface },
  assistantBubbleText: { color: colors.text },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 4,
  },
  typingText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: DesignTokens.colors.semantic.errorLight,
  },
  errorText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.error, flex: 1 },
  errorDismiss: { fontSize: DesignTokens.typography.sizes.sm, color: colors.error, fontWeight: "600", marginLeft: 12 },
  sceneRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  sceneScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  sceneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.subtleBg,
  },
  sceneLabel: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "500", color: colors.primary },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, maxHeight: 80, paddingVertical: 8 },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: colors.subtleBg },
});

/** Animated message bubble with staggered entrance and typewriter for AI */
const AnimatedMessageBubble: React.FC<{ msg: ChatMessage; index: number }> = ({ msg, index }) => {
  const { reducedMotion } = useReducedMotion();
  const { seasonAccent } = useTheme();
  const accentColor = seasonAccent?.accent ?? colors.primary;
  const translateY = useSharedValue(reducedMotion ? 0 : 20);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const staggerDelay = index * ListAnimations.stagger.delay;
    translateY.value = withDelay(
      staggerDelay,
      withSpring(0, SpringConfigs.gentle)
    );
    opacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: Duration.normal })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const isLatestAssistant = msg.role === "assistant";

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={[s.messageBubble, msg.role === "user" ? s.userBubble : s.assistantBubble]}
      >
        {msg.role === "assistant" && (
          <View style={[s.aiAvatar, { backgroundColor: accentColor }]}>
            <Ionicons name="sparkles" size={12} color={colors.surface} />
          </View>
        )}
        <View
          style={[
            s.bubbleContent,
            msg.role === "user" ? s.userBubbleContent : s.assistantBubbleContent,
          ]}
        >
          {isLatestAssistant ? (
            <TypewriterMessage
              text={msg.content}
              speed={40}
              textStyle={[s.bubbleText, s.assistantBubbleText]}
            />
          ) : (
            <Text style={[s.bubbleText, msg.role === "user" ? s.userBubbleText : s.assistantBubbleText]}>
              {msg.content}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export default AiStylistChatScreen;

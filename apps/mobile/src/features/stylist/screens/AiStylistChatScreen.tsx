import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { useTranslation } from '../../../i18n';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';

import { SpringConfigs, ListAnimations, Duration } from '../../../design-system/theme/tokens/animations';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { AIThinkingAnimation } from '../components/AIThinkingAnimation';
import { TypewriterMessage } from '../components/TypewriterMessage';
import { useAiStylistStore } from '../stores/aiStylistStore';
import { useAiStylistChatStore } from '../stores/aiStylistChatStore';
import { useAnalytics, useScreenTracking, AnalyticsEvents } from '../../../hooks/useAnalytics';
import type { ChatMessage } from '../stores/aiStylistChatStore';
import type { StylistStackParamList } from '../../../navigation/types';


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
  const navigation = useNavigation<NavigationProp<StylistStackParamList>>();
  const route = useRoute<AiStylistChatRoute>();
  const sessionId = route.params?.sessionId;
  const { track } = useAnalytics();
  useScreenTracking("AiStylistChat");
  const { colors, seasonAccent } = useTheme();
  const styles = useStyles(colors);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="返回" accessibilityRole="button">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.onlineDot} />
          <Text style={styles.headerTitle}>{t.navigation.stylist}</Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("ChatHistory")}
          accessibilityLabel="聊天记录"
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError} accessibilityLabel="关闭错误提示" accessibilityRole="button">
                <Text style={styles.errorDismiss}>关闭</Text>
              </TouchableOpacity>
            </View>
          )}

          {messages.length === 0 && (
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeIcon}>
              <Ionicons name="sparkles" size={32} color={accentColor} />
            </View>
              <Text style={styles.welcomeTitle}>{t.stylist.greeting}</Text>
              <Text style={styles.welcomeSubtitle}>{t.stylist.askOccasion}</Text>
            </View>
          )}

          {messages.map((msg, idx) => renderMessage(msg, idx))}

          {isGenerating && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={[styles.aiAvatar, { backgroundColor: accentColor }]}>
                <Ionicons name="sparkles" size={12} color={colors.surface} />
              </View>
              <AIThinkingAnimation />
            </View>
          )}
        </ScrollView>

        {/* Scene quick buttons */}
        <View style={styles.sceneRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sceneScrollContent}
          >
            {SCENE_BUTTONS.map((scene) => (
              <AnimatedSceneButton
                key={scene.key}
                scene={scene}
                accentColor={accentColor}
                onPress={() => handleScenePress(scene)}
                disabled={isGenerating}
                style={styles.sceneButton}
                labelStyle={styles.sceneLabel}
              />
            ))}
          </ScrollView>
        </View>

        {/* Input area */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
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
            style={[styles.sendButton, (!inputText.trim() || isGenerating) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
            accessibilityLabel="发送消息"
            accessibilityRole="button"
            accessibilityState={{ disabled: !inputText.trim() || isGenerating }}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? colors.surface : colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ============ Dynamic Styles ============

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5']},
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: c.textPrimary },
  onlineDot: { width: Spacing.sm, height: Spacing.sm, borderRadius: 4, backgroundColor: c.success },
  backBtn: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  messagesContainer: { padding: Spacing.md, paddingBottom: Spacing.sm},
  welcomeSection: { alignItems: "center", paddingVertical: DesignTokens.spacing[10]},
  welcomeIcon: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
    backgroundColor: c.subtleBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  welcomeTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: c.textPrimary },
  welcomeSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: c.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  messageBubble: { flexDirection: "row", marginBottom: DesignTokens.spacing[3], alignItems: "flex-end" },
  userBubble: { justifyContent: "flex-end" },
  assistantBubble: { justifyContent: "flex-start" },
  aiAvatar: {
    width: DesignTokens.spacing[7],
    height: DesignTokens.spacing[7],
    borderRadius: 14,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  bubbleContent: { maxWidth: "75%", borderRadius: 16, paddingHorizontal: DesignTokens.spacing['3.5'], paddingVertical: DesignTokens.spacing['2.5']},
  userBubbleContent: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
  assistantBubbleContent: { backgroundColor: c.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: DesignTokens.typography.sizes.base, lineHeight: 20 },
  userBubbleText: { color: c.surface },
  assistantBubbleText: { color: c.textPrimary },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing['2.5'],
    borderBottomLeftRadius: 4,
  },
  typingText: { fontSize: DesignTokens.typography.sizes.sm, color: c.textSecondary },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: DesignTokens.spacing[3],
    padding: DesignTokens.spacing['2.5'],
    borderRadius: 10,
    backgroundColor: c.errorLight,
  },
  errorText: { fontSize: DesignTokens.typography.sizes.sm, color: c.error, flex: 1 },
  errorDismiss: { fontSize: DesignTokens.typography.sizes.sm, color: c.error, fontWeight: "600", marginLeft: DesignTokens.spacing[3]},
  sceneRow: {
    borderTopWidth: 1,
    borderTopColor: c.divider,
    backgroundColor: c.surface,
  },
  sceneScrollContent: { paddingHorizontal: DesignTokens.spacing[3], paddingVertical: Spacing.sm, gap: Spacing.sm},
  sceneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 16,
    backgroundColor: c.subtleBg,
  },
  sceneLabel: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "500", color: c.primary },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: 20,
    paddingHorizontal: DesignTokens.spacing[3],
  },
  input: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: c.textPrimary, maxHeight: Spacing['4xl'], paddingVertical: Spacing.sm},
  sendButton: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: { backgroundColor: c.subtleBg },
}));

// ============ Animated Scene Button ============

interface AnimatedSceneButtonProps {
  scene: (typeof SCENE_BUTTONS)[number];
  accentColor: string;
  onPress: () => void;
  disabled: boolean;
  style: any;
  labelStyle: any;
}

const AnimatedSceneButton: React.FC<AnimatedSceneButtonProps> = ({
  scene,
  accentColor,
  onPress,
  disabled,
  style,
  labelStyle,
}) => {
  const { reducedMotion } = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  }, [reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  }, [reducedMotion]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[style, { borderColor: accentColor, borderWidth: 1 }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel={scene.label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Ionicons name={scene.icon} size={16} color={accentColor} />
        <Text style={[labelStyle, { color: accentColor }]}>{scene.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/** Animated message bubble with staggered entrance and typewriter for AI */
const AnimatedMessageBubble: React.FC<{ msg: ChatMessage; index: number }> = ({ msg, index }) => {
  const { reducedMotion } = useReducedMotion();
  const { colors, seasonAccent } = useTheme();
  const s = useStyles(colors);
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

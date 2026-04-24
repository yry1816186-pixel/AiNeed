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
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import {
  Spacing,
  BorderRadius,
  Shadows,
  DesignTokens,
  flatColors as colors,
} from "../../../design-system/theme";
import { useAiStylistStore } from "../stores/aiStylistStore";
import { useAiStylistChatStore, type ChatMessage } from "../stores/aiStylistChatStore";
import { ChatBubble } from "../components/ChatBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { VoiceButton } from "../components/VoiceButton";
import { QuickReplyBar } from "../components/QuickReplyBar";
import { OutfitResultBubble } from "../components/OutfitResultBubble";
import { speak } from "../../../services/speech/ttsService";
import { MatchRadarChart, type MatchScores } from "../../../design-system/ui/MatchRadarChart";

type ConversationStage = "GREET" | "CONTEXT" | "GENERATE" | "REFINE" | "ACTION" | "WRAP";

/** Map backend DialogState to frontend ConversationStage */
function mapStateToStage(state: string): ConversationStage {
  const stageMap: Record<string, ConversationStage> = {
    GREET: "GREET",
    CONTEXT: "CONTEXT",
    GENERATE: "GENERATE",
    REFINE: "REFINE",
    ACTION: "ACTION",
    WRAP: "WRAP",
  };
  return stageMap[state] ?? "GREET";
}

/** Client-side fallback: infer stage from message content */
function inferStageFromMessage(content: string): ConversationStage | null {
  if (content.includes("方案") || content.includes("推荐")) {
    return "GENERATE";
  }
  if (content.includes("风格") || content.includes("偏好")) {
    return "CONTEXT";
  }
  if (content.includes("换") || content.includes("调整")) {
    return "REFINE";
  }
  return null;
}

const QUICK_REPLIES: Record<ConversationStage, string[]> = {
  GREET: ["面试穿搭", "约会穿搭", "日常通勤", "旅行穿搭"],
  CONTEXT: ["简约利落", "温柔优雅", "活力运动", "前卫个性"],
  GENERATE: ["喜欢方案A", "喜欢方案B", "都不喜欢"],
  REFINE: ["换个颜色", "换个价位", "换个风格"],
  ACTION: ["查看详情", "保存方案", "重新搭配"],
  WRAP: ["再来一次", "分享给朋友"],
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export const StylistScreen: React.FC = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelAnim] = useState(new Animated.Value(0));
  const [isListening, setIsListening] = useState(false);
  const [conversationStage, setConversationStage] = useState<ConversationStage>("GREET");
  const [apiQuickReplies, setApiQuickReplies] = useState<string[] | null>(null);

  const { messages, addMessage } = useAiStylistChatStore();
  const {
    currentSessionId,
    isGenerating,
    error,
    createSession,
    sendMessage,
    fetchOutfitPlan,
    currentOutfitPlan,
    clearError,
    createDialogSession,
    sendDialogMessage,
    dialogSessionId,
  } = useAiStylistStore();

  /** Use API quickReplies if available, otherwise fall back to client-side mapping */
  const quickReplies = apiQuickReplies ?? QUICK_REPLIES[conversationStage];

  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        id: "greeting",
        role: "assistant",
        content: "嗨！我是伊伊，你的AI穿搭搭子。今天想聊什么场景？",
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        // If the message carries backend state metadata, use it directly
        const backendState = (lastMsg as ChatMessage & { backendState?: string }).backendState;
        if (backendState) {
          setConversationStage(mapStateToStage(backendState));
        } else {
          // Fallback: infer stage from message content
          const inferred = inferStageFromMessage(lastMsg.content);
          if (inferred) {
            setConversationStage(inferred);
          }
        }
      }
    }
  }, [messages]);

  const togglePanel = useCallback(() => {
    const toValue = panelVisible ? 0 : 1;
    Animated.spring(panelAnim, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    setPanelVisible(!panelVisible);
  }, [panelVisible, panelAnim]);

  const panelTranslateX = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH, 0],
  });

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isGenerating) {
      return;
    }

    setInputText("");

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Try dialog state machine first, fallback to session-based
    let usedDialog = false;
    let dSid = dialogSessionId;
    if (dSid) {
      const result = await sendDialogMessage(text);
      if (result) {
        usedDialog = true;
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: result.reply,
          timestamp: new Date().toISOString(),
          backendState: result.state,
        };
        addMessage(assistantMsg);
        setConversationStage(mapStateToStage(result.state));
        setApiQuickReplies(result.quickReplies?.length ? result.quickReplies : null);
      }
    }

    if (!usedDialog) {
      // Ensure dialog session exists for next time
      if (!dSid) {
        dSid = await createDialogSession();
      }

      // Fallback to session-based path
      setConversationStage("CONTEXT");
      let sid = currentSessionId;
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

          const sessionState = result.sessionState;
          if (sessionState?.currentStage) {
            setConversationStage(mapStateToStage(sessionState.currentStage));
          }
          setApiQuickReplies(null);
        }
        if (result?.result) {
          await fetchOutfitPlan(sid);
          setConversationStage("GENERATE");
        }
      }
    }
  }, [
    inputText,
    isGenerating,
    currentSessionId,
    dialogSessionId,
    createSession,
    sendMessage,
    fetchOutfitPlan,
    addMessage,
    createDialogSession,
    sendDialogMessage,
  ]);

  const handleQuickReply = useCallback(
    async (reply: string) => {
      if (isGenerating) {
        return;
      }

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);

      // Try dialog state machine first
      let usedDialog = false;
      let dSid = dialogSessionId;
      if (dSid) {
        const result = await sendDialogMessage(reply);
        if (result) {
          usedDialog = true;
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: result.reply,
            timestamp: new Date().toISOString(),
            backendState: result.state,
          };
          addMessage(assistantMsg);
          setConversationStage(mapStateToStage(result.state));
          setApiQuickReplies(result.quickReplies?.length ? result.quickReplies : null);
        }
      }

      if (!usedDialog) {
        if (!dSid) {
          dSid = await createDialogSession();
        }

        // Optimistic local stage update
        if (reply.includes("不喜欢") || reply.includes("换个")) {
          setConversationStage("REFINE");
        } else if (reply.includes("喜欢方案")) {
          setConversationStage("REFINE");
        }

        let sid = currentSessionId;
        if (!sid) {
          sid = await createSession(reply);
        }
        if (sid) {
          const result = await sendMessage(reply);
          if (result?.assistantMessage) {
            const assistantMsg: ChatMessage = {
              id: `assistant_${Date.now()}`,
              role: "assistant",
              content: result.assistantMessage,
              timestamp: new Date().toISOString(),
            };
            addMessage(assistantMsg);

            const sessionState = result.sessionState;
            if (sessionState?.currentStage) {
              setConversationStage(mapStateToStage(sessionState.currentStage));
            }
            setApiQuickReplies(null);
          }
          if (result?.result) {
            await fetchOutfitPlan(sid);
            setConversationStage("GENERATE");
          }
        }
      }
    },
    [
      isGenerating,
      currentSessionId,
      dialogSessionId,
      createSession,
      sendMessage,
      fetchOutfitPlan,
      addMessage,
      createDialogSession,
      sendDialogMessage,
    ]
  );

  const handleSpeak = useCallback((text: string) => {
    void speak(text);
  }, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.avatarWrap}>
            <Ionicons name="sparkles" size={16} color={colors.surface} />
          </View>
          <View>
            <Text style={s.headerTitle}>造型师伊伊</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>在线</Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          {currentOutfitPlan && (
            <TouchableOpacity style={s.panelToggle} onPress={togglePanel} activeOpacity={0.7}>
              <Ionicons
                name={panelVisible ? "close" : "shirt-outline"}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          )}
        </View>
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
              <TouchableOpacity onPress={clearError}>
                <Text style={s.errorDismiss}>关闭</Text>
              </TouchableOpacity>
            </View>
          )}

          {messages.map((msg, idx) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isLatestAssistant={msg.role === "assistant" && idx === messages.length - 1}
              onSpeak={handleSpeak}
            />
          ))}

          {currentOutfitPlan && currentOutfitPlan.outfits.length > 0 && (
            <View style={{ paddingHorizontal: Spacing[4], marginBottom: Spacing[3] }}>
              <OutfitResultBubble
                outfits={currentOutfitPlan.outfits.map((o, i) => ({
                  id: String(i),
                  image: "",
                  title: o.title,
                  matchScore: 85,
                }))}
              />
            </View>
          )}

          {isGenerating && (
            <View style={s.thinkingRow}>
              <TypingIndicator />
            </View>
          )}
        </ScrollView>

        {!isGenerating && (
          <QuickReplyBar
            options={quickReplies}
            onSelect={(reply) => void handleQuickReply(reply)}
          />
        )}

        <View style={s.inputRow}>
          <VoiceButton isListening={isListening} onPress={() => setIsListening(!isListening)} />
          <View style={s.inputWrapper}>
            <TextInput
              style={s.input}
              placeholder="和伊伊聊聊穿搭..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => void handleSend()}
              editable={!isGenerating}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[s.sendButton, (!inputText.trim() || isGenerating) && s.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={!inputText.trim() || isGenerating}
            activeOpacity={0.7}
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

      {currentOutfitPlan && (
        <Animated.View style={[s.outfitPanel, { transform: [{ translateX: panelTranslateX }] }]}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>搭配方案</Text>
            <TouchableOpacity onPress={togglePanel} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.panelContent} showsVerticalScrollIndicator={false}>
            {currentOutfitPlan.outfits.map((outfit, idx) => {
              const outfitMatchScores = (outfit as Record<string, unknown>).match_scores as
                | MatchScores
                | undefined;
              return (
                <View key={idx} style={s.outfitCard}>
                  <Text style={s.outfitCardTitle}>{outfit.title}</Text>
                  {outfitMatchScores && (
                    <View style={s.outfitRadarContainer}>
                      <MatchRadarChart
                        scores={outfitMatchScores}
                        size={180}
                        showLabels={true}
                        showScoreList={false}
                      />
                    </View>
                  )}
                  {outfit.items.map((item, iIdx) => (
                    <View key={iIdx} style={s.outfitItem}>
                      <View style={s.outfitItemIcon}>
                        <Ionicons name="shirt-outline" size={16} color={colors.primary} />
                      </View>
                      <View style={s.outfitItemInfo}>
                        <Text style={s.outfitItemName}>{item.name}</Text>
                        <Text style={s.outfitItemCategory}>{item.category}</Text>
                      </View>
                    </View>
                  ))}
                  {outfit.styleExplanation && (
                    <Text style={s.outfitExplanation}>{outfit.styleExplanation.join(" · ")}</Text>
                  )}
                  {outfit.estimatedTotalPrice && (
                    <Text style={s.outfitPrice}>约 ¥{outfit.estimatedTotalPrice}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[2],
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  panelToggle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesContainer: {
    paddingVertical: Spacing[3],
    paddingBottom: Spacing[2],
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: colors.errorLight,
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.error,
    flex: 1,
  },
  errorDismiss: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.error,
    fontWeight: "600",
    marginLeft: Spacing[3],
  },
  quickRepliesRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  quickRepliesContent: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  quickReplyBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    marginRight: Spacing[2],
  },
  quickReplyText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.primaryDark,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[3],
  },
  input: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    maxHeight: 80,
    paddingVertical: Spacing[2],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing[2],
  },
  sendButtonDisabled: {
    backgroundColor: colors.subtleBg,
  },
  outfitPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: SCREEN_WIDTH * 0.85,
    height: "100%",
    backgroundColor: colors.surface,
    ...Shadows.brand,
    zIndex: 50,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  panelTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  outfitCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  outfitCardTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[2],
  },
  outfitRadarContainer: {
    alignItems: "center",
    paddingVertical: Spacing[2],
    marginBottom: Spacing[2],
  },
  outfitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  outfitItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  outfitItemInfo: {
    flex: 1,
  },
  outfitItemName: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  outfitItemCategory: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
  },
  outfitExplanation: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: Spacing[1],
    lineHeight: 16,
  },
  outfitPrice: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.primary,
    marginTop: Spacing[1],
  },
});

export default StylistScreen;

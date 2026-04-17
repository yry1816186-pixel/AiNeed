import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  ActionSheetIOS,
} from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { CompanionState } from "./AICompanionBall";
import {
  AiStylistAction,
  AiStylistActionType,
  AiStylistResolution,
} from '../../../services/api/ai-stylist.api';
import { PreferenceSelector } from "./PreferenceSelector";
import { OutfitCard } from "./OutfitCard";
import { AnalysisProgress } from "./AnalysisProgress";
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


const { width: _SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  actionType?: AiStylistActionType;
  actionData?: AiStylistAction;
  outfitResult?: AiStylistResolution;
  progress?: AiStylistProgress;
}

export interface AiStylistProgress {
  stage: string;
  title: string;
  detail: string;
  etaSeconds?: number;
  canLeaveAndResume: boolean;
  isWaiting: boolean;
}

export interface AICompanionChatProps {
  visible: boolean;
  messages: ChatMessage[];
  state: CompanionState;
  onSendMessage: (message: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  currentAction?: AiStylistAction | null;
  onUploadPhoto?: (source?: "camera" | "library") => void;
  onSelectPreference?: (field: string, values: string[]) => void;
  onGenerateOutfit?: () => void;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  isVoiceAvailable?: boolean;
}

export const AICompanionChat: React.FC<AICompanionChatProps> = ({
  visible,
  messages,
  state,
  onSendMessage,
  onClose,
  title = "AI 造型师",
  placeholder = "输入你的问题...",
  currentAction,
  onUploadPhoto,
  onSelectPreference,
  onGenerateOutfit,
  onStartVoice,
  onStopVoice,
  isVoiceAvailable = false,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const panelTranslateY = useSharedValue(SCREEN_HEIGHT);
  const panelOpacity = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const inputOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      panelOpacity.value = withTiming(1, { duration: 200 });
      panelTranslateY.value = withSpring(0, { damping: 20, stiffness: 100 });
      headerOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));
      inputOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
    } else {
      panelOpacity.value = withTiming(0, { duration: 150 });
      panelTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
      headerOpacity.value = withTiming(0, { duration: 100 });
      inputOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [visible]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslateY.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputOpacity.value,
  }));

  const handleSend = useCallback(() => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  }, [inputText, onSendMessage]);

  const handlePhotoPress = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["取消", "拍照", "从相册选择"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onUploadPhoto?.("camera");
          } else if (buttonIndex === 2) {
            onUploadPhoto?.("library");
          }
        }
      );
    } else {
      setShowPhotoOptions(true);
    }
  }, [onUploadPhoto]);

  const handleVoicePress = useCallback(() => {
    if (state === "listening") {
      onStopVoice?.();
    } else {
      onStartVoice?.();
    }
  }, [state, onStartVoice, onStopVoice]);

  const getStateIndicator = () => {
    switch (state) {
      case "listening":
        return (
          <View style={styles.stateIndicator}>
            <View style={[styles.stateDot, { backgroundColor: colors.neutral[500] }]} />
            <Text style={styles.stateText}>正在聆听...</Text>
          </View>
        );
      case "thinking":
        return (
          <View style={styles.stateIndicator}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={styles.stateText}>思考中...</Text>
          </View>
        );
      case "responding":
        return (
          <View style={styles.stateIndicator}>
            <View style={[styles.stateDot, { backgroundColor: colors.success }]} />
            <Text style={styles.stateText}>回复中...</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={styles.loadingText}>AI 正在思考...</Text>
        </View>
      );
    }

    if (message.progress?.isWaiting) {
      return <AnalysisProgress progress={message.progress} />;
    }

    if (message.outfitResult) {
      return (
        <View>
          <Text style={[styles.messageText, styles.assistantMessageText]}>{message.content}</Text>
          <OutfitCard result={message.outfitResult} />
        </View>
      );
    }

    return (
      <Text
        style={[
          styles.messageText,
          message.role === "user" ? styles.userMessageText : styles.assistantMessageText,
        ]}
      >
        {message.content}
      </Text>
    );
  };

  const renderActionUI = () => {
    if (!currentAction) {
      return null;
    }

    switch (currentAction.type) {
      case "show_preference_buttons":
        return (
          <PreferenceSelector action={currentAction} onSelect={onSelectPreference || (() => {})} />
        );

      case "request_photo_upload":
        return (
          <View style={styles.photoPrompt}>
            <Text style={styles.photoPromptText}>请上传一张照片</Text>
            <View style={styles.photoButtons}>
              <Pressable style={styles.photoButton} onPress={() => onUploadPhoto?.("camera")}>
                <LinearGradient
                  colors={[colors.secondary, colors.primary]}
                  style={styles.photoButtonGradient}
                >
                  <Ionicons name="camera" size={24} color={colors.textInverse} />
                  <Text style={styles.photoButtonText}>拍照</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={styles.photoButton} onPress={() => onUploadPhoto?.("library")}>
                <LinearGradient colors={[colors.neutral[500], "colors.textTertiary"]} style={styles.photoButtonGradient}>
                  <Ionicons name="images" size={24} color={colors.textInverse} />
                  <Text style={styles.photoButtonText}>相册</Text>
                </LinearGradient>
              </Pressable>
            </View>
            {currentAction.canSkip && (
              <Pressable style={styles.skipPhotoButton}>
                <Text style={styles.skipPhotoText}>暂时跳过</Text>
              </Pressable>
            )}
          </View>
        );

      case "generate_outfit":
        return (
          <View style={styles.generatePrompt}>
            <Text style={styles.generatePromptText}>
              我已经了解你的需求了，是否现在生成穿搭方案？
            </Text>
            <Pressable style={styles.generateButton} onPress={onGenerateOutfit}>
              <LinearGradient
                colors={[colors.primary, colors.primary]}
                style={styles.generateButtonGradient}
              >
                <Ionicons name="sparkles" size={18} color={colors.textInverse} />
                <Text style={styles.generateButtonText}>生成穿搭方案</Text>
              </LinearGradient>
            </Pressable>
          </View>
        );

      default:
        return null;
    }
  };

  const lastMessage = messages[messages.length - 1];
  const showActionUI =
    lastMessage?.role === "assistant" &&
    lastMessage.actionType &&
    !lastMessage.isLoading &&
    !lastMessage.outfitResult;

  return (
    <AnimatedView style={[styles.container, panelStyle]}>
      <LinearGradient colors={[colors.surface, colors.backgroundSecondary]} style={styles.gradient}>
        <AnimatedView style={[styles.header, headerStyle]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={DesignTokens.colors.neutral[600]} />
            </Pressable>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{title}</Text>
            {getStateIndicator()}
          </View>
          <View style={styles.headerRight} />
        </AnimatedView>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                style={styles.emptyIcon}
              >
                <Text style={styles.emptyIconText}>AI</Text>
              </LinearGradient>
              <Text style={styles.emptyTitle}>你好！我是 AI 造型师</Text>
              <Text style={styles.emptySubtitle}>我可以帮你分析身材、推荐穿搭、解答时尚问题</Text>
              <View style={styles.suggestions}>
                <Pressable
                  style={styles.suggestionChip}
                  onPress={() => onSendMessage("今天穿什么？")}
                >
                  <Text style={styles.suggestionText}>今天穿什么？</Text>
                </Pressable>
                <Pressable
                  style={styles.suggestionChip}
                  onPress={() => onSendMessage("帮我分析身材")}
                >
                  <Text style={styles.suggestionText}>帮我分析身材</Text>
                </Pressable>
                <Pressable
                  style={styles.suggestionChip}
                  onPress={() => onSendMessage("约会穿搭建议")}
                >
                  <Text style={styles.suggestionText}>约会穿搭建议</Text>
                </Pressable>
              </View>
            </View>
          )}

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageWrapper,
                message.role === "user"
                  ? styles.userMessageWrapper
                  : styles.assistantMessageWrapper,
              ]}
            >
              {message.role === "assistant" &&
                !message.isLoading &&
                !message.progress &&
                !message.outfitResult && (
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    style={styles.assistantAvatar}
                  >
                    <Text style={styles.assistantAvatarText}>AI</Text>
                  </LinearGradient>
                )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === "user" ? styles.userBubble : styles.assistantBubble,
                  (message.isLoading || message.progress || message.outfitResult) &&
                    styles.wideBubble,
                ]}
              >
                {renderMessageContent(message)}
              </View>
            </View>
          ))}

          {showActionUI && renderActionUI()}
        </ScrollView>

        <AnimatedView
          style={[styles.inputContainer, inputStyle, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.inputWrapper}>
            {onUploadPhoto && (
              <Pressable style={styles.attachButton} onPress={handlePhotoPress}>
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={DesignTokens.colors.neutral[500]}
                />
              </Pressable>
            )}

            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={placeholder}
              placeholderTextColor={DesignTokens.colors.neutral[400]}
              multiline
              maxLength={500}
              editable={state !== "thinking"}
            />

            {isVoiceAvailable && onStartVoice && (
              <Pressable
                style={[styles.voiceButton, state === "listening" && styles.voiceButtonActive]}
                onPress={handleVoicePress}
              >
                <Ionicons
                  name={state === "listening" ? "mic" : "mic-outline"}
                  size={22}
                  color={
                    state === "listening"
                      ? colors.primary
                      : DesignTokens.colors.neutral[500]
                  }
                />
              </Pressable>
            )}

            <Pressable
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || state === "thinking"}
            >
              <LinearGradient
                colors={
                  inputText.trim() && state !== "thinking"
                    ? [colors.primary, colors.primary]
                    : [DesignTokens.colors.neutral[300], DesignTokens.colors.neutral[400]]
                }
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={18} color={colors.textInverse} />
              </LinearGradient>
            </Pressable>
          </View>
        </AnimatedView>
      </LinearGradient>

      {showPhotoOptions && Platform.OS === "android" && (
        <View style={styles.photoOptionsOverlay}>
          <Pressable
            style={styles.photoOptionsBackdrop}
            onPress={() => setShowPhotoOptions(false)}
          />
          <View style={styles.photoOptionsSheet}>
            <Pressable
              style={styles.photoOptionItem}
              onPress={() => {
                setShowPhotoOptions(false);
                onUploadPhoto?.("camera");
              }}
            >
              <Ionicons name="camera" size={24} color={DesignTokens.colors.neutral[700]} />
              <Text style={styles.photoOptionText}>拍照</Text>
            </Pressable>
            <Pressable
              style={styles.photoOptionItem}
              onPress={() => {
                setShowPhotoOptions(false);
                onUploadPhoto?.("library");
              }}
            >
              <Ionicons name="images" size={24} color={DesignTokens.colors.neutral[700]} />
              <Text style={styles.photoOptionText}>从相册选择</Text>
            </Pressable>
            <Pressable
              style={[styles.photoOptionItem, styles.photoOptionCancel]}
              onPress={() => setShowPhotoOptions(false)}
            >
              <Text style={styles.photoOptionCancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      )}
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  headerLeft: {
    width: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[900],
  },
  headerRight: {
    width: 44,
  },
  stateIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  stateDot: {
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: 4,
    marginRight: DesignTokens.spacing['1.5'],
  },
  stateText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: Spacing['4xl'],
    height: Spacing['4xl'],
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[5],
  },
  emptyIconText: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "800",
    color: colors.textInverse,
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[900],
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  suggestionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[700],
    fontWeight: "500",
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    alignItems: "flex-end",
  },
  userMessageWrapper: {
    justifyContent: "flex-end",
  },
  assistantMessageWrapper: {
    justifyContent: "flex-start",
  },
  assistantAvatar: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  assistantAvatarText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "700",
    color: colors.textInverse,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 18,
  },
  wideBubble: {
    maxWidth: "90%",
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: DesignTokens.colors.neutral[100],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.textInverse,
  },
  assistantMessageText: {
    color: DesignTokens.colors.neutral[800],
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
  },
  photoPrompt: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 16,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  photoPromptText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  photoButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  photoButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  photoButtonGradient: {
    width: 100,
    height: Spacing['4xl'],
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textInverse,
    marginTop: DesignTokens.spacing['1.5'],
  },
  skipPhotoButton: {
    marginTop: DesignTokens.spacing[3],
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  skipPhotoText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
  },
  generatePrompt: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 16,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  generatePromptText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[600],
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  generateButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['3.5'],
    gap: Spacing.sm,
  },
  generateButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: DesignTokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
    backgroundColor: colors.surface,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 24,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  attachButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.neutral[900],
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  voiceButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButtonActive: {
    backgroundColor: colors.primary + "20",
  },
  sendButton: {
    marginLeft: Spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  photoOptionsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10001,
  },
  photoOptionsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  photoOptionsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  photoOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  photoOptionText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.neutral[700],
    fontWeight: "500",
  },
  photoOptionCancel: {
    borderBottomWidth: 0,
    marginTop: Spacing.sm,
    backgroundColor: DesignTokens.colors.neutral[100],
    marginHorizontal: Spacing.md,
    borderRadius: 12,
  },
  photoOptionCancelText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.neutral[500],
    fontWeight: "600",
  },
}))

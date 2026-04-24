/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { useTranslation } from "../../../i18n";
import { DesignTokens, Spacing, BorderRadius } from "../../../design-system/theme";
import {
  SpringConfigs,
  ListAnimations,
  Duration,
} from "../../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../../shared/hooks/useReducedMotion";
import { useAuthStore } from "../../auth/stores";
import { useAiStylistStore } from "../stores/aiStylistStore";
import { useAiStylistChatStore, type ChatMessage } from "../stores/aiStylistChatStore";
import { TypewriterMessage } from "../components/TypewriterMessage";
import {
  ItemReplacementModal,
  FeedbackModal,
  PresetQuestionsModal,
  TryOnBottomSheet,
  StudioRecommendCard,
  QuickReplyBar,
} from "../components";
import type { OutfitData, StudioData } from "../components";
import type { OutfitPlanDetail } from "../stores/aiStylistStore";
import type { AiStylistOutfitItem } from "../../../services/api/ai-stylist.api";
import type { RootStackParamList } from "../../../types/navigation";
import { withErrorBoundary } from "../../../shared/components/ErrorBoundary";

// ============ Scene Chips Config ============

interface SceneChipData {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  priority: number;
  conditional?: "friday_afternoon" | "weekday_morning" | "rainy";
}

const BASE_SCENES: SceneChipData[] = [
  {
    key: "date",
    label: "约会之夜",
    icon: "heart-outline",
    message: "我需要一套约会穿搭",
    priority: 0,
  },
  {
    key: "work",
    label: "职场通勤",
    icon: "briefcase-outline",
    message: "我需要一套职场穿搭",
    priority: 0,
    conditional: "weekday_morning",
  },
  {
    key: "casual",
    label: "休闲周末",
    icon: "sunny-outline",
    message: "我需要一套休闲周末穿搭",
    priority: 0,
  },
  {
    key: "sport",
    label: "运动健身",
    icon: "fitness-outline",
    message: "我需要一套运动穿搭",
    priority: 0,
  },
  {
    key: "formal",
    label: "正式场合",
    icon: "ribbon-outline",
    message: "我需要一套正式场合穿搭",
    priority: 0,
  },
  {
    key: "travel",
    label: "旅行出行",
    icon: "airplane-outline",
    message: "我需要旅行穿搭建议",
    priority: 0,
  },
  {
    key: "weekend",
    label: "周末出行",
    icon: "wine-outline",
    message: "周末出行穿什么好",
    priority: 0,
    conditional: "friday_afternoon",
  },
  {
    key: "rainy",
    label: "雨天穿搭",
    icon: "rainy-outline",
    message: "下雨天怎么穿既好看又实用",
    priority: 0,
    conditional: "rainy",
  },
];

function getScenePriority(conditional: string): number {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  switch (conditional) {
    case "friday_afternoon":
      return day === 5 && hour >= 14 ? 10 : -1;
    case "weekday_morning":
      return day >= 1 && day <= 5 && hour >= 6 && hour <= 10 ? 10 : -1;
    case "rainy":
      return -1;
    default:
      return 0;
  }
}

function getOrderedScenes(): SceneChipData[] {
  const scenes = BASE_SCENES.map((scene) => {
    if (scene.conditional) {
      const priority = getScenePriority(scene.conditional);
      return { ...scene, priority };
    }
    return scene;
  });

  return scenes.filter((s) => s.priority >= 0).sort((a, b) => b.priority - a.priority);
}

// ============ Typing Dots ============

const CoralTypingDots: React.FC = () => {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const dot1Scale = useSharedValue(0.5);
  const dot2Scale = useSharedValue(0.5);
  const dot3Scale = useSharedValue(0.5);

  useEffect(() => {
    if (reducedMotion) {
      dot1Scale.value = 1;
      dot2Scale.value = 1;
      dot3Scale.value = 1;
      return;
    }

    const anim = (sv: Animated.SharedValue<number>, delayMs: number) =>
      withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.6, { duration: 400, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );

    dot1Scale.value = anim(dot1Scale, 0);
    dot2Scale.value = anim(dot2Scale, 150);
    dot3Scale.value = anim(dot3Scale, 300);

    return () => {
      cancelAnimation(dot1Scale);
      cancelAnimation(dot2Scale);
      cancelAnimation(dot3Scale);
    };
  }, [reducedMotion]);

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ scale: dot1Scale.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ scale: dot2Scale.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ scale: dot3Scale.value }] }));

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing["1.5"] }}>
      <Animated.View
        style={[
          {
            width: Spacing.sm,
            height: Spacing.sm,
            borderRadius: BorderRadius.xs,
            backgroundColor: colors.primary,
          },
          dot1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            width: Spacing.sm,
            height: Spacing.sm,
            borderRadius: BorderRadius.xs,
            backgroundColor: colors.primaryLight,
          },
          dot2Style,
        ]}
      />
      <Animated.View
        style={[
          {
            width: Spacing.sm,
            height: Spacing.sm,
            borderRadius: BorderRadius.xs,
            backgroundColor: colors.primary,
          },
          dot3Style,
        ]}
      />
    </View>
  );
};

// ============ Send Button ============

interface SendButtonProps {
  onPress: () => void;
  disabled: boolean;
  isGenerating: boolean;
  hasText: boolean;
}

const SendButton: React.FC<SendButtonProps> = ({ onPress, disabled, isGenerating, hasText }) => {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion && hasText && !disabled) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      return () => cancelAnimation(glowOpacity);
    }
    glowOpacity.value = 0;
    return () => cancelAnimation(glowOpacity);
  }, [hasText, disabled, reducedMotion]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    }
  }, [reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  }, [reducedMotion]);

  const animatedScale = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isActive = hasText && !disabled;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel="发送消息"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={{ marginLeft: DesignTokens.spacing["2.5"] }}
    >
      <Animated.View style={animatedScale}>
        {isActive && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: BorderRadius["2xl"],
                backgroundColor: colors.primary,
              },
              glowStyle,
            ]}
          />
        )}
        <View
          style={{
            width: DesignTokens.spacing[11],
            height: DesignTokens.spacing[11],
            borderRadius: BorderRadius.xl,
            backgroundColor: isActive ? colors.primary : colors.borderLight,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: isActive ? colors.primary : "transparent",
            shadowOffset: { width: 0, height: Spacing.sm },
            shadowOpacity: isActive ? 0.35 : 0,
            shadowRadius: Spacing.sm,
            elevation: isActive ? 6 : 0,
          }}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Ionicons
              name="send"
              size={DesignTokens.typography.sizes.lg}
              color={isActive ? colors.surface : colors.textTertiary}
            />
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============ Animated Scene Chip ============

interface AnimatedSceneChipProps {
  scene: SceneChipData;
  accentColor: string;
  onPress: () => void;
  disabled: boolean;
}

const AnimatedSceneChip: React.FC<AnimatedSceneChipProps> = ({
  scene,
  accentColor,
  onPress,
  disabled,
}) => {
  const { reducedMotion } = useReducedMotion();
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) {
      scale.value = withSpring(0.94, { damping: 15, stiffness: 400 });
      setPressed(true);
    }
  }, [reducedMotion]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      setPressed(false);
    }
  }, [reducedMotion]);

  const isPressed = pressed;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: DesignTokens.spacing["1.5"],
          paddingHorizontal: Spacing.md,
          paddingVertical: DesignTokens.spacing["2.5"],
          borderRadius: BorderRadius["2xl"],
          backgroundColor: isPressed ? accentColor : colors.surface,
          borderWidth: 1.5,
          borderColor: accentColor,
          marginRight: Spacing.sm,
          shadowColor: DesignTokens.colors.neutral.black,
          shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
          shadowOpacity: 0.06,
          shadowRadius: Spacing.sm,
          elevation: 2,
        }}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityLabel={scene.label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Ionicons
          name={scene.icon}
          size={DesignTokens.typography.sizes.base}
          color={isPressed ? colors.surface : accentColor}
        />
        <Text
          style={{
            fontSize: DesignTokens.typography.sizes.sm,
            fontWeight: "600",
            color: isPressed ? colors.surface : accentColor,
          }}
        >
          {scene.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============ Inline Outfit Card ============

interface InlineOutfitCardProps {
  plan: OutfitPlanDetail;
  onItemPress?: (item: AiStylistOutfitItem) => void;
  onTryOn?: (plan: OutfitPlanDetail) => void;
  onLike?: (plan: OutfitPlanDetail) => void;
}

const InlineOutfitCard: React.FC<InlineOutfitCardProps> = ({
  plan,
  onItemPress,
  onTryOn,
  onLike,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.95);

  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 400 });
    containerScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const activeOutfit = plan.outfits[activeOutfitIndex];

  return (
    <Animated.View style={[styles.outfitCard, containerStyle]}>
      <View style={styles.outfitSummary}>
        <View style={styles.outfitBadge}>
          <Ionicons name="sparkles" size={14} color={colors.surface} />
          <Text style={styles.outfitBadgeText}>穿搭方案</Text>
        </View>
        <Text style={styles.outfitSummaryText} numberOfLines={3}>
          {plan.lookSummary}
        </Text>
      </View>

      {plan.outfits.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.outfitTabs}
        >
          {plan.outfits.map((outfit, index) => (
            <Pressable
              key={index}
              style={[styles.outfitTab, index === activeOutfitIndex && styles.outfitTabActive]}
              onPress={() => setActiveOutfitIndex(index)}
            >
              <Text
                style={[
                  styles.outfitTabText,
                  index === activeOutfitIndex && styles.outfitTabTextActive,
                ]}
              >
                方案 {index + 1}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {activeOutfit && (
        <View style={styles.outfitItemsSection}>
          <View style={styles.outfitHeader}>
            <Text style={styles.outfitTitle}>{activeOutfit.title}</Text>
            {activeOutfit.estimatedTotalPrice != null && (
              <Text style={styles.outfitTotalPrice}>
                ¥{activeOutfit.estimatedTotalPrice.toFixed(0)}
              </Text>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.itemsScrollContent}
          >
            {activeOutfit.items.map((item, index) => (
              <Pressable
                key={`${item.itemId ?? index}-${index}`}
                style={styles.inlineItemCard}
                onPress={() => onItemPress?.(item)}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.inlineItemImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.inlineItemPlaceholder}>
                    <Ionicons name="shirt-outline" size={20} color={colors.textTertiary} />
                  </View>
                )}
                <Text style={styles.inlineItemName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.price != null && (
                  <Text style={styles.inlineItemPrice}>¥{item.price.toFixed(0)}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.outfitActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onTryOn?.(plan)}
          activeOpacity={0.7}
        >
          <Ionicons name="shirt-outline" size={16} color={colors.primary} />
          <Text style={styles.actionButtonText}>虚拟试穿</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => onLike?.(plan)}
          activeOpacity={0.7}
        >
          <Ionicons name="heart-outline" size={16} color={colors.warmAccent} />
          <Text style={[styles.actionButtonText, styles.likeButtonText]}>喜欢</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ============ Animated Message Bubble ============

const AnimatedMessageBubble: React.FC<{
  msg: ChatMessage;
  index: number;
  outfitPlan: OutfitPlanDetail | null;
  onItemPress?: (item: AiStylistOutfitItem) => void;
  onTryOn?: (plan: OutfitPlanDetail) => void;
  onLike?: (plan: OutfitPlanDetail) => void;
  onStudioPress?: (studio: ChatMessage["studio"]) => void;
}> = ({ msg, index, outfitPlan, onItemPress, onTryOn, onLike, onStudioPress }) => {
  const { reducedMotion } = useReducedMotion();
  const { colors, seasonAccent } = useTheme();
  const s = useStyles(colors);
  const accentColor = seasonAccent?.accent ?? colors.primary;
  const translateY = useSharedValue(reducedMotion ? 0 : Spacing.md);
  const opacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const staggerDelay = index * ListAnimations.stagger.delay;
    translateY.value = withDelay(staggerDelay, withSpring(0, SpringConfigs.gentle));
    opacity.value = withDelay(staggerDelay, withTiming(1, { duration: Duration.normal }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const isUser = msg.role === "user";

  return (
    <Animated.View style={animatedStyle}>
      {isUser ? (
        <View style={s.userBubbleRow}>
          <View style={s.userBubbleContent}>
            <Text style={s.userBubbleText}>{msg.content}</Text>
          </View>
        </View>
      ) : (
        <View style={s.assistantBubbleRow}>
          <View style={[s.aiAvatar, { backgroundColor: accentColor }]}>
            <Ionicons name="sparkles" size={12} color={colors.surface} />
          </View>
          <View style={s.assistantBubbleContent}>
            <TypewriterMessage text={msg.content} speed={40} textStyle={[s.assistantText] as any} />
            {outfitPlan && (
              <InlineOutfitCard
                plan={outfitPlan}
                onItemPress={onItemPress}
                onTryOn={onTryOn}
                onLike={onLike}
              />
            )}
            {msg.studioSignal && msg.studio && (
              <StudioRecommendCard
                studio={msg.studio}
                onPress={() => onStudioPress?.(msg.studio)}
              />
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// ============ Main Unified Screen ============

export const AiStylistUnifiedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors, seasonAccent } = useTheme();
  const styles = useStyles(colors);
  const t = useTranslation();
  const accentColor = seasonAccent?.accent ?? colors.primary;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);

  const currentSessionId = useAiStylistStore((state) => state.currentSessionId);
  const currentOutfitPlan = useAiStylistStore((state) => state.currentOutfitPlan);
  const isGenerating = useAiStylistStore((state) => state.isGenerating);
  const error = useAiStylistStore((state) => state.error);
  const presetQuestions = useAiStylistStore((state) => state.presetQuestions);
  const isNewUser = useAiStylistStore((state) => state.isNewUser);
  const alternatives = useAiStylistStore((state) => state.alternatives);
  const isAlternativesLoading = useAiStylistStore((state) => state.isAlternativesLoading);
  const createSession = useAiStylistStore((state) => state.createSession);
  const sendMessage = useAiStylistStore((state) => state.sendMessage);
  const fetchOutfitPlan = useAiStylistStore((state) => state.fetchOutfitPlan);
  const fetchAlternatives = useAiStylistStore((state) => state.fetchAlternatives);
  const replaceItem = useAiStylistStore((state) => state.replaceItem);
  const submitFeedback = useAiStylistStore((state) => state.submitFeedback);
  const fetchPresetQuestions = useAiStylistStore((state) => state.fetchPresetQuestions);
  const clearError = useAiStylistStore((state) => state.clearError);

  const messages = useAiStylistChatStore((state) => state.messages);
  const addMessage = useAiStylistChatStore((state) => state.addMessage);

  const [inputText, setInputText] = useState("");
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [replacementTarget, setReplacementTarget] = useState<{
    outfitIndex: number;
    itemIndex: number;
    itemName: string;
  } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Try-on + Studio + Quick Reply state
  const tryOnRef = useRef<BottomSheetModal>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitData | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [studioData, setStudioData] = useState<StudioData | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Studio lookup from local directory for sprint (production would query backend)
  const getStudioForSignal = useCallback((signal: string): StudioData | null => {
    // Sprint: static studio data. In production, backend provides this.
    const studios: StudioData[] = [
      {
        id: "studio_001",
        name: "织造社",
        city: "上海",
        specialty: "职场穿搭定制",
        price_range: { min: 2000, max: 8000 },
        contact: "微信: zhizaoshe_studio",
        description: "专注职场女性形象定制，擅长用高品质面料打造专业又不失个性的穿搭",
      },
      {
        id: "studio_002",
        name: "锦时造型",
        city: "北京",
        specialty: "婚礼造型",
        price_range: { min: 5000, max: 20000 },
        contact: "微信: jinshi_styling",
        description: "北京资深婚礼造型工作室，提供从婚纱挑选到整体造型的一站式服务",
      },
      {
        id: "studio_003",
        name: "素白日常",
        city: "杭州",
        specialty: "日常穿搭定制",
        price_range: { min: 800, max: 3000 },
        contact: "微信: subai_daily",
        description: "主打日常穿搭定制，擅长把基础款穿出个人风格，性价比极高",
      },
    ];
    // Match by signal type -- premium/luxury -> higher-end studios
    if (signal.includes("luxury") || signal.includes("premium")) {
      return studios[1] ?? null; // 锦时造型 for high-end
    }
    if (signal.includes("wedding") || signal.includes("special_event")) {
      return studios[1] ?? null;
    }
    return studios[0] ?? null; // Default: 织造社
  }, []);

  const orderedScenes = useMemo(() => getOrderedScenes(), []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || hasInitialized) {
      return;
    }
    setHasInitialized(true);
    void fetchPresetQuestions().then(() => {
      if (isNewUser) {
        setShowPresetModal(true);
      }
    });
  }, [authLoading, isAuthenticated, hasInitialized, isNewUser, fetchPresetQuestions]);

  /** Process dialog response: handle quickReplies, try-on action, studio signal */
  const processDialogResponse = useCallback(
    (result: any) => {
      // Handle quick replies from backend
      if (result.quickReplies && Array.isArray(result.quickReplies)) {
        setQuickReplies(result.quickReplies as string[]);
      }

      // Handle studio signal
      const studioSignal = result.studioSignal as string | undefined;
      let matchedStudio: StudioData | null = null;
      if (studioSignal) {
        matchedStudio = getStudioForSignal(studioSignal);
        setStudioData(matchedStudio);
      }

      // Build and add assistant message with studio data
      if (result.assistantMessage) {
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: result.assistantMessage,
          timestamp: new Date().toISOString(),
          studioSignal,
          studio: matchedStudio ?? undefined,
        };
        addMessage(assistantMsg);
      }

      // Handle try-on action from dialog response
      if (result.action === "try_on") {
        const outfits = result.outfits as unknown[] | undefined;
        if (outfits && outfits.length > 0) {
          setSelectedOutfit(outfits[0] as OutfitData);
        }
        tryOnRef.current?.present();
      }
    },
    [addMessage, getStudioForSignal]
  );

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

    let sid = currentSessionId;
    if (!sid) {
      sid = await createSession(text);
    }

    if (sid) {
      const result = await sendMessage(text);
      if (result) {
        processDialogResponse(result);
      }
      if (result?.result) {
        await fetchOutfitPlan(sid);
      }
    }
  }, [
    inputText,
    isGenerating,
    currentSessionId,
    createSession,
    sendMessage,
    fetchOutfitPlan,
    addMessage,
    processDialogResponse,
  ]);

  const handleScenePress = useCallback(
    async (scene: SceneChipData) => {
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

      let sid = currentSessionId;
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
        if (result?.result) {
          await fetchOutfitPlan(sid);
        }
      }
    },
    [isGenerating, currentSessionId, createSession, sendMessage, fetchOutfitPlan, addMessage]
  );

  /** Handle quick reply selection -- sends text through same pipeline */
  const handleQuickReplySelect = useCallback(
    (option: string) => {
      if (isGenerating) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: option,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);

      void (async () => {
        let sid = currentSessionId;
        if (!sid) {
          sid = await createSession(option);
        }
        if (sid) {
          const result = await sendMessage(option);
          if (result) {
            processDialogResponse(result);
          }
          if (result?.result) {
            await fetchOutfitPlan(sid);
          }
        }
      })();
    },
    [
      isGenerating,
      currentSessionId,
      createSession,
      sendMessage,
      fetchOutfitPlan,
      addMessage,
      processDialogResponse,
    ]
  );

  const handlePresetSelect = useCallback(
    async (question: { text: string }) => {
      setShowPresetModal(false);
      if (!currentSessionId) {
        const newId = await createSession(question.text);
        if (newId) {
          const result = await sendMessage(question.text);
          if (result?.assistantMessage) {
            addMessage({
              id: `assistant_${Date.now()}`,
              role: "assistant",
              content: result.assistantMessage,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } else {
        addMessage({
          id: `user_${Date.now()}`,
          role: "user",
          content: question.text,
          timestamp: new Date().toISOString(),
        });
        const result = await sendMessage(question.text);
        if (result?.assistantMessage) {
          addMessage({
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: result.assistantMessage,
            timestamp: new Date().toISOString(),
          });
        }
      }
    },
    [currentSessionId, createSession, sendMessage, addMessage]
  );

  const handleItemReplace = useCallback(
    (outfitIndex: number, itemIndex: number) => {
      const item = currentOutfitPlan?.outfits[outfitIndex]?.items[itemIndex];
      setReplacementTarget({
        outfitIndex,
        itemIndex,
        itemName: item?.name ?? "单品",
      });
      if (currentSessionId) {
        void fetchAlternatives(currentSessionId, outfitIndex, itemIndex);
      }
    },
    [currentSessionId, currentOutfitPlan, fetchAlternatives]
  );

  const handleReplacementSelect = useCallback(
    async (itemId: string) => {
      if (!currentSessionId || !replacementTarget) {
        return;
      }
      const success = await replaceItem(
        currentSessionId,
        replacementTarget.outfitIndex,
        replacementTarget.itemIndex,
        itemId
      );
      if (success) {
        setReplacementTarget(null);
      }
    },
    [currentSessionId, replacementTarget, replaceItem]
  );

  const handleFeedback = useCallback(
    async (data: { action: "like" | "dislike"; rating?: number; dislikeReason?: string }) => {
      if (!currentSessionId || !currentOutfitPlan) {
        return;
      }
      await submitFeedback(
        currentSessionId,
        0,
        data.action,
        undefined,
        data.rating,
        data.dislikeReason
      );
      setShowFeedbackModal(false);
    },
    [currentSessionId, currentOutfitPlan, submitFeedback]
  );

  const handleItemPress = useCallback(
    (item: AiStylistOutfitItem) => {
      navigation.navigate("MainTabs", {
        screen: "Home",
        params: { screen: "Product", params: { clothingId: item.itemId ?? "" } },
      } as never);
    },
    [navigation]
  );

  const handleTryOn = useCallback(
    (_plan: OutfitPlanDetail) => {
      navigation.navigate("MainTabs", { screen: "TryOn" } as never);
    },
    [navigation]
  );

  const handleLike = useCallback((_plan: OutfitPlanDetail) => {
    setShowFeedbackModal(true);
  }, []);

  const handleStudioPress = useCallback((studio: ChatMessage["studio"]) => {
    if (!studio) return;
    // Sprint: show alert with studio contact info
    Alert.alert(studio.name, `${studio.specialty}\n${studio.city}\n${studio.contact}`);
  }, []);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={14} color={colors.surface} />
          </View>
          <Text style={styles.headerTitle}>{t.navigation.stylist}</Text>
          <View style={styles.onlineIndicator} />
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            navigation.navigate("MainTabs", {
              screen: "Stylist",
              params: { screen: "SessionCalendar" },
            });
          }}
          accessibilityLabel="历史记录"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={clearError}
                accessibilityLabel="关闭错误提示"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Text style={styles.errorDismiss}>关闭</Text>
              </TouchableOpacity>
            </View>
          )}

          {messages.length === 0 && (
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeDecorativeRing}>
                <View style={styles.welcomeIconCircle}>
                  <Ionicons name="sparkles" size={36} color={colors.primary} />
                </View>
                <View style={styles.welcomeDotTopLeft} />
                <View style={styles.welcomeDotBottomRight} />
              </View>
              <Text style={styles.welcomeTitle}>{t.stylist.greeting}</Text>
              <Text style={styles.welcomeSubtitle}>{t.stylist.askOccasion}</Text>
              <View style={styles.welcomeDivider}>
                <View style={styles.welcomeDividerLine} />
                <View style={styles.welcomeDividerDot} />
                <View style={styles.welcomeDividerLine} />
              </View>
              <Text style={styles.welcomeHint}>选择下方场景快速开始</Text>
            </View>
          )}

          {messages.map((msg, idx) => (
            <AnimatedMessageBubble
              key={msg.id}
              msg={msg}
              index={idx}
              outfitPlan={
                msg.role === "assistant" && idx === messages.length - 1 ? currentOutfitPlan : null
              }
              onItemPress={handleItemPress}
              onTryOn={handleTryOn}
              onLike={handleLike}
              onStudioPress={handleStudioPress}
            />
          ))}

          {isGenerating && (
            <View style={styles.assistantRow}>
              <View style={[styles.aiAvatar, { backgroundColor: accentColor }]}>
                <Ionicons name="sparkles" size={12} color={colors.surface} />
              </View>
              <View style={styles.typingBubble}>
                <CoralTypingDots />
                <Text style={styles.typingLabel}>正在为你搭配...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.sceneRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sceneScrollContent}
          >
            {orderedScenes.map((scene) => (
              <AnimatedSceneChip
                key={scene.key}
                scene={scene}
                accentColor={accentColor}
                onPress={() => handleScenePress(scene)}
                disabled={isGenerating}
              />
            ))}
          </ScrollView>
        </View>

        {/* Quick Reply bar -- shows when backend provides options */}
        {quickReplies.length > 0 && (
          <QuickReplyBar options={quickReplies} onSelect={handleQuickReplySelect} />
        )}

        <View style={styles.inputBar}>
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
          <SendButton
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
            isGenerating={isGenerating}
            hasText={!!inputText.trim()}
          />
        </View>
      </KeyboardAvoidingView>

      <PresetQuestionsModal
        visible={showPresetModal}
        questions={presetQuestions}
        onSelect={handlePresetSelect}
        onClose={() => setShowPresetModal(false)}
      />

      <FeedbackModal
        visible={showFeedbackModal}
        onSubmit={handleFeedback}
        onClose={() => setShowFeedbackModal(false)}
      />

      <ItemReplacementModal
        visible={!!replacementTarget}
        originalItemName={replacementTarget?.itemName ?? ""}
        alternatives={alternatives}
        isLoading={isAlternativesLoading}
        onSelect={handleReplacementSelect}
        onClose={() => setReplacementTarget(null)}
      />

      {/* Try-on BottomSheet -- presents within chat screen (no page navigation) */}
      <TryOnBottomSheet
        ref={tryOnRef}
        outfit={selectedOutfit}
        onSave={() => {
          // Sprint: save outfit to wardrobe (would call API in production)
          tryOnRef.current?.dismiss();
        }}
        onTryAnother={() => {
          tryOnRef.current?.dismiss();
          setInputText("再来一套");
        }}
      />
    </SafeAreaView>
  );
};

// ============ Styles ============

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.04,
    shadowRadius: Spacing.sm,
    elevation: 2,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.3,
    shadowRadius: DesignTokens.spacing["1.5"],
    elevation: 3,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: c.textPrimary,
    letterSpacing: 0.2,
  },
  onlineIndicator: {
    width: 7,
    height: 7,
    borderRadius: BorderRadius.xs,
    backgroundColor: c.success,
    shadowColor: c.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: Spacing.xs,
    elevation: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.xl,
  },

  chatScroll: { flex: 1, backgroundColor: c.background },
  messagesContainer: { padding: Spacing.md, paddingBottom: Spacing.sm },

  welcomeSection: { alignItems: "center", paddingVertical: Spacing["5xl"] },
  welcomeDecorativeRing: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[5],
    position: "relative",
  },
  welcomeIconCircle: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius["3xl"],
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: Spacing.sm },
    shadowOpacity: 0.15,
    shadowRadius: DesignTokens.spacing[3],
    elevation: 4,
  },
  welcomeDotTopLeft: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.sm,
    width: 10,
    height: 10,
    borderRadius: BorderRadius.xs,
    backgroundColor: c.warmSecondary,
  },
  welcomeDotBottomRight: {
    position: "absolute",
    bottom: Spacing.xs,
    right: Spacing.sm,
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: BorderRadius.xs,
    backgroundColor: c.warmAccent,
  },
  welcomeTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: c.textPrimary,
    letterSpacing: 0.3,
  },
  welcomeSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: c.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
    lineHeight: DesignTokens.typography.sizes.xl,
    paddingHorizontal: Spacing.xl,
  },
  welcomeDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: DesignTokens.spacing[3],
  },
  welcomeDividerLine: { width: Spacing.lg, height: 1, backgroundColor: c.warmAccent },
  welcomeDividerDot: {
    width: Spacing.xs,
    height: Spacing.xs,
    borderRadius: BorderRadius.xs,
    backgroundColor: c.primary,
  },
  welcomeHint: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: c.textTertiary,
    fontWeight: "500",
  },

  userBubbleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: DesignTokens.spacing[3],
    alignItems: "flex-end",
  },
  userBubbleContent: {
    maxWidth: "78%",
    backgroundColor: c.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.2,
    shadowRadius: Spacing.sm,
    elevation: 3,
  },
  userBubbleText: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: DesignTokens.typography.sizes.xl,
    color: c.surface,
    fontWeight: "500",
  },

  assistantBubbleRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: DesignTokens.spacing[3],
    alignItems: "flex-end",
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.lg,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.2,
    shadowRadius: Spacing.xs,
    elevation: 2,
  },
  assistantBubbleContent: {
    maxWidth: "85%",
    backgroundColor: c.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xs,
    borderBottomRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    borderWidth: 1,
    borderColor: c.borderLight,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.06,
    shadowRadius: Spacing.sm,
    elevation: 2,
  },
  assistantText: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: DesignTokens.typography.sizes.xl,
    color: c.textPrimary,
  },

  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: DesignTokens.spacing[3],
  },
  typingBubble: {
    backgroundColor: c.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xs,
    borderBottomRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing["3.5"],
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: c.borderLight,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.06,
    shadowRadius: Spacing.sm,
    elevation: 2,
  },
  typingLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: c.textTertiary,
    fontWeight: "500",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
    padding: DesignTokens.spacing[3],
    borderRadius: BorderRadius.lg,
    backgroundColor: c.errorLight,
    borderWidth: 1,
    borderColor: c.errorLight,
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: c.error,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  errorDismiss: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: c.error,
    fontWeight: "600",
    marginLeft: DesignTokens.spacing[3],
  },

  sceneRowContainer: {
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: -DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.03,
    shadowRadius: Spacing.sm,
    elevation: 2,
  },
  sceneScrollContent: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing["2.5"],
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing["2.5"],
    paddingBottom: DesignTokens.spacing[3],
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: -DesignTokens.spacing["0.5"] },
    shadowOpacity: 0.04,
    shadowRadius: Spacing.sm,
    elevation: 3,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: c.background,
    borderRadius: BorderRadius["2xl"],
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  input: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: c.textPrimary,
    maxHeight: Spacing["4xl"],
    paddingVertical: DesignTokens.spacing["2.5"],
    lineHeight: DesignTokens.typography.sizes.md,
  },

  outfitCard: {
    backgroundColor: c.backgroundSecondary,
    borderRadius: DesignTokens.borderRadius["2xl"],
    overflow: "hidden",
    marginTop: DesignTokens.spacing[3],
    borderWidth: 1,
    borderColor: c.borderLight,
    ...DesignTokens.shadows.sm,
  },
  outfitSummary: { padding: Spacing.md },
  outfitBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing["1.5"],
    borderRadius: DesignTokens.borderRadius.lg,
    marginBottom: DesignTokens.spacing[3],
    backgroundColor: c.primary,
  },
  outfitBadgeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: c.textInverse,
    marginLeft: DesignTokens.spacing["1.5"],
  },
  outfitSummaryText: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    color: c.textPrimary,
  },
  outfitTabs: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    gap: Spacing.sm,
  },
  outfitTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: c.backgroundSecondary,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  outfitTabActive: { backgroundColor: c.secondary + "20", borderColor: c.secondary },
  outfitTabText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: c.textTertiary,
  },
  outfitTabTextActive: { color: c.secondary, fontWeight: "600" },
  outfitItemsSection: { padding: Spacing.md, paddingTop: 0 },
  outfitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  outfitTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: c.textPrimary,
  },
  outfitTotalPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: c.primary,
  },
  itemsScrollContent: { gap: Spacing.sm },
  inlineItemCard: {
    width: 100,
    backgroundColor: c.surface,
    borderRadius: DesignTokens.borderRadius.lg,
    padding: DesignTokens.spacing[2],
    borderWidth: 1,
    borderColor: c.borderLight,
    alignItems: "center",
  },
  inlineItemImage: {
    width: 80,
    height: 80,
    borderRadius: DesignTokens.borderRadius.md,
    marginBottom: Spacing.xs,
  },
  inlineItemPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: DesignTokens.borderRadius.md,
    backgroundColor: c.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  inlineItemName: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "500",
    color: c.textPrimary,
    textAlign: "center",
  },
  inlineItemPrice: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: c.primary,
    marginTop: 2,
  },
  outfitActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: DesignTokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing["1.5"],
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[2],
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: c.primary + "10",
  },
  actionButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: c.primary,
  },
  likeButton: { backgroundColor: c.warmAccent + "10" },
  likeButtonText: { color: c.warmAccent },
}));

export default withErrorBoundary(AiStylistUnifiedScreen);

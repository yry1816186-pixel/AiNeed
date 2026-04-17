import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { useTranslation } from '../../../i18n';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useAuthStore } from '../../auth/stores';
import { useAiStylistStore } from '../stores/aiStylistStore';
import type { PresetQuestion } from '../stores/aiStylistStore';
import type { RootStackParamList } from '../../../types/navigation';

import {
  OutfitPlanView,
  ItemReplacementModal,
  FeedbackModal,
  SceneQuickButtons,
  PresetQuestionsModal,
} from '../components';

// ============ AI Loading State Component ============

const LOADING_STEPS = [
  "分析穿搭偏好...",
  "匹配风格方案...",
  "生成推荐结果...",
] as const;

const STEP_INTERVAL = 2000; // 2 seconds per step
const PULSE_DURATION = 1000; // 1s per half-cycle (2s full cycle)
const DOT_ANIM_DURATION = 400;

function AILoadingState() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  // Pulsing icon animation
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      false
    );
    return () => cancelAnimation(scale);
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Step text cycling
  const [stepIndex, setStepIndex] = useState(0);
  const stepFade = useSharedValue(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // Fade out, switch text, fade in
      stepFade.value = withTiming(0, { duration: 200, easing: Easing.ease }, (finished) => {
        if (finished) {
          setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
          stepFade.value = withTiming(1, { duration: 200, easing: Easing.ease });
        }
      });
    }, STEP_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stepTextStyle = useAnimatedStyle(() => ({
    opacity: stepFade.value,
  }));

  // Progress dots animation
  const dot1Scale = useSharedValue(0.5);
  const dot2Scale = useSharedValue(0.5);
  const dot3Scale = useSharedValue(0.5);

  useEffect(() => {
    const dotAnim = (sv: Animated.SharedValue<number>, delayMs: number) =>
      withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(1.0, { duration: DOT_ANIM_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.5, { duration: DOT_ANIM_DURATION, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );

    dot1Scale.value = dotAnim(dot1Scale, 0);
    dot2Scale.value = dotAnim(dot2Scale, 200);
    dot3Scale.value = dotAnim(dot3Scale, 400);

    return () => {
      cancelAnimation(dot1Scale);
      cancelAnimation(dot2Scale);
      cancelAnimation(dot3Scale);
    };
  }, []);

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ scale: dot1Scale.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ scale: dot2Scale.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ scale: dot3Scale.value }] }));

  // Shimmer bar animation
  const shimmerTranslate = useSharedValue(-100);
  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(100, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
    return () => cancelAnimation(shimmerTranslate);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  return (
    <View style={styles.generatingContainer}>
      {/* Pulsing AI icon */}
      <Animated.View style={iconAnimatedStyle}>
        <View style={styles.aiIconCircle}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>
      </Animated.View>

      {/* Step text with fade transition */}
      <Animated.View style={[styles.stepTextContainer, stepTextStyle]}>
        <Text style={styles.generatingText}>{LOADING_STEPS[stepIndex]}</Text>
      </Animated.View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, dot1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, dot2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, dot3Style]} />
      </View>

      {/* Shimmer progress bar */}
      <View style={styles.shimmerTrack}>
        <Animated.View style={[styles.shimmerFill, shimmerStyle]} />
      </View>
    </View>
  );
}

// ============ Empty State with Floating Icon ============

function FloatingEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(floatY);
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={styles.emptyState}>
      <Animated.View style={floatStyle}>
        <Ionicons name="shirt-outline" size={48} color={colors.textTertiary} />
      </Animated.View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

// ============ Main Screen ============

export const AiStylistScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const t = useTranslation();

  const {
    currentSessionId,
    currentOutfitPlan,
    isLoading,
    isGenerating,
    error,
    presetQuestions,
    isNewUser,
    alternatives,
    isAlternativesLoading,
    createSession,
    sendMessage,
    fetchOutfitPlan,
    fetchAlternatives,
    replaceItem,
    submitFeedback,
    fetchPresetQuestions,
    setCurrentSessionId,
    clearError,
    reset,
  } = useAiStylistStore();

  const [inputText, setInputText] = useState("");
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [replacementTarget, setReplacementTarget] = useState<{
    outfitIndex: number;
    itemIndex: number;
    itemName: string;
  } | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize: fetch preset questions on mount
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

  const handleSceneSelect = useCallback(
    async (_scene: string, message: string) => {
      if (!currentSessionId) {
        const newId = await createSession();
        if (newId) {
          await sendMessage(message);
        }
      } else {
        await sendMessage(message);
      }
    },
    [currentSessionId, createSession, sendMessage]
  );

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isGenerating) {
      return;
    }

    setInputText("");

    if (!currentSessionId) {
      const newId = await createSession();
      if (newId) {
        const result = await sendMessage(text);
        if (result?.result) {
          await fetchOutfitPlan(newId);
        }
      }
    } else {
      const result = await sendMessage(text);
      if (result?.result) {
        await fetchOutfitPlan(currentSessionId);
      }
    }
  }, [inputText, isGenerating, currentSessionId, createSession, sendMessage, fetchOutfitPlan]);

  const handlePresetSelect = useCallback(
    async (question: PresetQuestion) => {
      setShowPresetModal(false);
      if (!currentSessionId) {
        const newId = await createSession();
        if (newId) {
          await sendMessage(question.text);
        }
      } else {
        await sendMessage(question.text);
      }
    },
    [currentSessionId, createSession, sendMessage]
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

  // Render: loading state
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={styles.headerTitle}>{t.navigation.stylist}</Text>
        </View>
        <Pressable
          style={styles.historyButton}
          onPress={() => {
            navigation.navigate("MainTabs", { screen: "Stylist", params: { screen: "SessionCalendar" } });
          }}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Main content */}
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={clearError}>
                <Text style={styles.errorDismiss}>关闭</Text>
              </Pressable>
            </View>
          )}

          {isLoading && !currentOutfitPlan ? (
            <AILoadingState />
          ) : currentOutfitPlan ? (
            <OutfitPlanView
              plan={currentOutfitPlan}
              onItemReplace={handleItemReplace}
              onItemPress={() => {}}
              onFeedback={() => setShowFeedbackModal(true)}
            />
          ) : (
            <FloatingEmptyState
              title={t.stylist.askStyle}
              subtitle={t.stylist.askOccasion}
            />
          )}
        </ScrollView>

        {/* Bottom input area */}
        <View style={styles.bottomArea}>
          <SceneQuickButtons onSceneSelect={handleSceneSelect} disabled={isGenerating} />
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
              />
            </View>
            <Pressable
              style={[
                styles.sendButton,
                (!inputText.trim() || isGenerating) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? colors.surface : colors.textTertiary}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
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
    </SafeAreaView>
  );
};

// ============ Dynamic Styles ============

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5']},
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.textPrimary },
  historyButton: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: Spacing.sm},
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginTop: Spacing.md},
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  generatingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: DesignTokens.spacing[3],
  },
  aiIconCircle: {
    width: DesignTokens.spacing[14],
    height: DesignTokens.spacing[14],
    borderRadius: DesignTokens.spacing[7],
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTextContainer: {
    marginTop: DesignTokens.spacing[2],
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[2],
    marginTop: DesignTokens.spacing[3],
  },
  dot: {
    width: DesignTokens.spacing[2],
    height: DesignTokens.spacing[2],
    borderRadius: DesignTokens.spacing[1],
  },
  shimmerTrack: {
    width: 120,
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
    marginTop: DesignTokens.spacing[4],
  },
  shimmerFill: {
    width: 60,
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: DesignTokens.spacing['2.5'],
    borderRadius: 10,
    backgroundColor: colors.errorLight,
  },
  errorText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.error, flex: 1 },
  errorDismiss: { fontSize: DesignTokens.typography.sizes.sm, color: colors.error, fontWeight: "600", marginLeft: DesignTokens.spacing[3]},
  bottomArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: DesignTokens.spacing[3],
  },
  input: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, maxHeight: Spacing['4xl'], paddingVertical: Spacing.sm},
  sendButton: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: { backgroundColor: colors.surface },
}));

export default AiStylistScreen;

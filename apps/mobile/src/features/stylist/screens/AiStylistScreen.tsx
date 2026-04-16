import React, { useCallback, useEffect, useState } from "react";
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
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../../../design-system/theme';
import { useTranslation } from '../../../i18n';
import { DesignTokens } from '../../../theme/tokens/design-tokens";
import { useAuthStore } from '../../../stores';
import { useAiStylistStore } from "../stores/aiStylistStore";
import type { PresetQuestion } from "../stores/aiStylistStore";
import type { RootStackParamList } from '../../../types/navigation";
import {
  OutfitPlanView,
  ItemReplacementModal,
  FeedbackModal,
  SceneQuickButtons,
  PresetQuestionsModal,
} from '../../../components/aistylist";

export const AiStylistScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>{t.navigation.stylist}</Text>
        </View>
        <Pressable
          style={styles.historyButton}
          onPress={() => {
            navigation.navigate("MainTabs", { screen: "Stylist", params: { screen: "SessionCalendar" } });
          }}
        >
          <Ionicons name="calendar-outline" size={22} color={theme.colors.textPrimary} />
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
            <View style={styles.generatingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.generatingText}>{t.stylist.generating}</Text>
            </View>
          ) : currentOutfitPlan ? (
            <OutfitPlanView
              plan={currentOutfitPlan}
              onItemReplace={handleItemReplace}
              onItemPress={() => {}}
              onFeedback={() => setShowFeedbackModal(true)}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shirt-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>{t.stylist.askStyle}</Text>
              <Text style={styles.emptySubtitle}>
                {t.stylist.askOccasion}
              </Text>
            </View>
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
                placeholderTextColor={theme.colors.textTertiary}
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
                <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? DesignTokens.colors.neutral.white : theme.colors.textTertiary}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  historyButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 8 },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 16 },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  generatingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  generatingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: DesignTokens.colors.semantic.errorLight,
  },
  errorText: { fontSize: 13, color: theme.colors.error, flex: 1 },
  errorDismiss: { fontSize: 13, color: theme.colors.error, fontWeight: "600", marginLeft: 12 },
  bottomArea: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, maxHeight: 80, paddingVertical: 8 },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: theme.colors.surface },
});

export default AiStylistScreen;

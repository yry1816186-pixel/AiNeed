import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, flatColors as colors } from '../../../design-system/theme';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import {
  useQuizStore as useStyleQuizStore,
  useStyleQuizCurrentQuiz,
  useStyleQuizProgress,
  useStyleQuizResult,
  useStyleQuizLoading,
  useStyleQuizError,
} from '../stores/index';
import { QuizProgress } from '../../../components/QuizProgress';
import type { RootStackParamList } from '../../../types/navigation';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

const QUIZ_ID = "default";

export const StyleQuizScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const loadQuiz = useStyleQuizStore((s) => s.loadQuiz);
  const loadProgress = useStyleQuizStore((s) => s.loadProgress);
  const selectAnswer = useStyleQuizStore((s) => s.selectAnswer);
  const submitAll = useStyleQuizStore((s) => s.submitAll);
  const reset = useStyleQuizStore((s) => s.reset);

  const currentQuiz = useStyleQuizCurrentQuiz();
  const progress = useStyleQuizProgress();
  const result = useStyleQuizResult();
  const isLoading = useStyleQuizLoading();
  const error = useStyleQuizError();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const questions = currentQuiz?.questions ?? [];
  const currentQuestionIndex = progress.questionIndex;
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const _isFirstQuestion = currentQuestionIndex === 0;

  // Restore previously selected answer for current question
  useEffect(() => {
    if (currentQuestion) {
      const prevAnswer = progress.answers[currentQuestion.id];
      setSelectedOption(prevAnswer ?? null);
    }
  }, [currentQuestionIndex, currentQuestion, progress.answers]);

  // Load quiz and progress on mount
  useEffect(() => {
    void loadQuiz(QUIZ_ID);
    void loadProgress(QUIZ_ID);
  }, [loadQuiz, loadProgress]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (!currentQuestion) {
        return;
      }
      setSelectedOption(optionId);

      // Auto-save answer via store (non-blocking)
      void selectAnswer(QUIZ_ID, currentQuestion.id, optionId);

      // Auto-advance after 300ms delay
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }

      if (isLastQuestion) {
        // On last question, do not auto-advance; show CTA
        return;
      }

      autoAdvanceTimer.current = setTimeout(() => {
        // The selectAnswer already incremented questionIndex in the store
      }, 300);
    },
    [currentQuestion, selectAnswer, isLastQuestion]
  );

  const handleSubmit = useCallback(async () => {
    await submitAll(QUIZ_ID);
  }, [submitAll]);

  const handleSkip = useCallback(() => {
    reset();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [reset, navigation]);

  // Show result after submission
  if (result) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>你的风格画像</Text>
          <Text style={styles.resultSubtitle}>基于 AI 分析，以下是你的风格测试结果</Text>

          {result.styleTags && result.styleTags.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionTitle}>风格标签</Text>
              <View style={styles.tagRow}>
                {result.styleTags.map((tag: any) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {result.colorPalette && result.colorPalette.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionTitle}>色彩偏好</Text>
              <View style={styles.paletteRow}>
                {result.colorPalette.map((color: any, i: any) => (
                  <View key={`color-${i}`} style={[styles.colorDot, { backgroundColor: color }]} />
                ))}
              </View>
            </View>
          )}

          {result.confidence > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultSectionTitle}>匹配度</Text>
              <Text style={styles.confidenceValue}>{Math.round(result.confidence * 100)}%</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.resultButton}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
            accessibilityLabel="查看完整画像"
            accessibilityRole="button"
          >
            <Text style={styles.resultButtonText}>查看完整画像</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state (initial load)
  if (isLoading && questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>正在生成你的风格报告...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && questions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.neutral[400]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadQuiz(QUIZ_ID)}
            accessibilityLabel="重试"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Submitting state
  if (isLoading && questions.length > 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>正在生成你的风格报告...</Text>
        </View>
      </View>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipTopRight}
        onPress={handleSkip}
        activeOpacity={0.7}
        accessibilityLabel="跳过"
        accessibilityRole="button"
      >
        <Text style={styles.skipTopRightText}>跳过</Text>
      </TouchableOpacity>

      <QuizProgress currentStep={currentQuestionIndex + 1} totalSteps={totalQuestions} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionHeader}>
          <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
          {currentQuestion.subtitle ? (
            <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>
          ) : null}
        </View>

        {/* Image grid (2x2) */}
        {(currentQuestion.images ?? currentQuestion.options ?? []).length > 0 && (
          <View style={styles.imageGrid}>
            {(currentQuestion.images ?? []).map((image: any, _index: any) => (
              <View key={image.id} style={styles.imageGridItem}>
                <TouchableOpacity
                  style={[
                    styles.imageCard,
                    selectedOption === image.id && styles.imageCardSelected,
                  ]}
                  onPress={() => handleSelectOption(image.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={image.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedOption === image.id }}
                >
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={Colors.neutral[400]} />
                    <Text style={styles.imageLabel}>{image.label}</Text>
                  </View>
                  {selectedOption === image.id && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color={colors.surface} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Text options grid */}
        {(!currentQuestion.images || currentQuestion.images.length === 0) &&
          currentQuestion.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, selectedOption === option.id && styles.optionCardSelected]}
              onPress={() => handleSelectOption(option.id)}
              activeOpacity={0.7}
              accessibilityLabel={option.text}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedOption === option.id }}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedOption === option.id && styles.optionTextSelected,
                ]}
              >
                {option.text}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Bottom bar with submit button for last question */}
      {isLastQuestion && selectedOption && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing[4]) }]}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityLabel="查看我的风格报告"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.neutral.white} />
            ) : (
              <Text style={styles.submitButtonText}>查看我的风格报告</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing[8],
  },
  skipTopRight: {
    position: "absolute",
    top: 60,
    right: Spacing[5],
    zIndex: 10,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
  },
  skipTopRightText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: Colors.neutral[500],
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: Colors.neutral[500],
    marginTop: Spacing[3],
  },
  errorText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: Colors.error[500],
    textAlign: "center",
    marginTop: Spacing[3],
    marginBottom: Spacing[4],
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: Colors.neutral.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[8],
  },
  questionHeader: {
    marginBottom: Spacing[5],
  },
  questionTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: Colors.neutral[900],
    marginBottom: Spacing[1],
  },
  questionSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: Colors.neutral[500],
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing[2],
  },
  imageGridItem: {
    width: "50%",
    paddingHorizontal: Spacing[2],
    marginBottom: Spacing[4],
  },
  imageCard: {
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral.white,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    ...Shadows.sm,
  },
  imageCardSelected: {
    borderColor: Colors.primary[500],
  },
  imagePlaceholder: {
    aspectRatio: 3 / 4,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  imageLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: Colors.neutral[700],
    marginTop: Spacing[2],
  },
  checkBadge: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  optionCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    marginBottom: Spacing[3],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
  },
  optionCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: "rgba(198, 123, 92, 0.05)",
  },
  optionText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: Colors.neutral[700],
  },
  optionTextSelected: {
    fontWeight: "600",
    color: Colors.primary[500],
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    backgroundColor: Colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    ...Shadows.md,
  },
  submitButton: {
    flex: 1,
    height: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: Colors.neutral.white,
  },
  resultContainer: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
  },
  resultTitle: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "600",
    color: Colors.neutral[900],
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  resultSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: Colors.neutral[600],
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing[6],
  },
  resultSection: {
    marginBottom: Spacing[5],
  },
  resultSectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: Colors.neutral[900],
    marginBottom: Spacing[3],
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  tag: {
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: Colors.primary[500],
  },
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  colorDot: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
  },
  confidenceValue: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "600",
    color: Colors.primary[500],
  },
  resultButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    marginTop: Spacing[4],
    minHeight: 52,
    justifyContent: "center",
  },
  resultButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: Colors.neutral.white,
  },
}))

export default StyleQuizScreen;

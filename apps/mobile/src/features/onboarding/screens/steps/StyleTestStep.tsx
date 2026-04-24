/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "../../../../polyfills/expo-vector-icons";
import Animated, { SlideInRight, FadeIn } from "react-native-reanimated";
import { Spacing, BorderRadius, flatColors as colors } from "../../../../design-system/theme";
import { DesignTokens } from "../../../../design-system/theme";
import type { OnboardingFormData } from "../../stores/onboardingStore";

interface StyleTestStepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
}

interface QuizOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: "daily",
    question: "你更偏爱哪种日常穿搭？",
    options: [
      {
        id: "minimal",
        label: "简约通勤",
        icon: "briefcase-outline",
        description: "利落干练，职场首选",
      },
      { id: "street", label: "休闲街头", icon: "walk-outline", description: "随性自在，个性表达" },
      {
        id: "elegant",
        label: "优雅知性",
        icon: "ribbon-outline",
        description: "温柔气质，内外兼修",
      },
    ],
  },
  {
    id: "weekend",
    question: "周末出门你会选？",
    options: [
      {
        id: "sporty",
        label: "运动休闲",
        icon: "fitness-outline",
        description: "活力满满，舒适优先",
      },
      {
        id: "vintage",
        label: "文艺复古",
        icon: "glasses-outline",
        description: "独特品味，时光质感",
      },
      { id: "date", label: "精致约会", icon: "heart-outline", description: "精心打扮，魅力加分" },
    ],
  },
  {
    id: "color",
    question: "哪种色彩让你心动？",
    options: [
      {
        id: "neutral",
        label: "中性大地色",
        icon: "leaf-outline",
        description: "沉稳内敛，百搭经典",
      },
      {
        id: "pastel",
        label: "柔和莫兰迪",
        icon: "color-palette-outline",
        description: "温柔淡雅，高级质感",
      },
      { id: "bold", label: "鲜明撞色", icon: "flash-outline", description: "大胆吸睛，自信表达" },
    ],
  },
];

export const StyleTestStep: React.FC<StyleTestStepProps> = ({
  formData,
  updateFormData,
  onNext,
}) => {
  const wasPreviouslyComplete =
    formData.styleAnswers.length === QUESTIONS.length && formData.styleAnswers.every(Boolean);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(
    wasPreviouslyComplete ? formData.styleAnswers : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isTransitioning = useRef(false);

  const handleSelect = useCallback(
    (optionId: string) => {
      if (selectedId || isTransitioning.current) {
        return;
      }

      setSelectedId(optionId);
      isTransitioning.current = true;

      const newAnswers = [...answers];
      newAnswers[currentQuestion] = optionId;
      setAnswers(newAnswers);
      updateFormData({ styleAnswers: newAnswers });

      setTimeout(() => {
        if (currentQuestion < QUESTIONS.length - 1) {
          setCurrentQuestion((prev) => prev + 1);
          setSelectedId(null);
        } else if (!wasPreviouslyComplete) {
          onNext();
        } else {
          setSelectedId(null);
        }
        isTransitioning.current = false;
      }, 400);
    },
    [answers, currentQuestion, selectedId, updateFormData, onNext, wasPreviouslyComplete]
  );

  const question = QUESTIONS[currentQuestion];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>你的风格</Text>
        <Text style={styles.subtitle}>快速选择，AI 为你匹配专属风格</Text>
      </View>

      <View style={styles.dotsContainer}>
        {QUESTIONS.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index <= currentQuestion ? styles.dotActive : styles.dotPending]}
          />
        ))}
        <Text style={styles.progressText}>
          {currentQuestion + 1}/{QUESTIONS.length}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View
          key={question.id}
          entering={SlideInRight.duration(300)}
          style={styles.questionContainer}
        >
          <Text style={styles.questionText}>{question.question}</Text>
          <View style={styles.optionsContainer}>
            {question.options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleSelect(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.optionIconContainer,
                        isSelected && styles.optionIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={26}
                        color={isSelected ? colors.surface : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDescription,
                          isSelected && styles.optionDescriptionSelected,
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    </Animated.View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[2],
  },
  title: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing[2],
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotPending: {
    backgroundColor: colors.neutral[300],
  },
  progressText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    marginLeft: Spacing[2],
  },
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  questionContainer: {
    marginBottom: Spacing[6],
  },
  questionText: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[5],
    lineHeight: 26,
  },
  optionsContainer: {
    gap: Spacing[3],
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.neutral[100],
  },
  optionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconContainerSelected: {
    backgroundColor: colors.primary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    fontWeight: "600",
    color: colors.primary,
  },
  optionDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: colors.textSecondary,
  },
});

export default StyleTestStep;

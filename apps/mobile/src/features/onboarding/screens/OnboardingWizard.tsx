import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { Colors, Spacing, BorderRadius, Shadows , flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { useOnboardingStore } from '../stores/onboardingStore';
import type { OnboardingStep } from '../stores/onboardingStore';
import { onboardingService } from '../services/onboardingService';
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { PhotoStep } from "./steps/PhotoStep";
import { StyleTestStep } from "./steps/StyleTestStep";
import { CompleteStep } from "./steps/CompleteStep";
import type { RootStackParamList } from '../../../types/navigation';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

type NavigationPropType = NavigationProp<RootStackParamList>;

const STEP_ORDER: OnboardingStep[] = ["basicInfo", "photo", "styleTest", "complete"];

const STEP_TITLES: Record<OnboardingStep, string> = {
  basicInfo: "基本信息",
  photo: "上传照片",
  styleTest: "风格测试",
  complete: "完成设置",
};

const SKIPPABLE_STEPS: OnboardingStep[] = ["photo", "styleTest"];

export const OnboardingWizard: React.FC = () => {
  const navigation = useNavigation<NavigationPropType>();
  const {
    currentStep,
    formData,
    isLoading,
    completeStep,
    updateFormData,
    goToNextStep,
    goToPrevStep,
    setLoading,
  } = useOnboardingStore();

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const totalSteps = STEP_ORDER.length;

  const progressValue = useSharedValue((stepIndex + 1) / totalSteps);

  const updateProgress = useCallback(
    (step: number) => {
      progressValue.value = withSpring((step + 1) / totalSteps, {
        damping: 15,
        stiffness: 120,
      });
    },
    [progressValue, totalSteps]
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const canProceed = useCallback((): boolean => {
    if (currentStep === "basicInfo") {
      return formData.gender !== null && formData.ageRange !== null;
    }
    return true;
  }, [currentStep, formData.gender, formData.ageRange]);

  const handleNext = useCallback(() => {
    if (!canProceed()) {
      return;
    }

    completeStep(currentStep);

    if (currentStep === "complete") {
      void handleComplete();
      return;
    }

    goToNextStep();
    updateProgress(stepIndex + 1);
  }, [canProceed, currentStep, completeStep, goToNextStep, stepIndex, updateProgress]);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      goToPrevStep();
      updateProgress(stepIndex - 1);
    }
  }, [stepIndex, goToPrevStep, updateProgress]);

  const handleSkip = useCallback(() => {
    completeStep(currentStep);
    goToNextStep();
    updateProgress(stepIndex + 1);
  }, [currentStep, completeStep, goToNextStep, stepIndex, updateProgress]);

  const handleComplete = useCallback(async () => {
    setLoading(true);
    try {
      await onboardingService.saveOnboardingData(formData);
      await onboardingService.markOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch {
      await onboardingService.markOnboardingComplete();
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } finally {
      setLoading(false);
    }
  }, [formData, navigation, setLoading]);

  const isLastStep = currentStep === "complete";
  const isFirstStep = currentStep === "basicInfo";
  const isSkippable = SKIPPABLE_STEPS.includes(currentStep);

  const renderStep = useMemo(() => {
    switch (currentStep) {
      case "basicInfo":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <BasicInfoStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
            />
          </Animated.View>
        );
      case "photo":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <PhotoStep onNext={handleNext} onSkip={handleSkip} />
          </Animated.View>
        );
      case "styleTest":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <StyleTestStep onNext={handleNext} onSkip={handleSkip} />
          </Animated.View>
        );
      case "complete":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <CompleteStep onComplete={handleComplete} />
          </Animated.View>
        );
      default:
        return null;
    }
  }, [currentStep, formData, handleNext, handleSkip, handleComplete, updateFormData]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.stepCounter}>
          {stepIndex + 1}/{totalSteps}
        </Text>
      </View>

      <View style={styles.stepHeader}>
        <Text style={styles.stepTitleText}>{STEP_TITLES[currentStep]}</Text>
      </View>

      <View style={styles.content}>{renderStep}</View>

      <View style={styles.footer}>
        {isFirstStep ? (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>稍后设置</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>上一步</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerSpacer} />

        {isSkippable && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipButtonText}>跳过</Text>
          </TouchableOpacity>
        )}

        {!isLastStep && (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>下一步</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.surface} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.neutral[200],
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.full,
  },
  stepCounter: {
    marginLeft: Spacing[3],
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    fontWeight: "500",
    minWidth: DesignTokens.spacing[9],
  },
  stepHeader: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
  },
  stepTitleText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    paddingBottom: Spacing[6],
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
  },
  backButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  footerSpacer: {
    flex: 1,
  },
  skipButton: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    marginRight: Spacing[3],
  },
  skipButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
    gap: Spacing[2],
    ...Shadows.brand,
    minHeight: 52,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
});

export default OnboardingWizard;

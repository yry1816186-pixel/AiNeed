/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unused-vars */
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
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
  DesignTokens,
  flatColors as colors,
} from "../../../design-system/theme";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useOnboardingStore } from "../stores/onboardingStore";
import type { OnboardingStep } from "../stores/onboardingStore";
import { onboardingService } from "../services/onboardingService";
import { SceneSelectionStep } from "./steps/SceneSelectionStep";
import { QuickProfileStep } from "./steps/QuickProfileStep";
import { StyleExpressionStep } from "./steps/StyleExpressionStep";
import type { RootStackParamList } from "../../../types/navigation";

type NavigationPropType = NavigationProp<RootStackParamList>;

const STEP_ORDER: OnboardingStep[] = ["scene", "preference", "style", "result"];

const STEP_TITLES: Record<OnboardingStep, string> = {
  scene: "你的场景",
  preference: "快速画像",
  style: "你的风格",
  result: "让伊伊搭第一套",
};

const TOTAL_STEPS = 4;

export const OnboardingWizard: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationPropType>();
  const {
    currentStep,
    formData,
    isLoading,
    newOnboarding,
    completeStep,
    updateFormData,
    goToNextStep,
    goToPrevStep,
    setLoading,
  } = useOnboardingStore();

  const stepIndex = STEP_ORDER.indexOf(currentStep);

  const progressValue = useSharedValue(Math.min((stepIndex + 1) / TOTAL_STEPS, 1));

  const updateProgress = useCallback(
    (step: number) => {
      progressValue.value = withSpring(Math.min((step + 1) / TOTAL_STEPS, 1), {
        damping: 15,
        stiffness: 120,
      });
    },
    [progressValue]
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const canProceed = useCallback((): boolean => {
    if (currentStep === "scene") {
      return newOnboarding.selectedScenes.length >= 1;
    }
    if (currentStep === "preference") {
      return (
        newOnboarding.garmentPreference.lowerBody !== undefined &&
        newOnboarding.garmentPreference.upperFit !== undefined
      );
    }
    if (currentStep === "style") {
      return newOnboarding.selectedStyles.length >= 1;
    }
    return true; // result step
  }, [currentStep, newOnboarding]);

  const handleNext = useCallback(() => {
    if (!canProceed()) {
      return;
    }

    completeStep(currentStep);

    if (currentStep === "result") {
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

  const handleComplete = useCallback(async () => {
    setLoading(true);
    try {
      await onboardingService.completeOnboarding(formData, newOnboarding);
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
  }, [formData, newOnboarding, navigation, setLoading]);

  const isFirstStep = currentStep === "scene";
  const isLastStep = currentStep === "result";

  const renderStep = useMemo(() => {
    switch (currentStep) {
      case "scene":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <SceneSelectionStep onNext={handleNext} />
          </Animated.View>
        );
      case "preference":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <QuickProfileStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
            />
          </Animated.View>
        );
      case "style":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <StyleExpressionStep onNext={handleNext} />
          </Animated.View>
        );
      case "result":
        return (
          <Animated.View
            key={currentStep}
            entering={SlideInRight}
            exiting={SlideOutLeft}
            style={styles.stepContainer}
          >
            <View style={styles.placeholderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.placeholderText}>正在为你搭配...</Text>
            </View>
          </Animated.View>
        );
      default:
        return null;
    }
  }, [currentStep, formData, handleNext, updateFormData, colors.primary]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.stepCounter}>
          {Math.min(stepIndex + 1, TOTAL_STEPS)}/{TOTAL_STEPS}
        </Text>
      </View>

      <View style={styles.stepHeader}>
        <Text style={styles.stepTitleText}>{STEP_TITLES[currentStep]}</Text>
      </View>

      <View style={styles.content}>{renderStep}</View>

      <View style={styles.footer}>
        {isFirstStep ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              onboardingService.markOnboardingComplete().then(() => {
                navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>稍后设置</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>上一步</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerSpacer} />

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
    backgroundColor: colors.neutral[200],
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
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[4],
  },
  placeholderText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
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

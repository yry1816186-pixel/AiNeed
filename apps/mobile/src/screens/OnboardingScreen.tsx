import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../polyfills/expo-vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp as NavProp } from "@react-navigation/native";
import { theme, Colors, Spacing, BorderRadius, Shadows } from "../theme";
import { profileApi } from "../services/api/profile.api";
import type { RootStackParamList } from "../types/navigation";
import {
  StyleStep,
  ColorStep,
  BodyStep,
  AIIntroStep,
} from "../components/onboarding/OnboardingSteps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_COMPLETE_KEY = "@aineed:onboarding_complete";

type NavigationProp = NavProp<RootStackParamList>;

const TOTAL_STEPS = 4;

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bodyType, setBodyType] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const progressValue = useSharedValue(0);

  const updateProgress = useCallback(
    (step: number) => {
      progressValue.value = withSpring((step + 1) / TOTAL_STEPS, {
        damping: 15,
        stiffness: 120,
      });
    },
    [progressValue],
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const handleToggleStyle = useCallback((id: string) => {
    setSelectedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleColor = useCallback((id: string) => {
    setSelectedColors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        return selectedStyles.size > 0;
      case 1:
        return selectedColors.size > 0;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedStyles, selectedColors]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
      updateProgress(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, updateProgress]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      updateProgress(currentStep - 1);
    }
  }, [currentStep, updateProgress]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, []);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        stylePreferences: {
          preferredStyles: Array.from(selectedStyles),
          avoidedStyles: [],
          preferredColors: Array.from(selectedColors),
          avoidedColors: [],
          fitGoals: [],
        },
      };

      const parsedHeight = parseFloat(height);
      const parsedWeight = parseFloat(weight);
      if (!isNaN(parsedHeight) && parsedHeight > 0) {
        updateData.height = parsedHeight;
      }
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        updateData.weight = parsedWeight;
      }
      if (bodyType) {
        updateData.bodyType = bodyType;
      }

      await profileApi.updateProfile(updateData);
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");

      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch (error) {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedStyles, selectedColors, height, weight, bodyType, navigation]);

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
      <Text style={styles.progressText}>
        {currentStep + 1} / {TOTAL_STEPS}
      </Text>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StyleStep
            selectedStyles={selectedStyles}
            onToggleStyle={handleToggleStyle}
          />
        );
      case 1:
        return (
          <ColorStep
            selectedColors={selectedColors}
            onToggleColor={handleToggleColor}
          />
        );
      case 2:
        return (
          <BodyStep
            height={height}
            weight={weight}
            bodyType={bodyType}
            onHeightChange={setHeight}
            onWeightChange={setWeight}
            onBodyTypeChange={setBodyType}
            onSkip={handleSkip}
          />
        );
      case 3:
        return <AIIntroStep />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressBar()}
      <View style={styles.content}>{renderCurrentStep()}</View>
      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.backButtonText}>上一步</Text>
          </TouchableOpacity>
        )}
        <View style={styles.footerSpacer} />
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.surface} />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === TOTAL_STEPS - 1 ? "开始体验" : "下一步"}
              </Text>
              {currentStep < TOTAL_STEPS - 1 && (
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={theme.colors.surface}
                />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    marginLeft: Spacing[3],
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: "500",
    minWidth: 40,
  },
  content: {
    flex: 1,
    overflow: "hidden",
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
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  footerSpacer: {
    flex: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
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
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.surface,
  },
});

export default OnboardingScreen;

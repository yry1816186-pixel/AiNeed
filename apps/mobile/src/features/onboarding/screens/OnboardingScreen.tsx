import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp as NavProp } from "@react-navigation/native";
import { useTranslation } from '../../../i18n';
import { Colors, Spacing, BorderRadius, Shadows } from '../../../design-system/theme';
import { useTheme, createStyles } from 'undefined';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { profileApi, type UpdateProfileDto } from '../../../services/api/profile.api';
import { pickImageSecurely, ImageValidationError } from '../../../utils/imagePicker';
import { PhotoGuideOverlay } from '../../../components/photo/PhotoGuideOverlay';
import { PrivacyConsentModal } from '../../../components/privacy/PrivacyConsentModal';
import type { RootStackParamList } from '../../../types/navigation';

const { width: _SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_COMPLETE_KEY = "@aineed:onboarding_complete";

type NavigationProp = NavProp<RootStackParamList>;
type OnboardingStep = "BASIC_INFO" | "PHOTO" | "QUIZ" | "COMPLETE";

const STEPS: OnboardingStep[] = ["BASIC_INFO", "PHOTO", "QUIZ", "COMPLETE"];
const TOTAL_STEPS = 3; // BASIC_INFO, PHOTO, QUIZ (COMPLETE is terminal)

const GENDER_OPTIONS = [
  { id: "female", label: "女", icon: "woman-outline" as const },
  { id: "male", label: "男", icon: "man-outline" as const },
  { id: "other", label: "其他", icon: "person-outline" as const },
];

const AGE_RANGES = ["18-24", "25-30", "31-40", "40+"];

function getBirthDateFromRange(range: string): string {
  const currentYear = new Date().getFullYear();
  const rangeToYear: Record<string, number> = {
    "18-24": currentYear - 21,
    "25-30": currentYear - 27,
    "31-40": currentYear - 35,
    "40+": currentYear - 45,
  };
  const year = rangeToYear[range] ?? currentYear - 25;
  return `${year}-01-01`;
}

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const t = useTranslation();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("BASIC_INFO");
  const [isSaving, setIsSaving] = useState(false);

  // Step 0: BASIC_INFO state
  const [gender, setGender] = useState<string | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);

  // Step 1: PHOTO state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCameraGuide, setShowCameraGuide] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const progressValue = useSharedValue(1 / TOTAL_STEPS);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const updateProgress = useCallback(
    (step: OnboardingStep) => {
      const idx = STEPS.indexOf(step);
      progressValue.value = withSpring(Math.min(idx + 1, TOTAL_STEPS) / TOTAL_STEPS, {
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
    switch (currentStep) {
      case "BASIC_INFO":
        return gender !== null && ageRange !== null;
      case "PHOTO":
        return true; // photo is optional, skip is allowed
      case "QUIZ":
        return true; // quiz is optional, skip is allowed
      default:
        return false;
    }
  }, [currentStep, gender, ageRange]);

  const handleNext = useCallback(() => {
    if (currentStep === "BASIC_INFO") {
      const nextStep: OnboardingStep = "PHOTO";
      setCurrentStep(nextStep);
      updateProgress(nextStep);
    } else if (currentStep === "PHOTO") {
      const nextStep: OnboardingStep = "QUIZ";
      setCurrentStep(nextStep);
      updateProgress(nextStep);
    } else if (currentStep === "QUIZ") {
      void handleComplete();
    }
  }, [currentStep, updateProgress]);

  const handleBack = useCallback(() => {
    if (currentStep === "PHOTO") {
      setCurrentStep("BASIC_INFO");
      updateProgress("BASIC_INFO");
    } else if (currentStep === "QUIZ") {
      setCurrentStep("PHOTO");
      updateProgress("PHOTO");
    }
  }, [currentStep, updateProgress]);

  const handleSkip = useCallback(() => {
    if (currentStep === "PHOTO") {
      handleNext();
    } else if (currentStep === "QUIZ") {
      void handleComplete();
    }
  }, [currentStep, handleNext]);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    try {
      const updateData: UpdateProfileDto = {
        gender: (gender as "male" | "female" | "other") ?? undefined,
        birthDate: ageRange ? getBirthDateFromRange(ageRange) : undefined,
      };

      await profileApi.updateProfile(updateData);
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");

      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } catch {
      setIsSaving(false);
      Alert.alert(
        t.common.error,
        "无法保存您的偏好设置，请检查网络后重试。您可以稍后在个人设置中完善。",
        [
          { text: t.common.retry, onPress: () => void handleComplete() },
          {
            text: t.common.skip,
            style: "cancel",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" }],
              });
            },
          },
        ]
      );
    }
  }, [gender, ageRange, navigation]);

  const handlePhotoUpload = useCallback(() => {
    setShowPrivacyModal(true);
  }, []);

  const handlePrivacyConfirm = useCallback(() => {
    setShowPrivacyModal(false);
    setShowCameraGuide(true);
  }, []);

  const handlePrivacyCancel = useCallback(() => {
    setShowPrivacyModal(false);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    setShowCameraGuide(false);
    try {
      const result = await pickImageSecurely();
      if (result) {
        setPhotoUri(result.uri);
      }
    } catch (err) {
      if (err instanceof ImageValidationError) {
        Alert.alert("图片选择失败", err.message);
      } else {
        Alert.alert("图片选择失败", "请稍后重试");
      }
    }
  }, []);

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
      <Text style={styles.progressText}>
        {Math.min(currentStepIndex + 1, TOTAL_STEPS)} / {TOTAL_STEPS}
      </Text>
    </View>
  );

  const renderBasicInfoStep = () => (
    <Animated.View entering={FadeIn.duration(350)} style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>基本信息</Text>
        <Text style={styles.stepSubtitle}>帮助我们更好地了解你</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        {/* Gender selector */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>
            性别 <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => {
              const isSelected = gender === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.genderPill, isSelected && styles.genderPillSelected]}
                  onPress={() => setGender(option.id)}
                  activeOpacity={0.7}
                  accessibilityLabel={option.label}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={isSelected ? DesignTokens.colors.neutral.white : colors.textSecondary}
                  />
                  <Text
                    style={[styles.genderPillText, isSelected && styles.genderPillTextSelected]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Age range selector */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>
            年龄段 <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ageRow}
          >
            {AGE_RANGES.map((range) => {
              const isSelected = ageRange === range;
              return (
                <TouchableOpacity
                  key={range}
                  style={[styles.agePill, isSelected && styles.agePillSelected]}
                  onPress={() => setAgeRange(range)}
                  activeOpacity={0.7}
                  accessibilityLabel={range}
                  accessibilityRole="button"
                >
                  <Text style={[styles.agePillText, isSelected && styles.agePillTextSelected]}>
                    {range}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderPhotoStep = () => (
    <Animated.View entering={FadeIn.duration(350)} style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>上传你的照片</Text>
        <Text style={styles.stepSubtitle}>让风格分析更精准</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={handlePhotoUpload}
          activeOpacity={0.7}
          accessibilityLabel="点击上传照片"
          accessibilityRole="button"
        >
          <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.uploadLabel}>点击上传</Text>
          <Text style={styles.uploadHint}>仅用于体型分析和试衣效果生成</Text>
        </TouchableOpacity>

        {photoUri && (
          <View style={styles.photoUploadedContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.photoRemoveButton}
              onPress={() => setPhotoUri(null)}
              accessibilityLabel="移除照片"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={24} color={colors.surface} />
            </TouchableOpacity>
          </View>
        )}

        {/* Camera guide overlay */}
        {showCameraGuide && (
          <View style={styles.cameraGuideContainer}>
            <PhotoGuideOverlay visible={showCameraGuide} />
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
              accessibilityLabel="拍照"
              accessibilityRole="button"
            >
              <Ionicons name="camera" size={24} color={DesignTokens.colors.neutral.white} />
              <Text style={styles.captureButtonText}>拍照</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Skip option */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
        accessibilityLabel="跳过这一步"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>{t.common.skip}</Text>
      </TouchableOpacity>

      <PrivacyConsentModal
        visible={showPrivacyModal}
        onConfirm={handlePrivacyConfirm}
        onCancel={handlePrivacyCancel}
      />
    </Animated.View>
  );

  const renderQuizStep = () => (
    <Animated.View entering={FadeIn.duration(350)} style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>风格测试</Text>
        <Text style={styles.stepSubtitle}>发现你的专属风格</Text>
      </View>
      <View style={styles.quizPlaceholder}>
        <Ionicons name="sparkles-outline" size={48} color={colors.primary} />
        <Text style={styles.quizPlaceholderTitle}>风格测试</Text>
        <Text style={styles.quizPlaceholderSubtitle}>
          通过几道图片选择题，帮你找到最适合的风格方向
        </Text>
        <TouchableOpacity
          style={styles.quizStartButton}
          onPress={() => {
            navigation.navigate("StyleQuiz");
          }}
          activeOpacity={0.7}
          accessibilityLabel="开始测试"
          accessibilityRole="button"
        >
          <Text style={styles.quizStartButtonText}>开始测试</Text>
        </TouchableOpacity>
      </View>

      {/* Skip option */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
        accessibilityLabel="跳过"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>{t.common.skip}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    const { colors } = useTheme();
    switch (currentStep) {
      case "BASIC_INFO":
        return renderBasicInfoStep();
      case "PHOTO":
        return renderPhotoStep();
      case "QUIZ":
        return renderQuizStep();
      case "COMPLETE":
        return null;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressBar()}
      <View style={styles.content}>{renderCurrentStep()}</View>
      <View style={styles.footer}>
        {currentStep !== "BASIC_INFO" && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityLabel={t.common.back}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>{t.common.back}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.footerSpacer} />
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || isSaving}
          activeOpacity={0.7}
          accessibilityLabel={currentStep === "QUIZ" ? t.common.done : t.common.next}
          accessibilityRole="button"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === "QUIZ" ? t.common.done : t.common.next}
              </Text>
              {currentStep !== "QUIZ" && (
                <Ionicons name="arrow-forward" size={18} color={colors.surface} />
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
  progressText: {
    marginLeft: Spacing[3],
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    fontWeight: "400",
    minWidth: 40,
  },
  content: {
    flex: 1,
    overflow: "hidden",
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  stepTitle: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "600",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    marginTop: Spacing[2],
    lineHeight: 24,
    fontWeight: "400",
  },
  formContent: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  sectionBlock: {
    marginBottom: Spacing[6],
  },
  sectionLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: colors.textSecondary,
    marginBottom: Spacing[3],
  },
  requiredAsterisk: {
    color: DesignTokens.colors.semantic.error,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing[3],
  },
  genderPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    gap: Spacing[2],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  genderPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderPillText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  genderPillTextSelected: {
    color: DesignTokens.colors.neutral.white,
    fontWeight: "600",
  },
  ageRow: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  agePill: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  agePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agePillText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: colors.textSecondary,
  },
  agePillTextSelected: {
    color: DesignTokens.colors.neutral.white,
    fontWeight: "600",
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    borderStyle: "dashed",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[8],
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
  },
  uploadLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  uploadHint: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "400",
    color: colors.textTertiary,
    marginTop: Spacing[1],
  },
  photoUploadedContainer: {
    marginTop: Spacing[3],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.xl,
  },
  photoRemoveButton: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraGuideContainer: {
    height: 300,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginTop: Spacing[4],
    backgroundColor: DesignTokens.colors.neutral.black,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Spacing[4],
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  captureButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  skipButton: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    alignSelf: "center",
  },
  skipText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: colors.textTertiary,
  },
  quizPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  quizPlaceholderTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  quizPlaceholderSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  quizStartButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    marginTop: Spacing[3],
  },
  quizStartButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
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
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    fontWeight: "400",
  },
  footerSpacer: {
    flex: 1,
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

export default OnboardingScreen;

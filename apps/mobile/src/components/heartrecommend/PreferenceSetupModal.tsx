import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme, Colors, BorderRadius, Shadows } from '../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { profileApi } from "../../services/api/profile.api";
import { useAuthStore } from "../../stores";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PreferenceSetupModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface PreferenceOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedPreferenceOptionCardProps {
  index: number;
  isSelected: boolean;
  onPress: () => void;
  option: PreferenceOption;
}

const AnimatedPreferenceOptionCard: React.FC<AnimatedPreferenceOptionCardProps> = ({
  index,
  isSelected,
  onPress,
  option,
}) => {
  const scaleAnim = useSharedValue(0.9);

  useEffect(() => {
    scaleAnim.value = withDelay(index * 50, withSpring(1, { damping: 15, stiffness: 150 }));
  }, [index, scaleAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  return (
    <AnimatedTouchable
      style={[styles.optionCard, isSelected && styles.optionCardSelected, animatedStyle]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name={option.icon} size={32} color={isSelected ? Colors.primary[600] : theme.colors.textSecondary} />
      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
        {option.label}
      </Text>
      {option.description && <Text style={styles.optionDescription}>{option.description}</Text>}
      {isSelected && (
        <View style={styles.checkMark}>
          <Ionicons name="checkmark" size={14} color={DesignTokens.colors.text.inverse} />
        </View>
      )}
    </AnimatedTouchable>
  );
};

const PreferenceSetupModal: React.FC<PreferenceSetupModalProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const { user, setUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [budget, setBudget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progress = useSharedValue(0);
  const stepOpacity = useSharedValue(1);
  const stepTranslateX = useSharedValue(0);

  const totalSteps = 5;

  useEffect(() => {
    progress.value = withSpring((currentStep + 1) / totalSteps, {
      damping: 15,
      stiffness: 150,
    });
  }, [currentStep]);

  const progressWidth = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const stepAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
    transform: [{ translateX: stepTranslateX.value }],
  }));

  const genderOptions: PreferenceOption[] = [
    { id: "female", label: "女士", icon: "woman-outline" },
    { id: "male", label: "男士", icon: "man-outline" },
    { id: "other", label: "其他", icon: "person-outline" },
  ];

  const styleOptions: PreferenceOption[] = [
    { id: "minimalist", label: "简约", icon: "sparkles-outline", description: "干净利落" },
    { id: "romantic", label: "浪漫", icon: "flower-outline", description: "柔美优雅" },
    { id: "streetwear", label: "街头", icon: "flame-outline", description: "潮流个性" },
    { id: "vintage", label: "复古", icon: "time-outline", description: "经典文艺" },
    { id: "casual", label: "休闲", icon: "shirt-outline", description: "舒适自在" },
    { id: "business", label: "商务", icon: "briefcase-outline", description: "干练专业" },
    { id: "sporty", label: "运动", icon: "fitness-outline", description: "活力动感" },
    { id: "bohemian", label: "波西米亚", icon: "color-palette-outline", description: "自由艺术" },
  ];

  const colorOptions: PreferenceOption[] = [
    { id: "black", label: "黑色系", icon: "contrast-outline" },
    { id: "white", label: "白色系", icon: "sunny-outline" },
    { id: "neutral", label: "大地色", icon: "earth-outline" },
    { id: "pastel", label: "粉彩色", icon: "color-palette-outline" },
    { id: "bright", label: "亮色系", icon: "rainy-outline" },
    { id: "blue", label: "蓝色系", icon: "water-outline" },
  ];

  const occasionOptions: PreferenceOption[] = [
    { id: "daily", label: "日常通勤", icon: "briefcase-outline" },
    { id: "date", label: "约会聚会", icon: "heart-outline" },
    { id: "party", label: "派对活动", icon: "wine-outline" },
    { id: "travel", label: "旅行度假", icon: "airplane-outline" },
    { id: "workout", label: "运动健身", icon: "fitness-outline" },
    { id: "home", label: "居家休闲", icon: "home-outline" },
  ];

  const budgetOptions: PreferenceOption[] = [
    { id: "low", label: "经济实惠", icon: "wallet-outline", description: "追求性价比" },
    {
      id: "medium",
      label: "适中预算",
      icon: "card-outline",
      description: "品质与价格平衡",
    },
    { id: "high", label: "品质优先", icon: "diamond-outline", description: "注重品质体验" },
    {
      id: "luxury",
      label: "奢华享受",
      icon: "star-outline",
      description: "追求顶级品牌",
    },
  ];

  const handleNext = () => {
    stepOpacity.value = withTiming(0, { duration: 150 });
    stepTranslateX.value = withTiming(-30, { duration: 150 });

    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
        stepTranslateX.value = 30;
        stepOpacity.value = 0;
        stepTranslateX.value = withTiming(0, { duration: 200 });
        stepOpacity.value = withTiming(1, { duration: 200 });
      } else {
        void handleComplete();
      }
    }, 200);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      stepOpacity.value = withTiming(0, { duration: 150 });
      stepTranslateX.value = withTiming(30, { duration: 150 });

      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        stepTranslateX.value = -30;
        stepOpacity.value = 0;
        stepTranslateX.value = withTiming(0, { duration: 200 });
        stepOpacity.value = withTiming(1, { duration: 200 });
      }, 200);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      const preferences = {
        gender: selectedGender,
        preferredStyles: selectedStyles,
        preferredColors: selectedColors,
        preferredOccasions: selectedOccasions,
        budget: budget,
      };

      await profileApi.updateProfile({ preferences } as Record<string, unknown>);

      if (user) {
        setUser({
          ...user,
          preferences: {
            preferredStyles: selectedStyles,
            preferredColors: selectedColors,
            avoidedColors: [],
            styleAvoidances: [],
            fitGoals: [],
            budget: budget as "low" | "medium" | "high" | "luxury",
            notifications: user.preferences?.notifications || {
              outfitReminders: true,
              newArrivals: true,
              sales: true,
            },
          },
        });
      }

      onComplete();
    } catch (error) {
      console.error("Save preferences error:", error);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (
    id: string,
    selected: string[],
    setSelected: (val: string[]) => void
  ) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const renderOptionGrid = (
    options: PreferenceOption[],
    selected: string | string[] | null,
    onSelect: (id: string) => void,
    multiSelect: boolean = false
  ) => {
    return (
      <View style={styles.optionsGrid}>
        {options.map((option, index) => {
          const isSelected = multiSelect
            ? (selected as string[]).includes(option.id)
            : selected === option.id;

          return (
            <AnimatedPreferenceOptionCard
              key={option.id}
              index={index}
              isSelected={isSelected}
              onPress={() => onSelect(option.id)}
              option={option}
            />
          );
        })}
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Animated.View style={[styles.stepContainer, stepAnimatedStyle]}>
            <Text style={styles.stepTitle}>您的性别是？</Text>
            <Text style={styles.stepSubtitle}>帮助我们为您推荐更合适的款式</Text>
            {renderOptionGrid(genderOptions, selectedGender, setSelectedGender)}
          </Animated.View>
        );
      case 1:
        return (
          <Animated.View style={[styles.stepContainer, stepAnimatedStyle]}>
            <Text style={styles.stepTitle}>您喜欢的风格？</Text>
            <Text style={styles.stepSubtitle}>可多选，至少选择1个</Text>
            {renderOptionGrid(
              styleOptions,
              selectedStyles,
              (id) => toggleSelection(id, selectedStyles, setSelectedStyles),
              true
            )}
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View style={[styles.stepContainer, stepAnimatedStyle]}>
            <Text style={styles.stepTitle}>偏爱的颜色？</Text>
            <Text style={styles.stepSubtitle}>选择您日常穿搭的颜色偏好</Text>
            {renderOptionGrid(
              colorOptions,
              selectedColors,
              (id) => toggleSelection(id, selectedColors, setSelectedColors),
              true
            )}
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View style={[styles.stepContainer, stepAnimatedStyle]}>
            <Text style={styles.stepTitle}>穿搭场合？</Text>
            <Text style={styles.stepSubtitle}>您最常需要穿搭的场合</Text>
            {renderOptionGrid(
              occasionOptions,
              selectedOccasions,
              (id) => toggleSelection(id, selectedOccasions, setSelectedOccasions),
              true
            )}
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View style={[styles.stepContainer, stepAnimatedStyle]}>
            <Text style={styles.stepTitle}>预算范围？</Text>
            <Text style={styles.stepSubtitle}>帮助我们推荐合适价位的商品</Text>
            {renderOptionGrid(budgetOptions, budget, setBudget)}
          </Animated.View>
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedGender !== null;
      case 1:
        return selectedStyles.length > 0;
      case 2:
        return selectedColors.length > 0;
      case 3:
        return selectedOccasions.length > 0;
      case 4:
        return budget !== null;
      default:
        return false;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          {currentStep > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, progressWidth]} />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} / {totalSteps}
            </Text>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipText}>跳过</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed() || loading}
          >
            <LinearGradient
              colors={canProceed() ? [DesignTokens.colors.brand.slateLight, DesignTokens.colors.brand.slateDark] : [DesignTokens.colors.neutral[300], "#aaa" /* custom color */]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === totalSteps - 1 ? "开始探索" : "下一步"}
              </Text>
              {currentStep < totalSteps - 1 && (
                <Ionicons name="arrow-forward" size={20} color={DesignTokens.colors.text.inverse} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.neutral[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary[500],
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionCard: {
    width: (SCREEN_WIDTH - 40 - 24) / 3,
    aspectRatio: 0.9,
    backgroundColor: theme.colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    ...Shadows.sm,
  },
  optionCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  optionLabelSelected: {
    color: Colors.primary[600],
  },
  optionDescription: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
    textAlign: "center",
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 28,
    overflow: "hidden",
    ...Shadows.md,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
});

export default PreferenceSetupModal;

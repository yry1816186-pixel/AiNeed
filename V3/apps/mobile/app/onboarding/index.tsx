import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography, spacing, radius } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';

const TOTAL_STEPS = 6;

const GENDER_OPTIONS = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '不选择' },
] as const;

const STYLE_OPTIONS = [
  '极简', '韩系', '日系', '街头', '国潮', '法式',
  '欧美', '新中式', '运动风', '学院风', '复古', '甜美',
] as const;

const OCCASION_OPTIONS = [
  '通勤', '约会', '运动', '休闲', '派对', '旅行',
] as const;

const BUDGET_OPTIONS = [
  { value: '100', label: '100元以内' },
  { value: '300', label: '100-300元' },
  { value: '500', label: '300-500元' },
  { value: '1000', label: '500-1000元' },
  { value: 'unlimited', label: '不限预算' },
] as const;

interface OnboardingData {
  gender: string;
  styleTags: string[];
  occasionTags: string[];
  budgetRange: string;
}

function WelcomeIcon() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
      <Defs>
        <LinearGradient id="welcomeGrad" x1="0" y1="0" x2="120" y2="120">
          <Stop offset="0%" stopColor={colors.accent} />
          <Stop offset="100%" stopColor={colors.accentLight} />
        </LinearGradient>
      </Defs>
      <Circle cx={60} cy={60} r={56} fill="url(#welcomeGrad)" opacity={0.1} />
      <Circle cx={60} cy={60} r={40} fill="url(#welcomeGrad)" opacity={0.15} />
      <Path
        d="M42 52C42 44.82 47.82 39 55 39H65C72.18 39 78 44.82 78 52V62C78 69.18 72.18 75 65 75H55C47.82 75 42 69.18 42 62V52Z"
        fill="url(#welcomeGrad)"
        opacity={0.8}
      />
      <Circle cx={53} cy={55} r={3} fill="white" />
      <Circle cx={67} cy={55} r={3} fill="white" />
      <Path
        d="M55 64C55 64 57.5 67 60 67C62.5 67 65 64 65 64"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M40 46C37 38 42 33 48 36" stroke="url(#welcomeGrad)" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M80 46C83 38 78 33 72 36" stroke="url(#welcomeGrad)" strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M35 85L45 75" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
      <Path d="M85 85L75 75" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
      <Circle cx={30} cy={30} r={4} fill={colors.accent} opacity={0.2} />
      <Circle cx={90} cy={25} r={3} fill={colors.accentLight} opacity={0.3} />
      <Circle cx={95} cy={90} r={5} fill={colors.accent} opacity={0.15} />
    </Svg>
  );
}

function AvatarGuideIcon() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100" fill="none">
      <Defs>
        <LinearGradient id="avatarGrad" x1="0" y1="0" x2="100" y2="100">
          <Stop offset="0%" stopColor={colors.accent} />
          <Stop offset="100%" stopColor={colors.accentLight} />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={50} r={46} fill="url(#avatarGrad)" opacity={0.1} />
      <Circle cx={50} cy={40} r={20} fill="url(#avatarGrad)" opacity={0.6} />
      <Rect x={30} y={62} width={40} height={28} rx={14} fill="url(#avatarGrad)" opacity={0.6} />
      <Circle cx={44} cy={38} r={2.5} fill="white" />
      <Circle cx={56} cy={38} r={2.5} fill="white" />
      <Path d="M46 44C46 44 48 46 50 46C52 46 54 44 54 44" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M25 70L20 80" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
      <Path d="M75 70L80 80" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    </Svg>
  );
}

function BackArrow() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 19L8 12L15 5" stroke={colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function GenderIcon({ type }: { type: 'male' | 'female' | 'other' }) {
  if (type === 'male') {
    return (
      <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <Circle cx={16} cy={16} r={14} stroke={colors.primary} strokeWidth={1.5} opacity={0.2} />
        <Path d="M12 12L20 20M20 12V20H12" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (type === 'female') {
    return (
      <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <Circle cx={16} cy={13} r={7} stroke={colors.accent} strokeWidth={1.5} opacity={0.3} />
        <Path d="M16 20V28M12 24H20" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Circle cx={16} cy={16} r={10} stroke={colors.textTertiary} strokeWidth={1.5} opacity={0.3} />
      <Path d="M16 10V22M10 16H22" stroke={colors.textTertiary} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    gender: '',
    styleTags: [],
    occasionTags: [],
    budgetRange: '',
  });
  const router = useRouter();

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return data.gender.length > 0;
      case 2: return data.styleTags.length > 0;
      case 3: return data.occasionTags.length > 0;
      case 4: return data.budgetRange.length > 0;
      case 5: return true;
      default: return false;
    }
  }, [step, data]);

  const handleNext = useCallback(() => {
    if (step === TOTAL_STEPS - 1) {
      router.replace('/(tabs)');
    } else {
      setStep((s) => s + 1);
    }
  }, [step, router]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const toggleTag = useCallback((field: 'styleTags' | 'occasionTags', tag: string) => {
    setData((prev) => {
      const current = prev[field];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return { ...prev, [field]: updated };
    });
  }, []);

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              i <= step ? styles.progressFillActive : undefined,
            ]}
          />
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Animated.View
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepContent}
            key="step-0"
          >
            <WelcomeIcon />
            <Text variant="h1" style={styles.stepTitle}>AI理解你的风格</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.stepDesc}>
              回答几个简单的问题，让我们更懂你，为你推荐最合适的搭配方案
            </Text>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepContent}
            key="step-1"
          >
            <Text variant="h2" style={styles.stepTitle}>选择你的性别</Text>
            <Text variant="body" color={colors.textTertiary} style={styles.stepDesc}>
              帮助我们更好地推荐适合你的风格
            </Text>
            <View style={styles.genderGrid}>
              {GENDER_OPTIONS.map((option) => {
                const isSelected = data.gender === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.genderCard, isSelected && styles.genderCardSelected]}
                    onPress={() => setData((prev) => ({ ...prev, gender: option.value }))}
                    activeOpacity={0.7}
                  >
                    <GenderIcon type={option.value} />
                    <Text
                      variant="body"
                      color={isSelected ? colors.accent : colors.textSecondary}
                      style={styles.genderLabel}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepContent}
            key="step-2"
          >
            <Text variant="h2" style={styles.stepTitle}>选择你的风格偏好</Text>
            <Text variant="body" color={colors.textTertiary} style={styles.stepDesc}>
              可多选，选择你喜欢的风格
            </Text>
            <View style={styles.tagGrid}>
              {STYLE_OPTIONS.map((tag) => {
                const isSelected = data.styleTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                    onPress={() => toggleTag('styleTags', tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="bodySmall"
                      color={isSelected ? colors.textInverse : colors.textSecondary}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepContent}
            key="step-3"
          >
            <Text variant="h2" style={styles.stepTitle}>选择常穿场合</Text>
            <Text variant="body" color={colors.textTertiary} style={styles.stepDesc}>
              可多选，帮助我们推荐更实用的搭配
            </Text>
            <View style={styles.tagGrid}>
              {OCCASION_OPTIONS.map((tag) => {
                const isSelected = data.occasionTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                    onPress={() => toggleTag('occasionTags', tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="bodySmall"
                      color={isSelected ? colors.textInverse : colors.textSecondary}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepContent}
            key="step-4"
          >
            <Text variant="h2" style={styles.stepTitle}>你的预算范围</Text>
            <Text variant="body" color={colors.textTertiary} style={styles.stepDesc}>
              单件服装的预算区间
            </Text>
            <View style={styles.budgetList}>
              {BUDGET_OPTIONS.map((option) => {
                const isSelected = data.budgetRange === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.budgetCard, isSelected && styles.budgetCardSelected]}
                    onPress={() => setData((prev) => ({ ...prev, budgetRange: option.value }))}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.budgetDot, isSelected && styles.budgetDotSelected]} />
                    <Text
                      variant="body"
                      color={isSelected ? colors.accent : colors.textSecondary}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View
            entering={SlideInRight.duration(350)}
            exiting={SlideOutLeft.duration(200)}
            style={styles.stepContent}
            key="step-5"
          >
            <AvatarGuideIcon />
            <Text variant="h1" style={styles.stepTitle}>创建你的专属形象</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.stepDesc}>
              接下来创建你的Q版形象，它将成为你的时尚伙伴，展示每日穿搭
            </Text>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backBtn}>
            <BackArrow />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <Text variant="caption" color={colors.textTertiary}>
          {step + 1} / {TOTAL_STEPS}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} activeOpacity={0.7}>
          <Text variant="bodySmall" color={colors.textTertiary}>跳过</Text>
        </TouchableOpacity>
      </View>

      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          disabled={!canProceed()}
          onPress={handleNext}
          style={styles.nextButton}
        >
          {step === TOTAL_STEPS - 1 ? '开始使用' : '下一步'}
        </Button>
      </View>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + spacing.xs,
    paddingBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  backBtnPlaceholder: {
    width: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.gray200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '0%',
    borderRadius: 1.5,
  },
  progressFillActive: {
    width: '100%',
    backgroundColor: colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  stepTitle: {
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  stepDesc: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: SCREEN_WIDTH - 80,
  },
  genderGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    width: '100%',
  },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  genderCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.gray50,
  },
  genderLabel: {
    fontWeight: '500' as const,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
    justifyContent: 'center',
  },
  tagChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  tagChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  budgetList: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  budgetCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.gray50,
  },
  budgetDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  budgetDotSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    borderWidth: 3,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl + spacing.md,
    paddingTop: spacing.md,
  },
  nextButton: {
    borderRadius: radius.xl,
  },
});

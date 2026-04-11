import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius } from '../../src/theme';

const ONBOARDING_STEPS = [
  { title: 'AI造型师', description: '智能搭配推荐，懂你的风格' },
  { title: 'Q版形象', description: '创建你的专属虚拟形象' },
  { title: '衣橱管理', description: '数字化管理你的所有服装' },
  { title: '搭配推荐', description: '基于场合和偏好的智能推荐' },
  { title: '服装定制', description: '设计独一无二的专属服装' },
  { title: '开始体验', description: '一切就绪，开启你的时尚之旅' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isLast = step === ONBOARDING_STEPS.length - 1;
  const current = ONBOARDING_STEPS[step];

  const handleNext = () => {
    if (isLast) {
      router.replace('/(tabs)');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.stepIndicator, { width: width * 0.6 }]}>
          {ONBOARDING_STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
            />
          ))}
        </View>

        <Text style={styles.stepCount}>{step + 1} / {ONBOARDING_STEPS.length}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.description}>{current.description}</Text>
      </View>

      <View style={styles.footer}>
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.skipText}>跳过</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? '开始' : '下一步'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray300,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  dotDone: {
    backgroundColor: colors.accent,
  },
  stepCount: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  skipText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  nextButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});

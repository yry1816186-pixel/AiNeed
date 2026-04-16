import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { LinearGradient } from "../../../polyfills/expo-linear-gradient";
import Animated, { SlideInRight } from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Shadows } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface StyleTestStepProps {
  onNext: () => void;
  onSkip?: () => void;
}

const FEATURES = [
  {
    icon: "color-palette-outline",
    title: "色彩偏好",
    description: "了解你最适合的色彩",
  },
  {
    icon: "shirt-outline",
    title: "风格匹配",
    description: "发现你的专属风格",
  },
  {
    icon: "sparkles-outline",
    title: "个性推荐",
    description: "AI 生成个性化建议",
  },
] as const;

export const StyleTestStep: React.FC<StyleTestStepProps> = ({ onNext, onSkip }) => (
  <Animated.View entering={SlideInRight.duration(350)} style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>发现你的时尚风格</Text>
      <Text style={styles.subtitle}>通过简单的图片选择测试，AI 将为你找到最适合的穿搭风格</Text>
    </View>

    <View style={styles.previewContainer}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.previewCard}
      >
        <Ionicons name="sparkle-outline" size={64} color={DesignTokens.colors.backgrounds.primary} />
        <Text style={styles.previewTitle}>风格测试预览</Text>
        <Text style={styles.previewSubtitle}>8 道精选题�?· 3 分钟完成</Text>
      </LinearGradient>
    </View>

    <View style={styles.featuresContainer}>
      {FEATURES.map((feature) => (
        <View key={feature.icon} style={styles.featureCard}>
          <View style={styles.featureIconContainer}>
            <Ionicons name={feature.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.featureTitle}>{feature.title}</Text>
          <Text style={styles.featureDescription}>{feature.description}</Text>
        </View>
      ))}
    </View>

    <View style={styles.actions}>
      <TouchableOpacity style={styles.startButton} onPress={onNext} activeOpacity={0.7}>
        <Text style={styles.startButtonText}>开始测试</Text>
        <Ionicons name="play-outline" size={20} color={DesignTokens.colors.backgrounds.primary} />
      </TouchableOpacity>
      {onSkip && (
        <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>跳过</Text>
        </TouchableOpacity>
      )}
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing[5],
  },
  header: {
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  title: {
    fontSize: DesignTokens.typography.sizes['2xl'],
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
  previewContainer: {
    alignItems: "center",
    marginBottom: Spacing[6],
  },
  previewCard: {
    width: SCREEN_WIDTH - Spacing[10],
    height: 240,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.brand,
  },
  previewTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.backgrounds.primary,
    marginTop: Spacing[4],
  },
  previewSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: Spacing[2],
  },
  featuresContainer: {
    flexDirection: "row",
    gap: Spacing[3],
    marginBottom: Spacing[8],
  },
  featureCard: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    alignItems: "center",
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  featureTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  featureDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    alignItems: "center",
    paddingBottom: Spacing[6],
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[8],
    gap: Spacing[2],
    width: "100%",
  },
  startButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.backgrounds.primary,
  },
  skipButton: {
    marginTop: Spacing[4],
    paddingVertical: Spacing[2],
  },
  skipText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
  },
});

export default StyleTestStep;

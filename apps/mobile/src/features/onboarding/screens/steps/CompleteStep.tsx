import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { DesignTokens } from '../../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Colors, Spacing, BorderRadius, Shadows } from '../../../../design-system/theme';
import { Ionicons } from '../../../../polyfills/expo-vector-icons';
import { LinearGradient } from '../../../../polyfills/expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeIn,
  SlideInUp,
} from "react-native-reanimated";
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';

const { width: _SCREEN_WIDTH } = Dimensions.get("window");

interface CompleteStepProps {
  onComplete: () => void;
}

const PREVIEW_ITEMS = [
  { icon: "sparkles-outline", title: "AI 推荐" },
  { icon: "shirt-outline", title: "虚拟试衣" },
  { icon: "heart-outline", title: "个性风格" },
] as const;

const DECORATIONS = [
  { size: 8, color: colors.primary, top: -8, right: DesignTokens.spacing[5], delay: 200 },
  { size: 12, color: colors.secondary, top: DesignTokens.spacing['2.5'], right: -12, delay: 300 },
  { size: 16, color: colors.gold, bottom: -10, left: -8, delay: 400 },
  { size: 8, color: colors.primaryLight, bottom: 5, right: -16, delay: 500 },
  { size: 12, color: colors.secondaryLight, top: -14, left: 15, delay: 600 },
];

export const CompleteStep: React.FC<CompleteStepProps> = ({ onComplete }) => {
  const scaleValue = useSharedValue(0);

  useEffect(() => {
    scaleValue.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 100 }),
      withSpring(1.0, { damping: 15, stiffness: 150 })
    );
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.celebrationContainer}>
        <View style={styles.iconWrapper}>
          <Animated.View style={[styles.iconOuter, iconAnimatedStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="checkmark-circle" size={48} color={colors.surface} />
            </LinearGradient>
          </Animated.View>
          {DECORATIONS.map((deco, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.duration(400).delay(deco.delay)}
              style={[
                styles.decorationDot,
                {
                  width: deco.size,
                  height: deco.size,
                  borderRadius: deco.size / 2,
                  backgroundColor: deco.color,
                  top: deco.top,
                  right: deco.right,
                  bottom: deco.bottom,
                  left: deco.left,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.textContainer}>
        <Text style={styles.mainTitle}>设置完成!</Text>
        <Text style={styles.mainSubtitle}>你的个人档案已创建，AI 造型师已准备就绪</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.previewContainer}>
        {PREVIEW_ITEMS.map((item) => (
          <View key={item.icon} style={styles.previewCard}>
            <View style={styles.previewIconContainer}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.previewTitle}>{item.title}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(800)} style={styles.buttonContainer}>
        <TouchableOpacity style={styles.exploreButton} onPress={onComplete} activeOpacity={0.7}>
          <Text style={styles.exploreButtonText}>开始探索</Text>
          <Ionicons name="arrow-forward-outline" size={20} color={colors.surface} />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[8],
    paddingBottom: Spacing[8],
  },
  celebrationContainer: {
    alignItems: "center",
    marginBottom: Spacing[8],
  },
  iconWrapper: {
    position: "relative",
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  decorationDot: {
    position: "absolute",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: Spacing[8],
  },
  mainTitle: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  mainSubtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing[2],
    lineHeight: 24,
  },
  previewContainer: {
    flexDirection: "row",
    gap: Spacing[3],
    marginBottom: Spacing[8],
    width: "100%",
  },
  previewCard: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    alignItems: "center",
  },
  previewIconContainer: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  previewTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  buttonContainer: {
    width: "100%",
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: BorderRadius.xl,
    gap: Spacing[2],
    ...Shadows.brand,
  },
  exploreButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
});

export default CompleteStep;

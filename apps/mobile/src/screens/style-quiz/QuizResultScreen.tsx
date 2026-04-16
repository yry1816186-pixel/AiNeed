import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useQuizStore } from "../../stores/quizStore";
import { Colors, Spacing, BorderRadius } from '../../design-system/theme';
import { useTheme, createStyles } from 'undefined';
import { DesignTokens } from "../../theme/tokens/design-tokens";

const TAG_COLORS = [
  Colors.primary[500],
  Colors.sage[500],
  Colors.accent[500],
  Colors.rose[400],
  Colors.sky[400],
  Colors.emerald[400],
];

const OCCASION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  日常: "sunny-outline",
  工作: "briefcase-outline",
  约会: "heart-outline",
  聚会: "wine-outline",
  运动: "fitness-outline",
  旅行: "airplane-outline",
  正式: "ribbon-outline",
  休闲: "cafe-outline",
};

const CONFETTI_COLORS = [
  Colors.primary[400],
  Colors.sage[400],
  Colors.accent[400],
  Colors.rose[300],
  Colors.sky[300],
  Colors.amber[400],
];

export const QuizResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const { result, resetQuiz } = useQuizStore();

  const styleTags = result?.styleTags ?? [];
  const colorPalette = result?.colorPalette ?? [];
  const occasionPreferences = result?.occasionPreferences ?? [];
  const confidence = result?.confidence ?? 0;

  const confettiDots = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + (i % 3) * 4,
      left: 10 + (i % 6) * 15,
      top: i < 6 ? 5 + (i % 3) * 8 : 45 + (i % 3) * 8,
    }));
  }, []);

  const handleViewProfile = useCallback(() => {
    navigation.navigate("Profile" as never);
  }, [navigation]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: "我的风格画像",
        message: `我在寻裳完成了风格测试！我的风格标签：${styleTags.join("、")}`,
      });
    } catch (error) {
      // Share failed
      console.error('Share failed:', error);
    }
  }, [styleTags]);

  const handleRetake = useCallback(() => {
    resetQuiz();
    navigation.goBack();
  }, [resetQuiz, navigation]);

  const getTagColor = (index: number) => TAG_COLORS[index % TAG_COLORS.length];

  const confidencePercent = Math.round(confidence * 100);
  const _confidenceStrokeDashoffset = 188.5 - 188.5 * confidence;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(600).delay(0)} style={styles.headerSection}>
          <View style={styles.confettiContainer}>
            {confettiDots.map((dot) => (
              <View
                key={dot.id}
                style={[
                  styles.confettiDot,
                  {
                    backgroundColor: dot.color,
                    width: dot.size,
                    height: dot.size,
                    left: `${dot.left}%`,
                    top: dot.top,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.title}>你的风格画像</Text>
          <Text style={styles.subtitle}>基于你的选择，AI 为你生成专属风格分析</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>风格标签</Text>
          <View style={styles.tagCloud}>
            {styleTags.map((tag, index) => (
              <View key={tag} style={[styles.tag, { backgroundColor: getTagColor(index) }]}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>色彩偏好</Text>
          <View style={styles.colorRow}>
            {colorPalette.map((hex, index) => (
              <View key={`${hex}-${index}`} style={styles.colorSwatchContainer}>
                <View style={[styles.colorSwatch, { backgroundColor: hex }]} />
                <Text style={styles.colorHex}>{hex}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>场合偏好</Text>
          <View style={styles.occasionList}>
            {occasionPreferences.map((occasion) => (
              <View key={occasion} style={styles.occasionItem}>
                <Ionicons
                  name={OCCASION_ICONS[occasion] ?? "star-outline"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.occasionText}>{occasion}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>匹配度</Text>
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceCircle}>
              <View style={styles.confidenceCircleBg}>
                <View
                  style={[
                    styles.confidenceCircleProgress,
                    {
                      transform: [{ rotate: `${-90 + confidencePercent * 3.6}deg` }],
                    },
                  ]}
                />
              </View>
              <View style={styles.confidenceInner}>
                <Text style={styles.confidenceValue}>{confidencePercent}</Text>
                <Text style={styles.confidenceUnit}>%</Text>
              </View>
            </View>
            <Text style={styles.confidenceLabel}>风格匹配置信度</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>查看完整画像</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlinedButton} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color={colors.primary} />
            <Text style={styles.outlinedButtonText}>分享</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.6}>
            <Text style={styles.retakeText}>重新测试</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[10],
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing[8],
    position: "relative",
  },
  confettiContainer: {
    position: "absolute",
    top: -Spacing[4],
    left: 0,
    right: 0,
    height: 80,
  },
  confettiDot: {
    position: "absolute",
    borderRadius: BorderRadius.full,
    opacity: 0.7,
  },
  title: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: Spacing[4],
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing[2],
  },
  section: {
    marginBottom: Spacing[7],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[3],
  },
  tagCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  tag: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius["2xl"],
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral.white,
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  colorSwatchContainer: {
    alignItems: "center",
    gap: Spacing[1],
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorHex: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
  },
  occasionList: {
    gap: Spacing[3],
  },
  occasionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  occasionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
  },
  confidenceContainer: {
    alignItems: "center",
    gap: Spacing[3],
  },
  confidenceCircle: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceCircleBg: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: colors.border,
  },
  confidenceCircleProgress: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: colors.primary,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  confidenceInner: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  confidenceValue: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
    color: colors.primary,
  },
  confidenceUnit: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.primary,
  },
  confidenceLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  actionsSection: {
    marginTop: Spacing[4],
    gap: Spacing[3],
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: Spacing[4],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  outlinedButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  outlinedButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.primary,
  },
  retakeButton: {
    paddingVertical: Spacing[3],
    alignItems: "center",
  },
  retakeText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    textDecorationLine: "underline",
  },
});

export default QuizResultScreen;

import { useState, useCallback, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Spacing, flatColors as colors } from '../../../../design-system/theme';
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';


interface ProfileCompletionBannerProps {
  completionPercent: number;
  isComplete: boolean;
  onDismiss: () => void;
  onContinue: () => void;
}

const ProfileCompletionBanner = memo(
  ({ completionPercent, isComplete, onDismiss, onContinue }: ProfileCompletionBannerProps) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
    const [visible, setVisible] = useState(true);

    const handleDismiss = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setVisible(false);
      onDismiss();
    }, [onDismiss]);

    if (!visible) {
      return null;
    }

    if (isComplete) {
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={[
              colors.successLight,
              colors.surfaceElevated,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.completeGradient}
          >
            <View style={styles.completeContent}>
              <View style={styles.completeIconCircle}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.success}
                />
              </View>
              <View style={styles.textArea}>
                <Text style={styles.completeTitle}>你的风格画像已就绪 ✓</Text>
                <Text style={styles.completeSubtitle}>个性化推荐已全面开启</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: Spacing.sm, bottom: Spacing.sm, left: Spacing.sm, right: Spacing.sm}}
              accessibilityLabel="关闭"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      );
    }

    const clampedPercent = Math.min(100, Math.max(0, completionPercent));

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.textArea}>
              <Text style={styles.title}>完善画像解锁个性化推荐</Text>
              <Text style={styles.percentText}>{clampedPercent}% 已完成</Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: Spacing.sm, bottom: Spacing.sm, left: Spacing.sm, right: Spacing.sm}}
              accessibilityLabel="关闭"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${clampedPercent}%` }]}
            />
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onContinue}
            activeOpacity={0.8}
            accessibilityLabel="继续完善"
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>继续完善</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

ProfileCompletionBanner.displayName = "ProfileCompletionBanner";

const useStyles = createStyles((colors) => ({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: Spacing.md,
    ...DesignTokens.shadows.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: DesignTokens.spacing[3],
  },
  textArea: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  percentText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  progressTrack: {
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: DesignTokens.spacing['3.5'],
    overflow: "hidden",
  },
  progressFill: {
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: DesignTokens.spacing['2.5'],
    paddingHorizontal: DesignTokens.spacing[5],
    alignSelf: "flex-start",
  },
  ctaText: {
    color: colors.textInverse,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  completeGradient: {
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...DesignTokens.shadows.sm,
  },
  completeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  completeIconCircle: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing[3],
  },
  completeTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.success,
    marginBottom: DesignTokens.spacing['0.5'],
  },
  completeSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
}))

export { ProfileCompletionBanner };
export type { ProfileCompletionBannerProps };


const styles = StyleSheet.create({
  container: { flex: 1 },
  completeGradient: { flex: 1 },
  completeContent: { flex: 1 },
  completeIconCircle: { flex: 1 },
  textArea: { flex: 1 },
  completeTitle: { flex: 1 },
  completeSubtitle: { flex: 1 },
  card: { flex: 1 },
  header: { flex: 1 },
  title: { flex: 1 },
  percentText: { flex: 1 },
  progressTrack: { flex: 1 },
  progressFill: { flex: 1 },
  ctaButton: { flex: 1 },
  ctaText: { flex: 1 },
});

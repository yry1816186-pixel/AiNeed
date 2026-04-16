import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';
import type { PhotoQualityResult, PhotoQualityIssue } from "../../../stores/photoStore";
import { DesignTokens , flatColors as colors } from '../../../design-system/theme';
import { Spacing } from '../../../../design-system/theme';


interface PhotoQualityFeedbackProps {
  qualityResult: PhotoQualityResult | null;
  onRetake: () => void;
  onContinue: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CIRCLE_SIZE = 100;

function getScoreColor(score: number): string {
  if (score > 70) {
    return colors.success;
  }
  if (score >= 40) {
    return colors.warning;
  }
  return colors.error;
}

function getIssueIcon(type: PhotoQualityIssue["type"]): keyof typeof Ionicons.glyphMap {
  const icons: Record<PhotoQualityIssue["type"], keyof typeof Ionicons.glyphMap> = {
    blur: "eye-off-outline",
    brightness: "sunny-outline",
    pose: "body-outline",
    occlusion: "hand-left-outline",
    background: "image-outline",
  };
  return icons[type];
}

function getSeverityColor(severity: PhotoQualityIssue["severity"]): string {
  const colors: Record<PhotoQualityIssue["severity"], string> = {
    low: colors.warning,
    medium: "colors.warning",
    high: colors.error,
  };
  return colors[severity];
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const color = getScoreColor(score);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[styles.scoreCircle, { borderColor: color, transform: [{ scale: animatedValue }] }]}
    >
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>质量分</Text>
    </Animated.View>
  );
};

const IssueItem: React.FC<{ issue: PhotoQualityIssue }> = ({ issue }) => (
  <View style={styles.issueItem}>
    <View
      style={[
        styles.issueIconContainer,
        { backgroundColor: getSeverityColor(issue.severity) + "20" },
      ]}
    >
      <Ionicons
        name={getIssueIcon(issue.type)}
        size={18}
        color={getSeverityColor(issue.severity)}
      />
    </View>
    <Text style={styles.issueText}>{issue.message}</Text>
  </View>
);

const PhotoQualityFeedback: React.FC<PhotoQualityFeedbackProps> = ({
  qualityResult,
  onRetake,
  onContinue,
}) => {
  const slideAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (qualityResult) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [qualityResult, slideAnim, opacityAnim]);

  if (!qualityResult) {
    return null;
  }

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
        <ScoreCircle score={qualityResult.score} />

        {qualityResult.isAcceptable ? (
          <View style={styles.acceptableContainer}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.acceptableText}>照片质量很好</Text>
          </View>
        ) : (
          <View style={styles.issuesContainer}>
            <Text style={styles.issuesTitle}>发现以下问题</Text>
            {qualityResult.issues.map((issue, index) => (
              <IssueItem key={`${issue.type}-${index}`} issue={issue} />
            ))}
          </View>
        )}

        <View style={styles.buttonContainer}>
          {!qualityResult.isAcceptable && (
            <TouchableOpacity style={styles.retakeButton} onPress={onRetake}>
              <Ionicons name="camera-outline" size={20} color={colors.surface} />
              <Text style={styles.retakeButtonText}>重拍</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.continueButton, qualityResult.isAcceptable && styles.continueButtonFull]}
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>
              {qualityResult.isAcceptable ? "继续" : "仍然继续"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: SCREEN_WIDTH - 64,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: "center",
  },
  scoreCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  scoreNumber: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: DesignTokens.spacing['0.5'],
  },
  acceptableContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: DesignTokens.spacing[5],
  },
  acceptableText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.success,
  },
  issuesContainer: {
    width: "100%",
    marginBottom: DesignTokens.spacing[5],
  },
  issuesTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: DesignTokens.spacing[3],
  },
  issueItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing['2.5'],
    gap: DesignTokens.spacing['2.5'],
  },
  issueIconContainer: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  issueText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: DesignTokens.spacing[3],
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    height: Spacing['2xl'],
    borderRadius: 12,
    backgroundColor: colors.textSecondary,
    justifyContent: "center",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
  },
  retakeButtonText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  continueButton: {
    flex: 1,
    height: Spacing['2xl'],
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonFull: {
    flex: 1,
  },
  continueButtonText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});

export default PhotoQualityFeedback;

import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../../design-system/theme';
import type { PhotoQualityResult, PhotoQualityIssue } from "../../../stores/photoStore";
import { DesignTokens } from "../../../design-system/theme";

interface PhotoQualityFeedbackProps {
  qualityResult: PhotoQualityResult | null;
  onRetake: () => void;
  onContinue: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CIRCLE_SIZE = 100;

function getScoreColor(score: number): string {
  if (score > 70) {
    return DesignTokens.colors.semantic.success;
  }
  if (score >= 40) {
    return DesignTokens.colors.semantic.warning;
  }
  return DesignTokens.colors.semantic.error;
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
    low: DesignTokens.colors.semantic.warning,
    medium: "DesignTokens.colors.semantic.warning",
    high: DesignTokens.colors.semantic.error,
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
            <Ionicons name="checkmark-circle" size={24} color={DesignTokens.colors.semantic.success} />
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
              <Ionicons name="camera-outline" size={20} color={DesignTokens.colors.backgrounds.primary} />
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
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  scoreCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: DesignTokens.typography.sizes['3xl'],
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  acceptableContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  acceptableText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.semantic.success,
  },
  issuesContainer: {
    width: "100%",
    marginBottom: 20,
  },
  issuesTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  issueItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  issueIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  issueText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.textSecondary,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  retakeButtonText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  continueButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonFull: {
    flex: 1,
  },
  continueButtonText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});

export default PhotoQualityFeedback;

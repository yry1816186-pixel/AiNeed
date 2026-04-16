import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { AiStylistProgress } from '../../../services/api/ai-stylist.api';

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

export interface AnalysisProgressProps {
  progress: AiStylistProgress;
}

const PROGRESS_STAGES = [
  { key: "uploading", label: "上传中", icon: "cloud-upload-outline" },
  { key: "analyzing", label: "分析中", icon: "analytics-outline" },
  { key: "processing", label: "处理中", icon: "cog-outline" },
  { key: "finalizing", label: "生成中", icon: "checkmark-circle-outline" },
];

interface AnimatedDotProps {
  dotValue: ReturnType<typeof useSharedValue<number>>;
}

const AnimatedDot: React.FC<AnimatedDotProps> = ({ dotValue }) => {
  const style = useAnimatedStyle(() => ({
    opacity: dotValue.value,
    transform: [{ scale: interpolate(dotValue.value, [0, 1], [1, 1.3]) }],
  }));
  return <AnimatedView style={[styles.dot, style]} />;
};

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ progress }) => {
  const pulseValue = useSharedValue(0);
  const dotValues = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const progressValue = useSharedValue(0);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1000,
          easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
        }),
        withTiming(0, {
          duration: 1000,
          easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
        })
      ),
      -1,
      true
    );

    dotValues.forEach((dot, index) => {
      dot.value = withDelay(
        index * 200,
        withRepeat(
          withSequence(withTiming(1, { duration: 400 }), withTiming(0, { duration: 400 })),
          -1,
          true
        )
      );
    });

    const etaMatch = progress.etaSeconds ? Math.max(0, 1 - progress.etaSeconds / 60) : 0.5;
    progressValue.value = withTiming(etaMatch, { duration: 500 });
  }, [progress.etaSeconds]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseValue.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(pulseValue.value, [0, 1], [1, 1.1]) }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const formatEta = (seconds?: number) => {
    if (!seconds) {
      return null;
    }
    if (seconds < 60) {
      return `约 ${seconds} 秒`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `约 ${minutes} 分钟`;
  };

  const getCurrentStageIndex = () => {
    const stageMap: Record<string, number> = {
      uploading: 0,
      analyzing: 1,
      processing: 2,
      finalizing: 3,
    };
    return stageMap[progress.stage] ?? 1;
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AnimatedView style={[styles.iconGlow, pulseStyle]}>
          <LinearGradient
            colors={[DesignTokens.colors.brand.sage, DesignTokens.colors.brand.camel]}
            style={styles.iconGradient}
          >
            <Ionicons name="analytics" size={28} color={DesignTokens.colors.text.inverse} />
          </LinearGradient>
        </AnimatedView>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{progress.title}</Text>
        <Text style={styles.detail}>{progress.detail}</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <AnimatedView style={[styles.progressFill, progressStyle]} />
          </View>
          {progress.etaSeconds && (
            <Text style={styles.etaText}>{formatEta(progress.etaSeconds)}</Text>
          )}
        </View>

        <View style={styles.stagesContainer}>
          {PROGRESS_STAGES.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;

            return (
              <View key={stage.key} style={styles.stageItem}>
                <View
                  style={[
                    styles.stageDot,
                    isActive && styles.stageDotActive,
                    isCompleted && styles.stageDotCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color={DesignTokens.colors.text.inverse} />
                  ) : (
                    <Ionicons
                      name={stage.icon}
                      size={12}
                      color={
                        isActive ? DesignTokens.colors.brand.sage : DesignTokens.colors.neutral[400]
                      }
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stageLabel,
                    isActive && styles.stageLabelActive,
                    isCompleted && styles.stageLabelCompleted,
                  ]}
                >
                  {stage.label}
                </Text>
                {index < PROGRESS_STAGES.length - 1 && (
                  <View style={[styles.stageLine, isCompleted && styles.stageLineCompleted]} />
                )}
              </View>
            );
          })}
        </View>

        {progress.canLeaveAndResume && (
          <View style={styles.hintContainer}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={DesignTokens.colors.neutral[500]}
            />
            <Text style={styles.hintText}>你可以离开，稍后回来查看结果</Text>
          </View>
        )}

        <View style={styles.loadingDots}>
          {dotValues.map((dotValue, index) => (
            <AnimatedDot key={index} dotValue={dotValue} />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    flexDirection: "row",
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGlow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: 4,
  },
  detail: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
    marginBottom: 12,
    lineHeight: 18,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: DesignTokens.colors.neutral[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: DesignTokens.colors.brand.sage,
    borderRadius: 3,
  },
  etaText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
    marginTop: 6,
    textAlign: "right",
  },
  stagesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  stageItem: {
    alignItems: "center",
    flex: 1,
  },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stageDotActive: {
    backgroundColor: DesignTokens.colors.brand.sage + "30",
    borderWidth: 2,
    borderColor: DesignTokens.colors.brand.sage,
  },
  stageDotCompleted: {
    backgroundColor: DesignTokens.colors.brand.sage,
  },
  stageLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.neutral[400],
    textAlign: "center",
  },
  stageLabelActive: {
    color: DesignTokens.colors.brand.sage,
    fontWeight: "600",
  },
  stageLabelCompleted: {
    color: DesignTokens.colors.brand.sage,
  },
  stageLine: {
    position: "absolute",
    top: 12,
    left: "60%",
    right: "-40%",
    height: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
    zIndex: -1,
  },
  stageLineCompleted: {
    backgroundColor: DesignTokens.colors.brand.sage,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DesignTokens.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  hintText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
    marginLeft: 6,
  },
  loadingDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.brand.sage,
  },
});

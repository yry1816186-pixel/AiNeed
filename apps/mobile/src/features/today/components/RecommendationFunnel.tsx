import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface FunnelBreakdown {
  totalCandidates: number;
  afterSceneFilter: number;
  afterSizeFilter: number;
  afterBudgetFilter: number;
  afterStyleFilter: number;
  afterWardrobeFilter: number;
  finalCount: number;
}

interface RecommendationFunnelProps {
  breakdown: FunnelBreakdown;
  visible?: boolean;
}

interface FunnelLayer {
  label: string;
  count: number;
  color: string;
  isFinal: boolean;
}

const LAYER_CONFIG = [
  { label: "全部候选", colorKey: "l1" as const },
  { label: "场景筛选", colorKey: "l2" as const },
  { label: "尺码筛选", colorKey: "l3" as const },
  { label: "预算筛选", colorKey: "l4" as const },
  { label: "风格筛选", colorKey: "l5" as const },
  { label: "衣橱互补", colorKey: "l6" as const },
];

function FunnelBar({ layer, maxCount }: { layer: FunnelLayer; maxCount: number }) {
  const widthPercent = maxCount > 0 ? (layer.count / maxCount) * 100 : 0;
  const progress = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withSpring(widthPercent / 100, {
      damping: 18,
      stiffness: 70,
    });

    if (layer.isFinal) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 1000 }), withTiming(1.0, { duration: 1000 })),
        -1,
        true
      );
    }
  }, [widthPercent, layer.isFinal]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const textColor = layer.isFinal
    ? DesignTokens.colors.neutral.white
    : DesignTokens.colors.neutral[800];
  const countColor = layer.isFinal
    ? DesignTokens.colors.neutral.white
    : DesignTokens.colors.brand.terracotta;

  return (
    <Animated.View style={[styles.barWrapper, layer.isFinal && pulseStyle]}>
      <View style={[styles.barTrack, { backgroundColor: DesignTokens.colors.neutral[100] }]}>
        <Animated.View style={[styles.barFill, { backgroundColor: layer.color }, barStyle]}>
          <View style={styles.barContent}>
            <Text style={[styles.barLabel, { color: textColor }]}>{layer.label}</Text>
            <Text style={[styles.barCount, { color: countColor }]}>{layer.count}</Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function RecommendationFunnel({ breakdown, visible = true }: RecommendationFunnelProps) {
  if (!visible || !breakdown) return null;

  const layers: FunnelLayer[] = useMemo(() => {
    const counts = [
      breakdown.totalCandidates,
      breakdown.afterSceneFilter,
      breakdown.afterSizeFilter,
      breakdown.afterBudgetFilter,
      breakdown.afterStyleFilter,
      breakdown.afterWardrobeFilter,
    ];

    return LAYER_CONFIG.map((config, index) => ({
      label: config.label,
      count: counts[index] ?? 0,
      color: DesignTokens.colors.funnel[config.colorKey],
      isFinal: index === 5,
    }));
  }, [breakdown]);

  const maxCount = Math.max(...layers.map((l) => l.count), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>推荐漏斗</Text>
      <View style={styles.funnelContainer}>
        {layers.map((layer) => (
          <FunnelBar key={layer.label} layer={layer} maxCount={maxCount} />
        ))}
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>最终推荐</Text>
        <Text style={styles.resultCount}>{breakdown.finalCount} 件</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: DesignTokens.colors.neutral[50],
    borderWidth: 1,
    borderColor: DesignTokens.colors.funnel.l1,
    borderRadius: DesignTokens.borderRadius.lg,
    marginHorizontal: 16,
    marginTop: 12,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[800],
    marginBottom: 12,
  },
  funnelContainer: {
    gap: 4,
  },
  barWrapper: {
    borderRadius: 8,
    overflow: "hidden",
  },
  barTrack: {
    height: 36,
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 8,
    minWidth: 80,
    overflow: "hidden",
  },
  barContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  barLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "400",
  },
  barCount: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.funnel.l1,
  },
  resultLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[600],
  },
  resultCount: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: DesignTokens.colors.brand.terracotta,
  },
});

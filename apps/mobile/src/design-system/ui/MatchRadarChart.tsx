import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Polygon,
  Circle,
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { DesignTokens } from "../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";
import {
  Colors,
  Typography as ThemeTypography,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
} from "../../design-system/theme";

export interface MatchScores {
  bodyType: number;
  occasion: number;
  color: number;
  style: number;
  budget: number;
}

export interface MatchRadarChartProps {
  scores: MatchScores;
  size?: number;
  showLabels?: boolean;
  showScoreList?: boolean;
  accentColor?: string;
}

const DIMENSIONS = [
  { key: "bodyType" as const, label: "体型" },
  { key: "occasion" as const, label: "场景" },
  { key: "color" as const, label: "色彩" },
  { key: "style" as const, label: "风格" },
  { key: "budget" as const, label: "预算" },
];

const ANGLES = [0, 72, 144, 216, 288];

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

function getScoreColor(value: number): string {
  if (value >= 80) {
    return "#4CAF50";
  }
  if (value >= 60) {
    return "#FF9800";
  }
  return "#F44336";
}

// Animated SVG components via Reanimated
const AnimatedPolygon = Animated.createAnimatedComponent(
  Polygon as React.ComponentType<React.ComponentProps<typeof Polygon>>
);
const AnimatedCircle = Animated.createAnimatedComponent(
  Circle as React.ComponentType<React.ComponentProps<typeof Circle>>
);

/**
 * Renders a single animated data point (dot) with glow effect.
 * Extracted to its own component so hooks are called at the top level.
 */
function AnimatedDataPoint({
  targetX,
  targetY,
  centerX,
  centerY,
  progress,
  terracotta,
}: {
  targetX: number;
  targetY: number;
  centerX: number;
  centerY: number;
  progress: Animated.SharedValue<number>;
  terracotta: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const p = progress.value;
    return {
      cx: centerX + (targetX - centerX) * p,
      cy: centerY + (targetY - centerY) * p,
    };
  });

  return (
    <>
      {/* Outer glow circle */}
      <AnimatedCircle animatedProps={animatedProps} r={6} fill={terracotta} opacity={0.2} />
      {/* Inner solid dot */}
      <AnimatedCircle
        animatedProps={animatedProps}
        r={3.5}
        fill={terracotta}
        opacity={0.85}
        stroke={terracotta}
        strokeWidth={1}
      />
    </>
  );
}

/**
 * Animated bar that fills from 0% to target width using a shared value.
 */
function AnimatedBar({
  animProgress,
  color,
}: {
  animProgress: Animated.SharedValue<number>;
  color: string;
}) {
  const animStyle = useAnimatedStyle(() => ({
    width: `${animProgress.value}%`,
  }));

  return <Animated.View style={[styles.scoreBarFill, { backgroundColor: color }, animStyle]} />;
}

/**
 * Animated score text that reveals with opacity as value grows.
 */
function AnimatedScoreText({
  animProgress,
  color,
}: {
  animProgress: Animated.SharedValue<number>;
  color: string;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: Math.min(animProgress.value / 50, 1),
  }));

  return <Animated.Text style={[styles.scoreValue, { color }, animStyle]}>{"%"}</Animated.Text>;
}

export const MatchRadarChart: React.FC<MatchRadarChartProps> = ({
  scores,
  size = 200,
  showLabels = true,
  showScoreList = true,
  accentColor,
}) => {
  const center = size / 2;
  const radius = size / 2 - 32;
  const accent = accentColor ?? Colors.primary[500];

  // Progress shared value: animates from 0 -> 1 on mount (grows from center)
  const progress = useSharedValue(0);

  // Animated score shared values (one per dimension, all at top level)
  const scoreBodyType = useSharedValue(0);
  const scoreOccasion = useSharedValue(0);
  const scoreColor = useSharedValue(0);
  const scoreStyle = useSharedValue(0);
  const scoreBudget = useSharedValue(0);

  const scoreSharedMap = useMemo(
    () => ({
      bodyType: scoreBodyType,
      occasion: scoreOccasion,
      color: scoreColor,
      style: scoreStyle,
      budget: scoreBudget,
    }),
    [scoreBodyType, scoreOccasion, scoreColor, scoreStyle, scoreBudget]
  );

  useEffect(() => {
    progress.value = withSpring(1, SpringConfigs.gentle);
    scoreBodyType.value = withTiming(scores.bodyType, { duration: 800 });
    scoreOccasion.value = withTiming(scores.occasion, { duration: 800 });
    scoreColor.value = withTiming(scores.color, { duration: 800 });
    scoreStyle.value = withTiming(scores.style, { duration: 800 });
    scoreBudget.value = withTiming(scores.budget, { duration: 800 });
  }, [progress, scores, scoreBodyType, scoreOccasion, scoreColor, scoreStyle, scoreBudget]);

  const overallScore = useMemo(() => {
    const vals = Object.values(scores) as number[];
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [scores]);

  const gridLevels = [20, 40, 60, 80, 100];

  const gridPolygons = useMemo(
    () =>
      gridLevels.map((level) =>
        ANGLES.map((a) => {
          const p = polarToCartesian(center, center, (radius * level) / 100, a);
          return `${p.x},${p.y}`;
        }).join(" ")
      ),
    [center, radius]
  );

  // Pre-compute target data polygon points (before progress scaling)
  const targetDataPoints = useMemo(
    () =>
      DIMENSIONS.map((dim, i) =>
        polarToCartesian(center, center, (radius * scores[dim.key]) / 100, ANGLES[i])
      ),
    [scores, center, radius]
  );

  // Animated data polygon: points scale by progress from center outward
  const animatedDataPoints = useAnimatedProps(() => {
    const p = progress.value;
    const pts = targetDataPoints
      .map((pt) => {
        const x = center + (pt.x - center) * p;
        const y = center + (pt.y - center) * p;
        return `${x},${y}`;
      })
      .join(" ");
    return { points: pts };
  });

  const axisLines = useMemo(
    () =>
      ANGLES.map((a) => {
        const p = polarToCartesian(center, center, radius, a);
        return { x1: center, y1: center, x2: p.x, y2: p.y };
      }),
    [center, radius]
  );

  const labelPositions = useMemo(
    () =>
      DIMENSIONS.map((dim, i) => {
        const p = polarToCartesian(center, center, radius + 20, ANGLES[i]);
        return { ...p, label: dim.label, value: scores[dim.key] };
      }),
    [scores, center, radius]
  );

  // Gradient colors from design tokens
  const terracotta = DesignTokens.colors.brand.terracotta;
  const camel = DesignTokens.colors.brand.camel;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgLinearGradient id="dataFill" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={terracotta} stopOpacity={0.3} />
              <Stop offset="1" stopColor={camel} stopOpacity={0.15} />
            </SvgLinearGradient>
            <SvgLinearGradient id="dataStroke" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={terracotta} stopOpacity={1} />
              <Stop offset="1" stopColor={camel} stopOpacity={1} />
            </SvgLinearGradient>
          </Defs>
          <G>
            {/* Grid levels - 5 concentric pentagons */}
            {gridPolygons.map((pts, i) => (
              <Polygon
                key={`grid-${i}`}
                points={pts}
                fill="none"
                stroke="#E0E0E0"
                strokeWidth={i === gridLevels.length - 1 ? 1.5 : 0.5}
              />
            ))}

            {/* Axis lines from center to each vertex */}
            {axisLines.map((line, i) => (
              <Line
                key={`axis-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#E0E0E0"
                strokeWidth={0.5}
              />
            ))}

            {/* Data polygon - animated from center outward */}
            <AnimatedPolygon
              animatedProps={animatedDataPoints}
              fill="url(#dataFill)"
              stroke="url(#dataStroke)"
              strokeWidth={2}
            />

            {/* Data points at vertices with glow effect */}
            {targetDataPoints.map((pt, i) => (
              <AnimatedDataPoint
                key={`dot-${i}`}
                targetX={pt.x}
                targetY={pt.y}
                centerX={center}
                centerY={center}
                progress={progress}
                terracotta={terracotta}
              />
            ))}

            {/* Dimension labels */}
            {showLabels &&
              labelPositions.map((lp, i) => (
                <SvgText
                  key={`label-${i}`}
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontSize={11}
                  fill={Colors.neutral[700]}
                  fontFamily={ThemeTypography.fontFamily.body.ios}
                >
                  {lp.label}
                </SvgText>
              ))}
          </G>
        </Svg>

        {/* Overall score badge */}
        <View style={[styles.overallBadge, { borderColor: accent }]}>
          <Text style={[styles.overallScore, { color: accent }]}>{overallScore}%</Text>
          <Text style={styles.overallLabel}>{"综合匹配"}</Text>
        </View>
      </View>

      {/* Score breakdown list with animated bars */}
      {showScoreList && (
        <View style={styles.scoreList}>
          {DIMENSIONS.map((dim) => {
            const value = scores[dim.key];
            const sharedVal = scoreSharedMap[dim.key];
            return (
              <View key={dim.key} style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{dim.label}</Text>
                <View style={styles.scoreBarBg}>
                  <AnimatedBar animProgress={sharedVal} color={getScoreColor(value)} />
                </View>
                <AnimatedScoreText animProgress={sharedVal} color={getScoreColor(value)} />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  chartWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  overallBadge: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: ThemeBorderRadius.full,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.neutral.white,
  },
  overallScore: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  overallLabel: {
    fontSize: 8,
    color: Colors.neutral[500],
    lineHeight: 10,
  },
  scoreList: {
    width: "100%",
    marginTop: ThemeSpacing[3],
    paddingHorizontal: ThemeSpacing[2],
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  scoreLabel: {
    width: 36,
    fontSize: ThemeTypography.sizes.xs,
    color: Colors.neutral[600],
  },
  scoreBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.neutral[200],
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scoreValue: {
    width: 36,
    fontSize: ThemeTypography.sizes.xs,
    fontWeight: "600",
    textAlign: "right",
  },
});

export default MatchRadarChart;

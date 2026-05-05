import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Text as SvgText, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { flatColors } from "../../../design-system/theme";
import { typography } from "../../../design-system/theme/tokens/typography";
import { spacing } from "../../../design-system/theme/tokens/spacing";
import { shadows } from "../../../design-system/theme/tokens/shadows";

export interface StyleDimension {
  label: string;
  value: number; // 0-100
}

export type StyleDnaData = StyleDimension[];

export interface StyleDnaRadarProps {
  data: StyleDnaData;
  size?: number;
}

const DEFAULT_DIMENSIONS: StyleDnaData = [
  { label: "经典", value: 65 },
  { label: "前卫", value: 48 },
  { label: "简约", value: 82 },
  { label: "华丽", value: 55 },
  { label: "休闲", value: 70 },
  { label: "正式", value: 42 },
];

const GRID_LEVELS = [0.25, 0.5, 0.75, 1.0];
const ANIMATION_DURATION = 1000;
const AXIS_STAGGER_MS = 120;

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

export const StyleDnaRadar: React.FC<StyleDnaRadarProps> = ({
  data = DEFAULT_DIMENSIONS,
  size = 280,
}) => {
  const { colors } = useTheme();
  const center = size / 2;
  const radius = size / 2 - 40;
  const dimCount = data.length;
  const angleStep = 360 / dimCount;

  const progress = useSharedValue(0);
  const [visibleAxes, setVisibleAxes] = useState(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: ANIMATION_DURATION });

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < dimCount; i++) {
      timers.push(
        setTimeout(() => setVisibleAxes((prev) => prev + 1), i * AXIS_STAGGER_MS)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [dimCount, progress]);

  const averageScore = useMemo(() => {
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return Math.round(sum / data.length);
  }, [data]);

  const gridPolygons = useMemo(
    () =>
      GRID_LEVELS.map((level) => {
        const points = Array.from({ length: dimCount }, (_, i) => {
          const angle = i * angleStep;
          const pt = polarToCartesian(center, center, radius * level, angle);
          return `${pt.x},${pt.y}`;
        }).join(" ");
        return points;
      }),
    [center, radius, dimCount, angleStep]
  );

  const axisLines = useMemo(
    () =>
      Array.from({ length: dimCount }, (_, i) => {
        const angle = i * angleStep;
        const pt = polarToCartesian(center, center, radius, angle);
        return { x1: center, y1: center, x2: pt.x, y2: pt.y };
      }),
    [center, radius, dimCount, angleStep]
  );

  const labelPositions = useMemo(
    () =>
      data.map((dim, i) => {
        const angle = i * angleStep;
        const labelRadius = radius + 22;
        const pt = polarToCartesian(center, center, labelRadius, angle);
        return { ...pt, label: dim.label };
      }),
    [data, center, radius, angleStep]
  );

  const targetDataPoints = useMemo(
    () =>
      data.map((dim, i) => {
        const angle = i * angleStep;
        return polarToCartesian(center, center, (radius * dim.value) / 100, angle);
      }),
    [data, center, radius, dimCount, angleStep]
  );

  const animatedDataProps = useAnimatedProps(() => {
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

  const brandTerracotta = flatColors.primary;
  const chartFill = colors.primaryLight;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        风格 DNA
      </Text>

      <View style={styles.chartWrapper}>
        <Svg width={size} height={size}>
          <G>
            {gridPolygons.map((pts, i) => (
              <Polygon
                key={`grid-${i}`}
                points={pts}
                fill="none"
                stroke={colors.border}
                strokeWidth={i === gridPolygons.length - 1 ? 1.5 : 0.5}
                opacity={0.6}
              />
            ))}

            {axisLines.map(
              (line, i) =>
                i < visibleAxes && (
                  <Line
                    key={`axis-${i}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={colors.border}
                    strokeWidth={0.5}
                  />
                )
            )}

            <AnimatedPolygon
              animatedProps={animatedDataProps}
              fill={chartFill}
              fillOpacity={0.3}
              stroke={brandTerracotta}
              strokeWidth={2}
            />

            {labelPositions.map(
              (lp, i) =>
                i < visibleAxes && (
                  <SvgText
                    key={`label-${i}`}
                    x={lp.x}
                    y={lp.y}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fontSize={11}
                    fontWeight="600"
                    fill={colors.textSecondary}
                  >
                    {lp.label}
                  </SvgText>
                )
            )}

            {visibleAxes === dimCount && (
              <SvgText
                x={center}
                y={center + 4}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={20}
                fontWeight="700"
                fill={brandTerracotta}
              >
                {averageScore}
              </SvgText>
            )}
          </G>
        </Svg>
      </View>

      <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
        综合风格指数
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginHorizontal: spacing.layout.screenPadding,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    marginBottom: spacing.layout.cardGap,
    ...shadows.presets.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  chartWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    marginTop: 4,
  },
});

export default StyleDnaRadar;

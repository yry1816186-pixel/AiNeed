/**
 * StyleEvolutionChart - Multi-line chart showing style evolution across 4 dimensions.
 *
 * Uses pure React Native Animated API (no external chart library).
 * Dimensions: commute, casual, formal, date_style
 * Colors derived from DesignTokens xuno palette.
 */
import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, Animated, type ViewStyle } from "react-native";

import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { createStyles } from "../../../shared/contexts/ThemeContext";
import { flatColors as colors } from "../../../design-system/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_PADDING_LEFT = 40;
const CHART_PADDING_RIGHT = 16;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT - 48;
const CHART_HEIGHT = 160;

const DIMENSION_CONFIG = [
  { key: "commute" as const, color: DesignTokens.colors.xuno.warmCamel, label: "通勤" },
  { key: "casual" as const, color: DesignTokens.colors.xuno.warmOrange, label: "休闲" },
  { key: "formal" as const, color: DesignTokens.colors.neutral[800], label: "正式" },
  { key: "date_style" as const, color: DesignTokens.colors.semantic.purple, label: "约会" },
];

export interface EvolutionDataPoint {
  date: string;
  commute: number;
  casual: number;
  formal: number;
  date_style: number;
}

export interface StyleEvolutionChartProps {
  data: EvolutionDataPoint[];
  height?: number;
  style?: any;
}

export const StyleEvolutionChart: React.FC<StyleEvolutionChartProps> = ({
  data,
  height = CHART_HEIGHT,
  style,
}) => {
  const styles = useStyles(colors);
  const lineAnimations = useMemo(() => DIMENSION_CONFIG.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    const animations = lineAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: index * 150,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, animations).start();
  }, [data]);

  const maxPoints = 7;
  const displayData = data.slice(-maxPoints);

  if (displayData.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>需要至少2天的数据才能展示风格曲线</Text>
      </View>
    );
  }

  const xStep = CHART_WIDTH / (displayData.length - 1);

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <View style={[styles.container, style]}>
      {/* Y-axis labels */}
      <View style={[styles.yAxis, { height }]}>
        {yLabels.map((label) => (
          <Text key={label} style={styles.yLabel}>
            {label.toFixed(1)}
          </Text>
        ))}
      </View>

      {/* Chart area */}
      <View style={[styles.chartArea, { height, width: CHART_WIDTH }]}>
        {/* Grid lines */}
        {yLabels.map((_, index) => (
          <View
            key={index}
            style={[
              styles.gridLine,
              {
                bottom: (index / (yLabels.length - 1)) * height,
                width: CHART_WIDTH,
              },
            ]}
          />
        ))}

        {/* Lines for each dimension */}
        {DIMENSION_CONFIG.map((dim, dimIndex) => {
          const points = displayData.map((point, pointIndex) => ({
            x: pointIndex * xStep,
            y: height - (point[dim.key] ?? 0) * height,
          }));

          const pathData = generatePathData(points);

          return (
            <Animated.View
              key={dim.key}
              style={[
                styles.lineContainer,
                {
                  opacity: lineAnimations[dimIndex],
                  transform: [
                    {
                      translateY: lineAnimations[dimIndex].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* SVG-like path using positioned dots and connecting lines */}
              {points.map((point, pointIndex) => {
                const nextPoint = points[pointIndex + 1];
                const lineLength = nextPoint
                  ? Math.sqrt(
                      Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                    )
                  : 0;
                const angle = nextPoint
                  ? (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) / Math.PI
                  : 0;

                return (
                  <React.Fragment key={pointIndex}>
                    {/* Connecting line */}
                    {nextPoint && (
                      <View
                        style={{
                          position: "absolute",
                          left: point.x,
                          top: point.y,
                          width: lineLength,
                          height: 2,
                          backgroundColor: dim.color,
                          transform: [{ rotate: `${angle}deg` }],
                          transformOrigin: "0 50%",
                          borderRadius: 1,
                        }}
                      />
                    )}
                    {/* Data point */}
                    <View
                      style={{
                        position: "absolute",
                        left: point.x - 4,
                        top: point.y - 4,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: dim.color,
                        borderWidth: 2,
                        borderColor: colors.surface,
                      }}
                    />
                  </React.Fragment>
                );
              })}
            </Animated.View>
          );
        })}

        {/* X-axis date labels */}
        <View style={[styles.xAxis, { width: CHART_WIDTH }]}>
          {displayData.map((point, index) => {
            const dateStr = point.date.slice(5); // MM-DD
            return (
              <Text key={index} style={[styles.xLabel, { left: index * xStep - 16 }]}>
                {dateStr}
              </Text>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {DIMENSION_CONFIG.map((dim) => (
          <View key={dim.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: dim.color }]} />
            <Text style={styles.legendText}>{dim.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

function generatePathData(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

const useStyles = createStyles((themeColors) => ({
  container: {
    flexDirection: "row",
    paddingRight: CHART_PADDING_RIGHT,
  },
  yAxis: {
    width: CHART_PADDING_LEFT - 8,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  yLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[400],
    fontWeight: "400",
  },
  chartArea: {
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    height: StyleSheet.hairlineWidth,
    backgroundColor: themeColors.neutral[200],
  },
  lineContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  xAxis: {
    position: "absolute",
    bottom: -20,
    flexDirection: "row",
  },
  xLabel: {
    position: "absolute",
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[400],
    width: 32,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: themeColors.neutral[500],
    fontWeight: "500",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: themeColors.neutral[50],
    borderRadius: 12,
  },
  emptyText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: themeColors.neutral[400],
  },
}));

export default StyleEvolutionChart;

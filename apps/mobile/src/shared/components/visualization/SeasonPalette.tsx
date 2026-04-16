import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Svg,
  Circle,
  Path,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Colors, Spacing, BorderRadius, Typography , DesignTokens } from '../../../design-system/theme'

export interface SeasonPaletteProps {
  season: string;
  bestColors: string[];
  avoidColors?: string[];
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function getSeasonHueRange(season: string): [number, number] {
  const base = season.split("_")[0];
  switch (base) {
    case "spring":
      return [0, 90];
    case "summer":
      return [180, 270];
    case "autumn":
      return [0, 60];
    case "winter":
      return [180, 270];
    default:
      return [0, 360];
  }
}

function hueToPoint(hue: number, radius: number, cx: number, cy: number): { x: number; y: number } {
  const rad = ((hue - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = hueToPoint(startAngle, r, cx, cy);
  const end = hueToPoint(endAngle, r, cx, cy);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const BRAND_TERRACOTTA = Colors.primary[500];
const BRAND_TERRACOTTA_ALPHA_35 = `rgba(198,123,92,0.35)`;
const AVOID_STROKE = `rgba(255,59,48,0.6)`;
const TEXT_DARK = Colors.neutral[900];
const TEXT_MUTED = Colors.neutral[500];

export const SeasonPalette: React.FC<SeasonPaletteProps> = ({
  season,
  bestColors,
  avoidColors,
}) => {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 90;
  const innerRadius = 70;

  const wheelSegments = useMemo(() => {
    const segments: { hue: number; color: string }[] = [];
    for (let hue = 0; hue < 360; hue += 10) {
      segments.push({
        hue,
        color: `hsl(${hue}, 80%, 55%)`,
      });
    }
    return segments;
  }, []);

  const colorMarkers = useMemo(() => {
    return bestColors.slice(0, 8).map((hex, i) => {
      const hsl = hexToHsl(hex);
      const pos = hueToPoint(hsl.h, outerRadius + 14, cx, cy);
      return { ...pos, hex, index: i, hue: hsl.h };
    });
  }, [bestColors, cx, cy]);

  const avoidMarkers = useMemo(() => {
    if (!avoidColors) {
      return [];
    }
    return avoidColors.slice(0, 4).map((hex, i) => {
      const hsl = hexToHsl(hex);
      const pos = hueToPoint(hsl.h, outerRadius + 14, cx, cy);
      return { ...pos, hex, index: i, hue: hsl.h };
    });
  }, [avoidColors, cx, cy]);

  const harmonyArcs = useMemo(() => {
    const arcs: { start: { x: number; y: number }; end: { x: number; y: number }; key: string }[] =
      [];
    for (let i = 0; i < colorMarkers.length; i++) {
      for (let j = i + 1; j < colorMarkers.length; j++) {
        const hueDiff = Math.abs(colorMarkers[i].hue - colorMarkers[j].hue);
        if (hueDiff < 60 || hueDiff > 300) {
          arcs.push({
            start: colorMarkers[i],
            end: colorMarkers[j],
            key: `arc-${i}-${j}`,
          });
        }
      }
    }
    return arcs;
  }, [colorMarkers]);

  const seasonRange = getSeasonHueRange(season);
  const seasonArcPath = describeArc(cx, cy, innerRadius - 4, seasonRange[0], seasonRange[1]);

  const baseSeason = season.split("_")[0];
  const seasonLabel =
    Colors.colorSeasons[baseSeason as keyof typeof Colors.colorSeasons]?.label ?? season;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>色彩轮盘</Text>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgLinearGradient id="seasonHighlight" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={BRAND_TERRACOTTA} stopOpacity="0.3" />
            <Stop offset="1" stopColor={BRAND_TERRACOTTA} stopOpacity="0.08" />
          </SvgLinearGradient>
        </Defs>

        {wheelSegments.map((seg) => {
          const startRad = ((seg.hue - 90 - 5) * Math.PI) / 180;
          const endRad = ((seg.hue - 90 + 5) * Math.PI) / 180;
          const x1Outer = cx + outerRadius * Math.cos(startRad);
          const y1Outer = cy + outerRadius * Math.sin(startRad);
          const x2Outer = cx + outerRadius * Math.cos(endRad);
          const y2Outer = cy + outerRadius * Math.sin(endRad);
          const x1Inner = cx + innerRadius * Math.cos(endRad);
          const y1Inner = cy + innerRadius * Math.sin(endRad);
          const x2Inner = cx + innerRadius * Math.cos(startRad);
          const y2Inner = cy + innerRadius * Math.sin(startRad);

          const d = `M ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 0 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 0 0 ${x2Inner} ${y2Inner} Z`;

          return <Path key={`seg-${seg.hue}`} d={d} fill={seg.color} opacity={0.7} />;
        })}

        <Path
          d={seasonArcPath}
          stroke={BRAND_TERRACOTTA}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          opacity={0.8}
        />

        {harmonyArcs.map((arc) => (
          <Path
            key={arc.key}
            d={`M ${arc.start.x} ${arc.start.y} L ${arc.end.x} ${arc.end.y}`}
            stroke={BRAND_TERRACOTTA_ALPHA_35}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        ))}

        {colorMarkers.map((marker, i) => (
          <G key={`best-${i}`}>
            <Circle
              cx={marker.x}
              cy={marker.y}
              r={7}
              fill={marker.hex}
              stroke={Colors.neutral.white}
              strokeWidth={2}
            />
          </G>
        ))}

        {avoidMarkers.map((marker, i) => (
          <G key={`avoid-${i}`}>
            <Circle
              cx={marker.x}
              cy={marker.y}
              r={5}
              fill={marker.hex}
              stroke={AVOID_STROKE}
              strokeWidth={1.5}
            />
          </G>
        ))}

        <Circle cx={cx} cy={cy} r={innerRadius - 12} fill={Colors.neutral.white} opacity={0.9} />
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={13}
          fontWeight="600"
          fill={TEXT_DARK}
        >
          {seasonLabel}
        </SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill={TEXT_MUTED}>
          {colorMarkers.length} 色
        </SvgText>
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: BRAND_TERRACOTTA }]} />
          <Text style={styles.legendText}>季型色域</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: Colors.semantic.success,
                borderWidth: 2,
                borderColor: Colors.neutral.white,
              },
            ]}
          />
          <Text style={styles.legendText}>推荐色</Text>
        </View>
        {avoidColors && avoidColors.length > 0 && (
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: Colors.semantic.error,
                  borderWidth: 1.5,
                  borderColor: AVOID_STROKE,
                },
              ]}
            />
            <Text style={styles.legendText}>避免色</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
  },
  title: {
    ...Typography.styles.h4,
    color: Colors.neutral[900],
    marginBottom: Spacing.sm,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
  },
  legendDot: {
    width: DesignTokens.spacing['2.5'],
    height: DesignTokens.spacing['2.5'],
    borderRadius: 5,
  },
  legendText: {
    ...Typography.caption.xs,
    color: Colors.neutral[500],
  },
});

export default SeasonPalette;

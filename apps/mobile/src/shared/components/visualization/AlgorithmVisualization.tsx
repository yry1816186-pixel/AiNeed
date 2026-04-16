import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";

import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as _Haptics from "@/src/polyfills/expo-haptics";
import Svg, {
  Circle,
  Path,
  G,
  Defs,
  Stop,
  LinearGradient as SvgLinearGradient,
  Text as SvgText,
  Polygon,
  Line,
} from "react-native-svg";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
  useAnimatedProps,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors , Spacing } from '../../../design-system/theme'
import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../contexts/ThemeContext';

const { width: _SCREEN_WIDTH } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedCircle = AnimatedReanimated.createAnimatedComponent(Circle);
const AnimatedPath = AnimatedReanimated.createAnimatedComponent(Path);
const _AnimatedPolygon = AnimatedReanimated.createAnimatedComponent(Polygon);

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

const BreakdownItem: React.FC<{
  item: { label: string; score: number; weight: number };
  index: number;
  getScoreColor: (score: number) => string;
}> = ({ item, index, getScoreColor }) => {
  const itemWidth = useSharedValue(0);

  useEffect(() => {
    itemWidth.value = withDelay(400 + index * 100, withSpring(item.score, springConfig));
  }, []);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${itemWidth.value}%`,
  }));

  return (
    <View style={styles.breakdownItem}>
      <View style={styles.breakdownHeader}>
        <Text style={styles.breakdownLabel}>{item.label}</Text>
        <Text style={styles.breakdownScore}>{item.score}%</Text>
      </View>
      <View style={styles.breakdownBar}>
        <AnimatedView
          style={[
            styles.breakdownFill,
            { backgroundColor: getScoreColor(item.score) },
            barAnimatedStyle,
          ]}
        />
      </View>
    </View>
  );
};

const ColorBarRow: React.FC<{
  colorItem: { color: string; name: string; percentage: number };
  index: number;
  showAnimation: boolean;
}> = ({ colorItem, index, showAnimation }) => {
  const barWidth = useSharedValue(0);
  const barOpacity = useSharedValue(0);

  useEffect(() => {
    if (showAnimation) {
      barOpacity.value = withDelay(index * 80, withTiming(1, { duration: 200 }));
      barWidth.value = withDelay(index * 80, withSpring(colorItem.percentage, springConfig));
    } else {
      barOpacity.value = 1;
      barWidth.value = colorItem.percentage;
    }
  }, [showAnimation]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
    opacity: barOpacity.value,
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }));

  return (
    <View style={styles.colorBarRow}>
      <AnimatedView
        style={[styles.colorDot, { backgroundColor: colorItem.color }, dotAnimatedStyle]}
      />
      <View style={styles.colorBarInfo}>
        <View style={styles.colorBarHeader}>
          <Text style={styles.colorName}>{colorItem.name}</Text>
          <Text style={styles.colorPercentage}>{colorItem.percentage}%</Text>
        </View>
        <View style={styles.colorBarTrack}>
          <AnimatedView
            style={[styles.colorBarFill, { backgroundColor: colorItem.color }, barAnimatedStyle]}
          />
        </View>
      </View>
    </View>
  );
};

const ColorSwatchItem: React.FC<{
  colorItem: { color: string; name: string; percentage: number };
  index: number;
  baseDelay: number;
}> = ({ colorItem, index, baseDelay }) => {
  const swatchScale = useSharedValue(0);

  useEffect(() => {
    swatchScale.value = withDelay(baseDelay + index * 50, withSpring(1, springConfig));
  }, []);

  const swatchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: swatchScale.value }],
  }));

  return (
    <AnimatedView
      style={[styles.colorSwatch, { backgroundColor: colorItem.color }, swatchAnimatedStyle]}
    >
      <Text style={styles.colorSwatchHex}>{colorItem.color}</Text>
    </AnimatedView>
  );
};

const MeasurementItem: React.FC<{
  label: string;
  value: number;
  index: number;
}> = ({ label, value, index }) => {
  const itemOpacity = useSharedValue(0);
  const itemTranslateY = useSharedValue(20);

  useEffect(() => {
    itemOpacity.value = withDelay(400 + index * 100, withTiming(1, { duration: 300 }));
    itemTranslateY.value = withDelay(400 + index * 100, withSpring(0, springConfig));
  }, []);

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
    transform: [{ translateY: itemTranslateY.value }],
  }));

  return (
    <AnimatedView style={[styles.measurementItem, itemAnimatedStyle]}>
      <Text style={styles.measurementLabel}>{label}</Text>
      <Text style={styles.measurementValue}>{value}</Text>
      <Text style={styles.measurementUnit}>cm</Text>
    </AnimatedView>
  );
};

const RecommendationItem: React.FC<{ rec: string; index: number }> = ({ rec, index }) => {
  const recOpacity = useSharedValue(0);

  useEffect(() => {
    recOpacity.value = withDelay(800 + index * 100, withTiming(1, { duration: 300 }));
  }, []);

  const recAnimatedStyle = useAnimatedStyle(() => ({
    opacity: recOpacity.value,
  }));

  return (
    <AnimatedView style={[styles.recommendationItem, recAnimatedStyle]}>
      <View style={styles.recommendationDot} />
      <Text style={styles.recommendationText}>{rec}</Text>
    </AnimatedView>
  );
};

const ItemPreviewCard: React.FC<{
  item: { id: string; name: string; image: string; category: string };
  index: number;
  isSelected: boolean;
  onPress: () => void;
}> = ({ item, index, isSelected, onPress }) => {
  const itemScale = useSharedValue(0);

  useEffect(() => {
    itemScale.value = withDelay(index * 100, withSpring(1, springConfig));
  }, []);

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: itemScale.value }],
  }));

  return (
    <AnimatedView style={itemAnimatedStyle}>
      <TouchableOpacity
        style={[styles.itemPreview, isSelected && styles.itemPreviewSelected]}
        onPress={onPress}
      >
        <Image source={{ uri: item.image }} style={styles.itemPreviewImage} />
        <Text style={styles.itemPreviewName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </AnimatedView>
  );
};

const AnalysisBarItem: React.FC<{
  label: string;
  value: number;
  index: number;
  getScoreColor: (score: number) => string;
}> = ({ label, value, index, getScoreColor }) => {
  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withDelay(500 + index * 100, withSpring(value, springConfig));
  }, []);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <View style={styles.analysisItem}>
      <Text style={styles.analysisLabel}>{label}</Text>
      <View style={styles.analysisBar}>
        <AnimatedView
          style={[styles.analysisFill, { backgroundColor: getScoreColor(value) }, barAnimatedStyle]}
        />
      </View>
      <Text style={[styles.analysisValue, { color: getScoreColor(value) }]}>{value}%</Text>
    </View>
  );
};

export interface MatchScoreProps {
  score: number;
  size?: "small" | "medium" | "large";
  label?: string;
  showAnimation?: boolean;
  breakdown?: {
    label: string;
    score: number;
    weight: number;
  }[];
  style?: ViewStyle;
}

export const MatchScore: React.FC<MatchScoreProps> = ({
  score,
  size = "medium",
  label,
  showAnimation = true,
  breakdown,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const animatedScore = useSharedValue(0);
  const animatedProgress = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);

  const sizeConfig = {
    small: { circleSize: 80, strokeWidth: 6, fontSize: DesignTokens.typography.sizes['2xl'], labelSize: 10 },
    medium: { circleSize: 120, strokeWidth: 8, fontSize: DesignTokens.typography.sizes['3xl'], labelSize: 12 },
    large: { circleSize: 160, strokeWidth: 10, fontSize: DesignTokens.typography.sizes['5xl'], labelSize: 14 },
  };

  const config = sizeConfig[size];
  const radius = (config.circleSize - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (showAnimation) {
      scale.value = withSpring(1, springConfig);
      animatedProgress.value = withDelay(200, withSpring(score, { damping: 12, stiffness: 80 }));
      animatedScore.value = withDelay(200, withTiming(score, { duration: 1500 }));

      if (score >= 80) {
        glowOpacity.value = withDelay(
          800,
          withRepeat(
            withSequence(withTiming(1, { duration: 1000 }), withTiming(0.5, { duration: 1000 })),
            -1,
            true
          )
        );
      }
    } else {
      animatedProgress.value = score;
      animatedScore.value = score;
      scale.value = 1;
    }
  }, [score, showAnimation]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getScoreColor = (value: number) => {
    if (value >= 90) {
      return colors.success; // custom color
    }
    if (value >= 75) {
      return colors.neutral[300];
    }
    if (value >= 60) {
      return colors.warning; // custom color
    }
    return colors.error; // custom color
  };

  const scoreColor = getScoreColor(score);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value / 100);
    return {
      strokeDashoffset,
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <AnimatedView style={[styles.matchContainer, containerAnimatedStyle, style]}>
      <View style={{ width: config.circleSize, height: config.circleSize }}>
        <Svg width={config.circleSize} height={config.circleSize}>
          <Defs>
            <SvgLinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={scoreColor} />
              <Stop
                offset="100%"
                stopColor={score === animatedProgress.value ? scoreColor : colors.neutral[300]}
              />
            </SvgLinearGradient>
          </Defs>

          <Circle
            cx={config.circleSize / 2}
            cy={config.circleSize / 2}
            r={radius}
            stroke={Colors.neutral[200]}
            strokeWidth={config.strokeWidth}
            fill="transparent"
          />

          <AnimatedCircle
            cx={config.circleSize / 2}
            cy={config.circleSize / 2}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={config.strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${config.circleSize / 2} ${config.circleSize / 2})`}
          />
        </Svg>

        <View
          style={[styles.scoreContent, { width: config.circleSize, height: config.circleSize }]}
        >
          <Text style={[styles.scoreValue, { fontSize: config.fontSize, color: scoreColor }]}>
            {Math.round(animatedScore.value)}%
          </Text>
          {label && (
            <Text style={[styles.scoreLabel, { fontSize: config.labelSize }]}>{label}</Text>
          )}
        </View>

        {score >= 80 && (
          <AnimatedView
            style={[
              styles.glowRing,
              glowAnimatedStyle,
              {
                width: config.circleSize + 20,
                height: config.circleSize + 20,
                borderRadius: (config.circleSize + 20) / 2,
                borderColor: scoreColor,
              },
            ]}
          />
        )}
      </View>

      {breakdown && breakdown.length > 0 && (
        <View style={styles.breakdownContainer}>
          {breakdown.map((item, index) => (
            <BreakdownItem
              key={item.label}
              item={item}
              index={index}
              getScoreColor={getScoreColor}
            />
          ))}
        </View>
      )}
    </AnimatedView>
  );
};

export interface StyleRadarChartProps {
  dimensions: {
    label: string;
    value: number;
    maxValue?: number;
  }[];
  size?: number;
  showLabels?: boolean;
  showAnimation?: boolean;
  style?: ViewStyle;
}

export const StyleRadarChart: React.FC<StyleRadarChartProps> = ({
  dimensions,
  size = 200,
  showLabels = true,
  showAnimation = true,
  style,
}) => {
  const animatedProgress = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const levels = 5;

  useEffect(() => {
    if (showAnimation) {
      scale.value = withSpring(1, springConfig);
      animatedProgress.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 80 }));
    } else {
      animatedProgress.value = 1;
      scale.value = 1;
    }
  }, [showAnimation]);

  const angleStep = (2 * Math.PI) / dimensions.length;

  const getPoint = (index: number, value: number, max: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / max) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  };

  const generatePath = (values: number[], maxValues: number[]) => {
    return (
      values
        .map((value, index) => {
          const point = getPoint(index, value, maxValues[index]);
          return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
        })
        .join(" ") + " Z"
    );
  };

  const maxValues = dimensions.map((d) => d.maxValue || 100);
  const values = dimensions.map((d) => d.value);

  const animatedProps = useAnimatedProps(() => {
    const animatedValues = values.map((v) => v * animatedProgress.value);
    const path = generatePath(animatedValues, maxValues);
    return { d: path };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={[styles.radarContainer, containerAnimatedStyle, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.neutral[300]} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.neutral[700]} stopOpacity="0.6" />
          </SvgLinearGradient>
        </Defs>

        {Array.from({ length: levels }).map((_, levelIndex) => {
          const levelRadius = (radius * (levelIndex + 1)) / levels;
          const points = dimensions
            .map((_, dimIndex) => {
              const angle = dimIndex * angleStep - Math.PI / 2;
              return `${centerX + levelRadius * Math.cos(angle)},${
                centerY + levelRadius * Math.sin(angle)
              }`;
            })
            .join(" ");

          return (
            <Polygon
              key={levelIndex}
              points={points}
              fill="transparent"
              stroke={Colors.neutral[200]}
              strokeWidth={1}
              opacity={levelIndex === levels - 1 ? 0.5 : 0.3}
            />
          );
        })}

        {dimensions.map((_, index) => {
          const angle = index * angleStep - Math.PI / 2;
          const endX = centerX + radius * Math.cos(angle);
          const endY = centerY + radius * Math.sin(angle);

          return (
            <Line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke={Colors.neutral[200]}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        <AnimatedPath
          animatedProps={animatedProps}
          fill="url(#radarGradient)"
          stroke={colors.neutral[300]}
          strokeWidth={2}
        />

        {dimensions.map((dim, index) => {
          const point = getPoint(index, dim.value, dim.maxValue || 100);
          return (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={5}
              fill={colors.neutral[300]}
              stroke={colors.surface}
              strokeWidth={2}
            />
          );
        })}

        {showLabels &&
          dimensions.map((dim, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const labelRadius = radius + 25;
            const labelX = centerX + labelRadius * Math.cos(angle);
            const labelY = centerY + labelRadius * Math.sin(angle);

            return (
              <SvgText
                key={index}
                x={labelX}
                y={labelY}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={11}
                fill={Colors.neutral[600]}
                fontWeight="500"
              >
                {dim.label}
              </SvgText>
            );
          })}
      </Svg>
    </AnimatedView>
  );
};

export interface ColorPaletteAnalysisProps {
  colors: {
    color: string;
    name: string;
    percentage: number;
    category?: "primary" | "secondary" | "accent";
  }[];
  title?: string;
  showAnimation?: boolean;
  style?: ViewStyle;
}

export const ColorPaletteAnalysis: React.FC<ColorPaletteAnalysisProps> = ({
  colors,
  title,
  showAnimation = true,
  style,
}) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (showAnimation) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, springConfig);
    } else {
      opacity.value = 1;
      scale.value = 1;
    }
  }, [showAnimation]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={[styles.colorPaletteContainer, containerAnimatedStyle, style]}>
      {title && <Text style={styles.colorPaletteTitle}>{title}</Text>}

      <View style={styles.colorBarsContainer}>
        {colors.map((colorItem, index) => (
          <ColorBarRow
            key={index}
            colorItem={colorItem}
            index={index}
            showAnimation={showAnimation}
          />
        ))}
      </View>

      <View style={styles.colorSwatches}>
        {colors.map((colorItem, index) => (
          <ColorSwatchItem
            key={index}
            colorItem={colorItem}
            index={index}
            baseDelay={colors.length * 80}
          />
        ))}
      </View>
    </AnimatedView>
  );
};

export interface BodyShapeAnalysisProps {
  measurements: {
    shoulder: number;
    bust: number;
    waist: number;
    hip: number;
  };
  bodyType: string;
  recommendations: string[];
  showAnimation?: boolean;
  style?: ViewStyle;
}

export const BodyShapeAnalysis: React.FC<BodyShapeAnalysisProps> = ({
  measurements,
  bodyType,
  recommendations,
  showAnimation = true,
  style,
}) => {
  const scale = useSharedValue(0.9);
  const bodyOpacity = useSharedValue(0);
  const highlightScale = useSharedValue(1);

  useEffect(() => {
    if (showAnimation) {
      scale.value = withSpring(1, springConfig);
      bodyOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

      highlightScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
    } else {
      scale.value = 1;
      bodyOpacity.value = 1;
    }
  }, [showAnimation]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
  }));

  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: highlightScale.value }],
  }));

  const maxMeasurement = Math.max(...Object.values(measurements));
  const normalizedMeasurements = {
    shoulder: (measurements.shoulder / maxMeasurement) * 100,
    bust: (measurements.bust / maxMeasurement) * 100,
    waist: (measurements.waist / maxMeasurement) * 100,
    hip: (measurements.hip / maxMeasurement) * 100,
  };

  return (
    <AnimatedView style={[styles.bodyAnalysisContainer, containerAnimatedStyle, style]}>
      <View style={styles.bodyVisualContainer}>
        <AnimatedView style={[styles.bodyVisual, bodyAnimatedStyle]}>
          <View style={styles.bodyOutline}>
            <View
              style={[
                styles.bodyPart,
                styles.shoulder,
                { width: `${normalizedMeasurements.shoulder}%` },
              ]}
            />
            <View
              style={[styles.bodyPart, styles.bust, { width: `${normalizedMeasurements.bust}%` }]}
            />
            <View
              style={[styles.bodyPart, styles.waist, { width: `${normalizedMeasurements.waist}%` }]}
            />
            <View
              style={[styles.bodyPart, styles.hip, { width: `${normalizedMeasurements.hip}%` }]}
            />
          </View>

          <AnimatedView style={[styles.bodyTypeHighlight, highlightAnimatedStyle]}>
            <LinearGradient colors={[colors.neutral[300], colors.neutral[700]]} style={styles.bodyTypeGradient}>
              <Text style={styles.bodyTypeText}>{bodyType}</Text>
            </LinearGradient>
          </AnimatedView>
        </AnimatedView>
      </View>

      <View style={styles.measurementsGrid}>
        {Object.entries(measurements).map(([key, value], index) => {
          const labels: Record<string, string> = {
            shoulder: "肩宽",
            bust: "胸围",
            waist: "腰围",
            hip: "臀围",
          };

          return <MeasurementItem key={key} label={labels[key]} value={value} index={index} />;
        })}
      </View>

      <View style={styles.recommendationsContainer}>
        <Text style={styles.recommendationsTitle}>穿搭建议</Text>
        {recommendations.map((rec, index) => (
          <RecommendationItem key={index} rec={rec} index={index} />
        ))}
      </View>
    </AnimatedView>
  );
};

export interface OutfitCompatibilityProps {
  items: {
    id: string;
    name: string;
    image: string;
    category: string;
  }[];
  compatibilityScore: number;
  analysis: {
    colorHarmony: number;
    styleMatch: number;
    occasionFit: number;
    seasonMatch: number;
  };
  suggestions: string[];
  style?: ViewStyle;
}

export const OutfitCompatibility: React.FC<OutfitCompatibilityProps> = ({
  items,
  compatibilityScore,
  analysis,
  suggestions,
  style,
}) => {
  const scale = useSharedValue(0.9);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    scale.value = withSpring(1, springConfig);
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getScoreColor = (score: number) => {
    if (score >= 80) {
      return colors.success; // custom color
    }
    if (score >= 60) {
      return colors.neutral[300];
    }
    if (score >= 40) {
      return colors.warning; // custom color
    }
    return colors.error; // custom color
  };

  return (
    <AnimatedView style={[styles.compatibilityContainer, containerAnimatedStyle, style]}>
      <View style={styles.itemsPreview}>
        {items.map((item, index) => (
          <ItemPreviewCard
            key={item.id}
            item={item}
            index={index}
            isSelected={selectedItem === item.id}
            onPress={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
          />
        ))}
      </View>

      <View style={styles.scoreOverview}>
        <MatchScore score={compatibilityScore} size="medium" label="搭配契合度" showAnimation />
      </View>

      <View style={styles.analysisGrid}>
        {Object.entries(analysis).map(([key, value], index) => {
          const labels: Record<string, string> = {
            colorHarmony: "色彩协调",
            styleMatch: "风格匹配",
            occasionFit: "场合适配",
            seasonMatch: "季节适宜",
          };

          return (
            <AnalysisBarItem
              key={key}
              label={labels[key]}
              value={value}
              index={index}
              getScoreColor={getScoreColor}
            />
          );
        })}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>优化建议</Text>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Ionicons name="bulb" size={16} color={colors.warning} /* custom color */ />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}
    </AnimatedView>
  );
};

export interface TrendIndicatorProps {
  trend: "up" | "down" | "stable";
  value: number;
  label: string;
  period?: string;
  style?: ViewStyle;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  value,
  label,
  period,
  style,
}) => {
  const scale = useSharedValue(0.8);
  const arrowTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springConfig);

    if (trend !== "stable") {
      arrowTranslateY.value = withRepeat(
        withSequence(
          withTiming(trend === "up" ? -5 : 5, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [trend]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: arrowTranslateY.value }],
  }));

  const trendColors = {
    up: colors.success, // custom color
    down: colors.error, // custom color
    stable: Colors.neutral[500],
  };

  const trendIcons = {
    up: "trending-up",
    down: "trending-down",
    stable: "remove",
  };

  return (
    <AnimatedView style={[styles.trendContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.trendIcon, arrowAnimatedStyle]}>
        <Ionicons name={trendIcons[trend]} size={24} color={trendColors[trend]} />
      </AnimatedView>
      <View style={styles.trendContent}>
        <Text style={[styles.trendValue, { color: trendColors[trend] }]}>
          {trend === "up" ? "+" : trend === "down" ? "-" : ""}
          {value}%
        </Text>
        <Text style={styles.trendLabel}>{label}</Text>
        {period && <Text style={styles.trendPeriod}>{period}</Text>}
      </View>
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  matchContainer: {
    alignItems: "center",
  },
  scoreContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontWeight: "800",
  },
  scoreLabel: {
    color: Colors.neutral[500],
    marginTop: DesignTokens.spacing['0.5'],
  },
  glowRing: {
    position: "absolute",
    borderWidth: 2,
    opacity: 0.5,
  },
  breakdownContainer: {
    marginTop: Spacing.lg,
    width: "100%",
  },
  breakdownItem: {
    marginBottom: DesignTokens.spacing[3],
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: DesignTokens.spacing['1.5'],
  },
  breakdownLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[600],
  },
  breakdownScore: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.neutral[700],
  },
  breakdownBar: {
    height: DesignTokens.spacing['1.5'],
    backgroundColor: Colors.neutral[100],
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  radarContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  colorPaletteContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: DesignTokens.spacing[5],
  },
  colorPaletteTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: Colors.neutral[800],
    marginBottom: Spacing.md,
  },
  colorBarsContainer: {
    marginBottom: DesignTokens.spacing[5],
  },
  colorBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  colorDot: {
    width: Spacing.md,
    height: Spacing.md,
    borderRadius: 8,
    marginRight: DesignTokens.spacing[3],
  },
  colorBarInfo: {
    flex: 1,
  },
  colorBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  colorName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[700],
    fontWeight: "500",
  },
  colorPercentage: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
  },
  colorBarTrack: {
    height: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  colorBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  colorSwatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorSwatchHex: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bodyAnalysisContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: DesignTokens.spacing[5],
  },
  bodyVisualContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  bodyVisual: {
    alignItems: "center",
  },
  bodyOutline: {
    width: 120,
    alignItems: "center",
  },
  bodyPart: {
    backgroundColor: Colors.primary[100],
    marginVertical: DesignTokens.spacing['0.5'],
    borderRadius: 20,
  },
  shoulder: {
    height: 30,
  },
  bust: {
    height: DesignTokens.spacing[10],
  },
  waist: {
    height: 25,
  },
  hip: {
    height: 35,
  },
  bodyTypeHighlight: {
    marginTop: Spacing.md,
    borderRadius: 20,
    overflow: "hidden",
  },
  bodyTypeGradient: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.sm,
  },
  bodyTypeText: {
    color: colors.textInverse,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  measurementsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
  },
  measurementItem: {
    alignItems: "center",
  },
  measurementLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing.xs,
  },
  measurementValue: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "700",
    color: Colors.neutral[800],
  },
  measurementUnit: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[400],
  },
  recommendationsContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
    paddingTop: Spacing.md,
  },
  recommendationsTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: Colors.neutral[700],
    marginBottom: DesignTokens.spacing[3],
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  recommendationDot: {
    width: DesignTokens.spacing['1.5'],
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: Colors.primary[500],
    marginTop: DesignTokens.spacing['1.5'],
    marginRight: DesignTokens.spacing['2.5'],
  },
  recommendationText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[600],
    lineHeight: 20,
  },
  compatibilityContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: DesignTokens.spacing[5],
  },
  itemsPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  itemPreview: {
    width: 70,
    alignItems: "center",
  },
  itemPreviewSelected: {
    opacity: 0.7,
  },
  itemPreviewImage: {
    width: 60,
    height: 75,
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  itemPreviewName: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[600],
    textAlign: "center",
  },
  itemConnector: {
    marginHorizontal: Spacing.xs,
  },
  scoreOverview: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  analysisGrid: {
    marginBottom: DesignTokens.spacing[5],
  },
  analysisItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  analysisLabel: {
    width: Spacing['4xl'],
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[600],
  },
  analysisBar: {
    flex: 1,
    height: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    borderRadius: 4,
    marginHorizontal: DesignTokens.spacing[3],
    overflow: "hidden",
  },
  analysisFill: {
    height: "100%",
    borderRadius: 4,
  },
  analysisValue: {
    width: DesignTokens.spacing[10],
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    textAlign: "right",
  },
  suggestionsContainer: {
    backgroundColor: Colors.warning[50],
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
  },
  suggestionsTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.warning[700],
    marginBottom: Spacing.sm,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: DesignTokens.spacing['1.5'],
  },
  suggestionText: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.warning[800],
    marginLeft: Spacing.sm,
    lineHeight: 18,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
  },
  trendIcon: {
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[11],
    borderRadius: 22,
    backgroundColor: Colors.neutral[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing[3],
  },
  trendContent: {
    flex: 1,
  },
  trendValue: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
  },
  trendLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[600],
    marginTop: DesignTokens.spacing['0.5'],
  },
  trendPeriod: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[400],
    marginTop: DesignTokens.spacing['0.5'],
  },
}))

export default {
  MatchScore,
  StyleRadarChart,
  ColorPaletteAnalysis,
  BodyShapeAnalysis,
  OutfitCompatibility,
  TrendIndicator,
};

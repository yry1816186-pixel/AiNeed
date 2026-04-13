import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { Svg, Circle, Rect, Text as SvgText, Line, Path } from 'react-native-svg';
import { colors } from '@/src/theme/tokens/colors';
import { typography } from '@/src/theme/tokens/typography';
import { spacing } from '@/src/theme/tokens/spacing';
import { shadows } from '@/src/theme/tokens/shadows';
import type { BodyAnalysisReport } from '@/src/services/api/profile.api';

interface BodyTypeCardProps {
  bodyAnalysis: BodyAnalysisReport | null;
  shoulder?: number;
  waist?: number;
  hip?: number;
  collapsed: boolean;
  onToggle: () => void;
}

const BODY_TYPE_ICONS: Record<string, string> = {
  hourglass: 'hourglass-outline',
  rectangle: 'remove-outline',
  triangle: 'triangle-outline',
  inverted_triangle: 'triangle-outline',
  oval: 'ellipse-outline',
};

const BODY_TYPE_LABELS: Record<string, string> = {
  hourglass: 'X型（沙漏）',
  rectangle: 'H型（矩形）',
  triangle: 'A型（梨形）',
  inverted_triangle: 'Y型（倒三角）',
  oval: 'O型（椭圆）',
};

function BodySilhouette({
  bodyType,
  shoulderRatio,
  waistRatio,
  hipRatio,
}: {
  bodyType: string;
  shoulderRatio: number;
  waistRatio: number;
  hipRatio: number;
}) {
  const svgWidth = 200;
  const svgHeight = 240;
  const centerX = svgWidth / 2;
  const maxHalfWidth = 60;

  const sW = maxHalfWidth * shoulderRatio;
  const wW = maxHalfWidth * waistRatio;
  const hW = maxHalfWidth * hipRatio;

  const topY = 30;
  const shoulderY = 60;
  const waistY = 140;
  const hipY = 190;
  const bottomY = 220;

  const pathD = [
    `M ${centerX} ${topY}`,
    `C ${centerX + 15} ${topY}, ${centerX + sW} ${shoulderY - 15}, ${centerX + sW} ${shoulderY}`,
    `C ${centerX + sW + 5} ${shoulderY + 20}, ${centerX + wW + 8} ${waistY - 30}, ${centerX + wW} ${waistY}`,
    `C ${centerX + wW - 5} ${waistY + 20}, ${centerX + hW + 8} ${hipY - 30}, ${centerX + hW} ${hipY}`,
    `C ${centerX + hW - 5} ${hipY + 15}, ${centerX + 15} ${bottomY - 10}, ${centerX} ${bottomY}`,
    `C ${centerX - 15} ${bottomY - 10}, ${centerX - hW + 5} ${hipY + 15}, ${centerX - hW} ${hipY}`,
    `C ${centerX - hW - 8} ${hipY - 30}, ${centerX - wW + 5} ${waistY + 20}, ${centerX - wW} ${waistY}`,
    `C ${centerX - wW - 8} ${waistY - 30}, ${centerX - sW - 5} ${shoulderY + 20}, ${centerX - sW} ${shoulderY}`,
    `C ${centerX - sW} ${shoulderY - 15}, ${centerX - 15} ${topY}, ${centerX} ${topY}`,
    'Z',
  ].join(' ');

  return (
    <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      <Rect
        x={0}
        y={0}
        width={svgWidth}
        height={svgHeight}
        fill="transparent"
      />
      <Line
        x1={centerX - maxHalfWidth - 15}
        y1={shoulderY}
        x2={centerX + maxHalfWidth + 15}
        y2={shoulderY}
        stroke={colors.neutral[200]}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <Line
        x1={centerX - maxHalfWidth - 15}
        y1={waistY}
        x2={centerX + maxHalfWidth + 15}
        y2={waistY}
        stroke={colors.neutral[200]}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <Line
        x1={centerX - maxHalfWidth - 15}
        y1={hipY}
        x2={centerX + maxHalfWidth + 15}
        y2={hipY}
        stroke={colors.neutral[200]}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <SvgText
        x={centerX + maxHalfWidth + 20}
        y={shoulderY + 4}
        fill={colors.neutral[500]}
        fontSize={10}
        fontFamily={typography.fontFamily.sans}
      >
        肩
      </SvgText>
      <SvgText
        x={centerX + maxHalfWidth + 20}
        y={waistY + 4}
        fill={colors.neutral[500]}
        fontSize={10}
        fontFamily={typography.fontFamily.sans}
      >
        腰
      </SvgText>
      <SvgText
        x={centerX + maxHalfWidth + 20}
        y={hipY + 4}
        fill={colors.neutral[500]}
        fontSize={10}
        fontFamily={typography.fontFamily.sans}
      >
        臀
      </SvgText>
      <Circle cx={centerX} cy={topY - 8} r={14} fill={colors.brand.warmPrimary} opacity={0.15} />
      <Circle cx={centerX} cy={topY - 8} r={14} fill="transparent" stroke={colors.brand.warmPrimary} strokeWidth={1.5} />
      <SvgText
        x={centerX}
        y={topY - 4}
        textAnchor="middle"
        fill={colors.brand.warmPrimary}
        fontSize={10}
        fontWeight="600"
      >
        {bodyType === 'hourglass' ? 'X' : bodyType === 'rectangle' ? 'H' : bodyType === 'triangle' ? 'A' : bodyType === 'inverted_triangle' ? 'Y' : 'O'}
      </SvgText>
      <Path d={pathD} fill={colors.brand.warmPrimary} opacity={0.12} />
      <Path d={pathD} fill="transparent" stroke={colors.brand.warmPrimary} strokeWidth={2} />
    </Svg>
  );
}

export const BodyTypeCard: React.FC<BodyTypeCardProps> = ({
  bodyAnalysis,
  shoulder,
  waist,
  hip,
  collapsed,
  onToggle,
}) => {
  const bodyType = bodyAnalysis?.bodyType?.type || '';
  const bodyTypeName = bodyAnalysis?.bodyType?.label || BODY_TYPE_LABELS[bodyType] || '未知';
  const bodyTypeIcon = BODY_TYPE_ICONS[bodyType] || 'body-outline';

  const ratios = useMemo(() => {
    const maxVal = Math.max(shoulder || 0, waist || 0, hip || 0);
    if (maxVal === 0) return { shoulderRatio: 0.7, waistRatio: 0.5, hipRatio: 0.7 };
    return {
      shoulderRatio: (shoulder || maxVal * 0.9) / maxVal,
      waistRatio: (waist || maxVal * 0.6) / maxVal,
      hipRatio: (hip || maxVal * 0.9) / maxVal,
    };
  }, [shoulder, waist, hip]);

  const recommendations = useMemo(() => {
    if (!bodyAnalysis?.recommendations) return [];
    const items: string[] = [];
    if (bodyAnalysis.recommendations.tops?.length) {
      items.push(...bodyAnalysis.recommendations.tops.slice(0, 2));
    }
    if (bodyAnalysis.recommendations.bottoms?.length) {
      items.push(...bodyAnalysis.recommendations.bottoms.slice(0, 2));
    }
    return items.slice(0, 4);
  }, [bodyAnalysis]);

  const idealStyles = bodyAnalysis?.recommendations?.idealStyles || [];
  const avoidStyles = bodyAnalysis?.recommendations?.avoidStyles || [];

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityLabel={`体型分析：${bodyTypeName}，${collapsed ? '点击展开' : '点击收起'}`}
        accessibilityRole="button"
      >
        <View style={styles.cardHeaderLeft}>
          <Ionicons name={bodyTypeIcon as any} size={20} color={colors.brand.warmPrimary} />
          <Text style={styles.cardHeaderTitle}>体型分析</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{bodyTypeName}</Text>
          </View>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={colors.neutral[400]}
        />
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.cardContent}>
          <View style={styles.silhouetteContainer}>
            <BodySilhouette
              bodyType={bodyType}
              shoulderRatio={ratios.shoulderRatio}
              waistRatio={ratios.waistRatio}
              hipRatio={ratios.hipRatio}
            />
          </View>

          {(shoulder || waist || hip) && (
            <View style={styles.proportionRow}>
              {shoulder ? (
                <View style={styles.proportionItem}>
                  <Text style={styles.proportionLabel}>肩宽</Text>
                  <Text style={styles.proportionValue}>{shoulder}cm</Text>
                </View>
              ) : null}
              {waist ? (
                <View style={styles.proportionItem}>
                  <Text style={styles.proportionLabel}>腰围</Text>
                  <Text style={styles.proportionValue}>{waist}cm</Text>
                </View>
              ) : null}
              {hip ? (
                <View style={styles.proportionItem}>
                  <Text style={styles.proportionLabel}>臀围</Text>
                  <Text style={styles.proportionValue}>{hip}cm</Text>
                </View>
              ) : null}
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>穿搭建议</Text>
              {recommendations.map((item, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationDot} />
                  <Text style={styles.recommendationText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {idealStyles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>推荐风格</Text>
              <View style={styles.tagsRow}>
                {idealStyles.map((style, index) => (
                  <View key={index} style={styles.idealTag}>
                    <Text style={styles.idealTagText}>{style}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {avoidStyles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>避免风格</Text>
              <View style={styles.tagsRow}>
                {avoidStyles.map((style, index) => (
                  <View key={index} style={styles.avoidTag}>
                    <Text style={styles.avoidTagText}>{style}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.layout.cardPadding,
    marginBottom: spacing.layout.cardGap,
    ...shadows.presets.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.scale[2],
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
  },
  typeBadge: {
    backgroundColor: colors.warmPrimary.coral[50],
    paddingHorizontal: spacing.scale[2],
    paddingVertical: spacing.scale[1],
    borderRadius: spacing.borderRadius.md,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.warmPrimary,
  },
  cardContent: {
    marginTop: spacing.scale[4],
    gap: spacing.scale[4],
  },
  silhouetteContainer: {
    alignItems: 'center',
    paddingVertical: spacing.scale[2],
  },
  proportionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.neutral[50],
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.scale[3],
  },
  proportionItem: {
    alignItems: 'center',
    gap: spacing.scale[1],
  },
  proportionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
  },
  proportionValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[800],
  },
  section: {
    gap: spacing.scale[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.scale[2],
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.warmPrimary,
    marginTop: 7,
  },
  recommendationText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    lineHeight: 20,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.scale[2],
  },
  idealTag: {
    backgroundColor: colors.warmPrimary.coral[50],
    paddingHorizontal: spacing.scale[3],
    paddingVertical: spacing.scale[1] + 2,
    borderRadius: spacing.borderRadius.lg,
  },
  idealTagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.brand.warmPrimary,
  },
  avoidTag: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.scale[3],
    paddingVertical: spacing.scale[1] + 2,
    borderRadius: spacing.borderRadius.lg,
  },
  avoidTagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[500],
  },
});

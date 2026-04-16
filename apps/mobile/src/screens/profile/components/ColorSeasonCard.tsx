import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import {
  Svg,
  Rect,
  Text as SvgText,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { colors } from "@/src/theme/tokens/colors";
import { DesignTokens } from "@/src/theme/tokens/design-tokens";
import { typography } from "@/src/theme/tokens/typography";
import { spacing } from "@/src/theme/tokens/spacing";
import { shadows } from "@/src/theme/tokens/shadows";
import type { ColorAnalysisReport } from "@/src/services/api/profile.api";

interface ColorSeasonCardProps {
  colorAnalysis: ColorAnalysisReport | null;
  collapsed: boolean;
  onToggle: () => void;
}

const COLOR_MAP: Record<string, string> = {
  珊瑚色: "#FF7F7F",
  桃色: "#FFB7B2",
  杏色: "#FBCEB1",
  暖黄色: "#FFD700",
  草绿色: "#7CFC00",
  天蓝色: "#87CEEB",
  象牙白: "#FFFFF0",
  粉色: "#FFC0CB",
  薰衣草色: "#E6E6FA",
  浅蓝色: "#ADD8E6",
  玫瑰色: "#FF007F",
  薄荷绿: "#98FB98",
  淡紫色: "#DDA0DD",
  雾蓝色: "#B0C4DE",
  驼色: "#C19A6B",
  棕色: "#8B4513",
  橄榄绿: "#808000",
  铁锈红: "#B7410E",
  芥末黄: "#FFDB58",
  南瓜色: "#FF7518",
  酒红色: "#722F37",
  正红色: "#FF0000",
  纯白色: "#FFFFFF",
  黑色: DesignTokens.colors.neutral.black,
  宝蓝色: "#4169E1",
  翠绿色: "#50C878",
  深紫色: "#301934",
  玫红色: "#FF007F",
  暖米色: "#F5F5DC",
  棕褐色: "#D2B48C",
  奶油白: "#FFFDD0",
  柔和灰色: "#C0C0C0",
  米白色: DesignTokens.colors.backgrounds.tertiary,
  淡粉色: "#FFB6C1",
  浅灰蓝色: "#B0C4DE",
  米色: "#F5F5DC",
  奶油色: "#FFFDD0",
  深棕色: "#654321",
  军绿色: "#4B5320",
  纯黑色: DesignTokens.colors.neutral.black,
  冷灰色: "#A9A9A9",
  深紫红色: "#4A0028",
  冰蓝色: "#99FFFF",
  橙色: "#FFA500",
  深黄色: "#FFD700",
  鲜艳的红色: "#FF0000",
  暖棕色: "#8B4513",
  冷蓝色: "#6495ED",
  亮粉色: "#FF69B4",
  荧光色: "#CCFF00",
  深灰色: "#696969",
  藏青色: "#000080",
};

const SEASON_TAGS: Record<string, { warm: string; depth: string }> = {
  spring: { warm: "暖", depth: "浅" },
  summer: { warm: "冷", depth: "浅" },
  autumn: { warm: "暖", depth: "深" },
  winter: { warm: "冷", depth: "深" },
};

// Derive season gradient colors from DesignTokens.colorSeasons palette
const SEASON_GRADIENT: Record<string, [string, string]> = {
  spring: [
    DesignTokens.colors.colorSeasons.spring.colors[0],
    DesignTokens.colors.colorSeasons.spring.colors[2],
  ],
  summer: [
    DesignTokens.colors.colorSeasons.summer.colors[0],
    DesignTokens.colors.colorSeasons.summer.colors[1],
  ],
  autumn: [
    DesignTokens.colors.colorSeasons.autumn.colors[0],
    DesignTokens.colors.colorSeasons.autumn.colors[2],
  ],
  winter: [
    DesignTokens.colors.colorSeasons.winter.colors[0],
    DesignTokens.colors.colorSeasons.winter.colors[1],
  ],
};

// Derive season labels from DesignTokens.colorSeasons
const SEASON_LABELS: Record<string, string> = {
  spring: DesignTokens.colors.colorSeasons.spring.label,
  summer: DesignTokens.colors.colorSeasons.summer.label,
  autumn: DesignTokens.colors.colorSeasons.autumn.label,
  winter: DesignTokens.colors.colorSeasons.winter.label,
};

const METAL_LABELS: Record<string, string> = {
  gold: "黄金饰品",
  silver: "银色饰品",
  both: "金银皆宜",
};

function ColorPalette({
  colorNames,
  labels,
  columns = 4,
}: {
  colorNames: string[];
  labels?: boolean;
  columns?: number;
}) {
  const blockSize = 44;
  const gap = 8;
  const labelHeight = labels ? 18 : 0;
  const svgWidth = columns * (blockSize + gap) - gap;
  const rows = Math.ceil(colorNames.length / columns);
  const svgHeight = rows * (blockSize + labelHeight + gap) - gap;

  return (
    <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
      {colorNames.map((name, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = col * (blockSize + gap);
        const y = row * (blockSize + labelHeight + gap);
        const hex = COLOR_MAP[name] || DesignTokens.colors.neutral[300];
        const isLight = isLightColor(hex);

        return (
          <G key={index}>
            <Rect
              x={x}
              y={y}
              width={blockSize}
              height={blockSize}
              rx={8}
              ry={8}
              fill={hex}
              stroke={isLight ? colors.neutral[200] : "transparent"}
              strokeWidth={isLight ? 1 : 0}
            />
            {labels && (
              <SvgText
                x={x + blockSize / 2}
                y={y + blockSize + 12}
                textAnchor="middle"
                fill={colors.neutral[600]}
                fontSize={9}
                fontFamily={typography.fontFamily.sans}
              >
                {name.length > 3 ? name.substring(0, 3) : name}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) {
    return false;
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

function SeasonGradientBand({ season }: { season: string }) {
  const gradientColors = SEASON_GRADIENT[season] || [DesignTokens.colors.neutral[300], DesignTokens.colors.text.tertiary];
  const width = 300;
  const height = 24;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id={`seasonGrad-${season}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={gradientColors[0]} />
          <Stop offset="1" stopColor={gradientColors[1]} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} rx={12} fill={`url(#seasonGrad-${season})`} />
    </Svg>
  );
}

export const ColorSeasonCard: React.FC<ColorSeasonCardProps> = ({
  colorAnalysis,
  collapsed,
  onToggle,
}) => {
  const season = colorAnalysis?.colorSeason?.type || "";
  const seasonName = colorAnalysis?.colorSeason?.label || SEASON_LABELS[season] || "未知";
  const seasonTags = SEASON_TAGS[season];
  const bestColors = colorAnalysis?.bestColors || colorAnalysis?.colorSeason?.bestColors || [];
  const avoidColors = colorAnalysis?.avoidColors || colorAnalysis?.colorSeason?.avoidColors || [];
  const metalPreference = colorAnalysis?.metalPreference || "both";

  const displayBestColors = useMemo(() => bestColors.slice(0, 8), [bestColors]);
  const displayAvoidColors = useMemo(() => avoidColors.slice(0, 4), [avoidColors]);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityLabel={`色彩季型：${seasonName}，${collapsed ? "点击展开" : "点击收起"}`}
        accessibilityRole="button"
      >
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="palette-outline" size={20} color={colors.brand.warmAccent} />
          <Text style={styles.cardHeaderTitle}>色彩季型</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{seasonName}</Text>
          </View>
        </View>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={20}
          color={colors.neutral[400]}
        />
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.cardContent}>
          <View style={styles.seasonHeader}>
            <Text style={styles.seasonName}>{seasonName}</Text>
            {seasonTags && (
              <View style={styles.seasonTagsRow}>
                <View style={[styles.seasonTag, styles.warmTag]}>
                  <Text style={styles.seasonTagText}>{seasonTags.warm}色调</Text>
                </View>
                <View style={[styles.seasonTag, styles.depthTag]}>
                  <Text style={styles.seasonTagText}>{seasonTags.depth}明度</Text>
                </View>
              </View>
            )}
          </View>

          {season && <SeasonGradientBand season={season} />}

          {displayBestColors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最佳色彩</Text>
              <ColorPalette colorNames={displayBestColors} labels />
            </View>
          )}

          {displayAvoidColors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>避免色彩</Text>
              <ColorPalette colorNames={displayAvoidColors} labels columns={4} />
            </View>
          )}

          <View style={styles.metalSection}>
            <Ionicons name="diamond-outline" size={16} color={colors.fashion.champagne} />
            <Text style={styles.metalLabel}>饰品偏好：</Text>
            <Text style={styles.metalValue}>
              {METAL_LABELS[metalPreference] || metalPreference}
            </Text>
          </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.scale[2],
    flex: 1,
  },
  cardHeaderTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
  },
  typeBadge: {
    backgroundColor: colors.warmPrimary.ocean[50],
    paddingHorizontal: spacing.scale[2],
    paddingVertical: spacing.scale[1],
    borderRadius: spacing.borderRadius.md,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.warmAccent,
  },
  cardContent: {
    marginTop: spacing.scale[4],
    gap: spacing.scale[4],
  },
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seasonName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  seasonTagsRow: {
    flexDirection: "row",
    gap: spacing.scale[2],
  },
  seasonTag: {
    paddingHorizontal: spacing.scale[2],
    paddingVertical: spacing.scale[1],
    borderRadius: spacing.borderRadius.md,
  },
  warmTag: {
    backgroundColor: colors.warmPrimary.coral[50],
  },
  depthTag: {
    backgroundColor: colors.warmPrimary.ocean[50],
  },
  seasonTagText: {
    fontSize: typography.fontSize["2xs"],
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
  },
  section: {
    gap: spacing.scale[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
  },
  metalSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.scale[2],
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.scale[3],
    paddingVertical: spacing.scale[2],
    borderRadius: spacing.borderRadius.lg,
  },
  metalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  metalValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
  },
});

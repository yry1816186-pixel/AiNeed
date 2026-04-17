import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { TagCloud } from '../../../../shared/components/charts/TagCloud';
import { PercentageBar } from '../../../../shared/components/charts/PercentageBar';
import { flatColors as colors, Spacing, Shadows, spacing, typography, shadows } from '../../../../design-system/theme';

interface StylePreferences {
  preferredStyles: string[];
  avoidedStyles: string[];
  preferredColors: string[];
  avoidedColors: string[];
  fitGoals: string[];
}

interface StyleRecommendations {
  styles: string[];
  occasions: { occasion: string; suggestions: string[] }[];
  tips: string[];
}

interface StyleTagsCardProps {
  stylePreferences: StylePreferences | null;
  styleRecommendations: StyleRecommendations | null;
  collapsed: boolean;
  onToggle: () => void;
}

const ALL_STYLE_TAGS = [
  "简约",
  "街头",
  "复古",
  "优雅",
  "运动",
  "甜美",
  "知性",
  "前卫",
  "浪漫",
  "休闲",
];

const OCCASION_CONFIG = [
  { label: "工作", color: colors.brand.warmAccent },
  { label: "约会", color: colors.gradients.coralRose[0] },
  { label: "运动", color: colors.brand.warmSecondary },
  { label: "休闲", color: colors.brand.primary },
];

const DEFAULT_OCCASION_PERCENTAGES = [35, 25, 15, 25];

function buildTagItems(preferredStyles: string[]) {
  const preferredSet = new Set(preferredStyles);
  return ALL_STYLE_TAGS.map((label, index) => ({
    label,
    weight: preferredSet.has(label)
      ? 0.8 + (ALL_STYLE_TAGS.length - index) * 0.02
      : 0.3 + index * 0.03,
    active: preferredSet.has(label),
  }));
}

function buildAvoidedTags(avoidedStyles: string[]) {
  return avoidedStyles.map((label) => ({
    label,
    weight: 0.3,
    active: false,
  }));
}

function buildOccasionData(
  styleRecommendations: StyleRecommendations | null,
  _stylePreferences: StylePreferences | null
) {
  const occasionMap: Record<string, number> = {};
  if (styleRecommendations?.occasions) {
    styleRecommendations.occasions.forEach((o, i) => {
      occasionMap[o.occasion] = DEFAULT_OCCASION_PERCENTAGES[i] ?? 20;
    });
  }
  if (Object.keys(occasionMap).length === 0) {
    OCCASION_CONFIG.forEach((cfg, i) => {
      occasionMap[cfg.label] = DEFAULT_OCCASION_PERCENTAGES[i];
    });
  }
  return OCCASION_CONFIG.map((cfg) => ({
    label: cfg.label,
    percentage:
      occasionMap[cfg.label] ?? DEFAULT_OCCASION_PERCENTAGES[OCCASION_CONFIG.indexOf(cfg)] ?? 20,
    color: cfg.color,
  }));
}

export const StyleTagsCard: React.FC<StyleTagsCardProps> = ({
  stylePreferences,
  styleRecommendations,
  collapsed,
  onToggle,
}) => {
  const tagItems = useMemo(
    () => buildTagItems(stylePreferences?.preferredStyles ?? []),
    [stylePreferences?.preferredStyles]
  );

  const avoidedTagItems = useMemo(
    () => buildAvoidedTags(stylePreferences?.avoidedStyles ?? []),
    [stylePreferences?.avoidedStyles]
  );

  const occasionData = useMemo(
    () => buildOccasionData(styleRecommendations, stylePreferences),
    [styleRecommendations, stylePreferences]
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityLabel={collapsed ? "展开风格标签" : "收起风格标签"}
        accessibilityRole="button"
      >
        <Ionicons name="prism-outline" size={20} color={colors.brand.primary} />
        <Text style={styles.headerTitle}>风格标签</Text>
        <Ionicons
          name={collapsed ? "chevron-down-outline" : "chevron-up-outline"}
          size={18}
          color={colors.neutral[400]}
        />
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>我的风格</Text>
            <TagCloud tags={tagItems} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>场合偏好</Text>
            {occasionData.map((item) => (
              <PercentageBar
                key={item.label}
                label={item.label}
                percentage={item.percentage}
                color={item.color}
              />
            ))}
          </View>

          {avoidedTagItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitleMuted}>回避风格</Text>
              <TagCloud tags={avoidedTagItems} />
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
    marginHorizontal: spacing.layout.screenPadding,
    marginBottom: spacing.layout.cardGap,
    overflow: "hidden",
    ...shadows.presets.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.layout.cardPadding,
    gap: spacing.aliases.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[800],
  },
  content: {
    paddingHorizontal: spacing.layout.cardPadding,
    paddingBottom: spacing.layout.cardPadding,
  },
  section: {
    marginBottom: spacing.layout.cardGap,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
    marginBottom: spacing.aliases.sm,
  },
  sectionTitleMuted: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[400],
    marginBottom: spacing.aliases.sm,
  },
});

export default StyleTagsCard;

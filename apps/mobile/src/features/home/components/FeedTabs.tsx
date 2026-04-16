import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { FeedCategory } from '../../../services/api/recommendation-feed.api';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


interface FeedTab {
  key: FeedCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const FEED_TABS: FeedTab[] = [
  { key: "daily", label: "每日推荐", icon: "sunny-outline" },
  { key: "occasion", label: "场景穿搭", icon: "pricetag-outline" },
  { key: "trending", label: "热门趋势", icon: "trending-up-outline" },
  { key: "explore", label: "发现探索", icon: "compass-outline" },
];

const OCCASION_SUBS = [
  { key: "commute", label: "通勤" },
  { key: "date", label: "约会" },
  { key: "sport", label: "运动" },
  { key: "interview", label: "面试" },
  { key: "casual", label: "休闲" },
  { key: "travel", label: "旅行" },
];

interface FeedTabsProps {
  activeCategory: FeedCategory;
  activeSubCategory: string | null;
  onCategoryChange: (category: FeedCategory) => void;
  onSubCategoryChange: (subCategory: string | null) => void;
}

export function FeedTabs({
  activeCategory,
  activeSubCategory,
  onCategoryChange,
  onSubCategoryChange,
}: FeedTabsProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const handleCategoryPress = useCallback(
    (category: FeedCategory) => {
      if (category !== activeCategory) {
        onCategoryChange(category);
      }
    },
    [activeCategory, onCategoryChange]
  );

  const handleSubPress = useCallback(
    (subKey: string) => {
      onSubCategoryChange(activeSubCategory === subKey ? null : subKey);
    },
    [activeSubCategory, onSubCategoryChange]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {FEED_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeCategory === tab.key && styles.tabActive]}
            onPress={() => handleCategoryPress(tab.key)}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === tab.key }}
          >
            <Ionicons
              name={tab.icon}
              size={14}
              color={activeCategory === tab.key ? colors.textInverse : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeCategory === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeCategory === "occasion" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabsContainer}
        >
          {OCCASION_SUBS.map((sub) => (
            <Pressable
              key={sub.key}
              style={[styles.subTab, activeSubCategory === sub.key && styles.subTabActive]}
              onPress={() => handleSubPress(sub.key)}
              accessibilityLabel={sub.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeSubCategory === sub.key }}
            >
              <Text
                style={[
                  styles.subTabLabel,
                  activeSubCategory === sub.key && styles.subTabLabelActive,
                ]}
              >
                {sub.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabsContainer: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
    gap: DesignTokens.spacing['1.5'],
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textInverse,
  },
  subTabsContainer: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingBottom: Spacing.sm,
    gap: DesignTokens.spacing['1.5'],
  },
  subTab: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  subTabActive: {
    backgroundColor: colors.primaryLight,
  },
  subTabLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  subTabLabelActive: {
    color: colors.primary,
    fontWeight: "600",
  },
}))

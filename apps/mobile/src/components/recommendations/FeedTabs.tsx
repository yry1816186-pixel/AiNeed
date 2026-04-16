﻿﻿import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import type { FeedCategory } from "../../services/api/recommendation-feed.api";

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
              color={activeCategory === tab.key ? DesignTokens.colors.text.inverse : DesignTokens.colors.text.secondary}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.borders.default,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
    gap: 4,
  },
  tabActive: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
  tabLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: DesignTokens.colors.text.secondary,
  },
  tabLabelActive: {
    color: DesignTokens.colors.text.inverse,
  },
  subTabsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  subTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
  },
  subTabActive: {
    backgroundColor: DesignTokens.colors.brand.terracottaLight,
  },
  subTabLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.secondary,
  },
  subTabLabelActive: {
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "600",
  },
});

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { Spacing, flatColors as colors } from '../../../design-system/theme';


const CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "outfit", label: "穿搭分享" },
  { key: "recommend", label: "好物推荐" },
  { key: "style", label: "风格讨论" },
  { key: "ootd", label: "OOTD" },
] as const;

const MAIN_TABS = [
  { key: "discover", label: "发现" },
  { key: "following", label: "关注" },
] as const;

interface CommunityHeaderProps {
  activeMainTab: string;
  activeCategory: string;
  onMainTabChange: (tab: string) => void;
  onCategoryChange: (category: string) => void;
  showCategories?: boolean;
}

function CommunityHeaderInner({
  activeMainTab,
  activeCategory,
  onMainTabChange,
  onCategoryChange,
  showCategories = true,
}: CommunityHeaderProps) {
    const { colors } = useTheme();
  return (
    <>
      <View style={s.header}>
        <Text style={s.headerTitle}>社区</Text>
        <TouchableOpacity style={s.searchBtn} accessibilityLabel="搜索" accessibilityRole="button">
          <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main tabs: discover / following */}
      <View style={s.mainTabRow}>
        {MAIN_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.mainTab, activeMainTab === tab.key && s.mainTabActive]}
            onPress={() => onMainTabChange(tab.key)}
          >
            <Text style={[s.mainTabText, activeMainTab === tab.key && s.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category filter - only in discover tab */}
      {showCategories && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryScrollContent}
          style={s.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[s.categoryChip, activeCategory === cat.key && s.categoryChipActive]}
              onPress={() => onCategoryChange(cat.key)}
            >
              <Text
                style={[s.categoryChipText, activeCategory === cat.key && s.categoryChipTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );
}

export const CommunityHeader = React.memo(CommunityHeaderInner);

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing['3.5'],
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.text },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: DesignTokens.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainTab: {
    paddingVertical: DesignTokens.spacing[3],
    paddingHorizontal: DesignTokens.spacing[5],
    marginRight: Spacing.sm,
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  mainTabText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, fontWeight: "500" },
  mainTabTextActive: { color: colors.primary, fontWeight: "700" },
  categoryScroll: { backgroundColor: colors.surface, maxHeight: 52 },
  categoryScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: "center",
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  categoryChipActive: { backgroundColor: colors.primary },
  categoryChipText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, fontWeight: "500" },
  categoryChipTextActive: { color: colors.surface, fontWeight: "600" },
});

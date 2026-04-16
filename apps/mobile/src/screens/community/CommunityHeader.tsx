import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';

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
  return (
    <>
      <View style={s.header}>
        <Text style={s.headerTitle}>社区</Text>
        <TouchableOpacity style={s.searchBtn} accessibilityLabel="搜索" accessibilityRole="button">
          <Ionicons name="search-outline" size={22} color={theme.colors.textPrimary} />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mainTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  mainTabText: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: "500" },
  mainTabTextActive: { color: theme.colors.primary, fontWeight: "700" },
  categoryScroll: { backgroundColor: theme.colors.surface, maxHeight: 52 },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: "center",
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
  },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryChipText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: "500" },
  categoryChipTextActive: { color: theme.colors.surface, fontWeight: "600" },
});

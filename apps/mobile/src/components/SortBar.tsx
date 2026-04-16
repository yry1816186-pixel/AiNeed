import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../design-system/theme";

interface SortBarProps {
  activeSort: string;
  onSortChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { key: "comprehensive", label: "综合" },
  { key: "price_asc", label: "价格↑" },
  { key: "price_desc", label: "价格↓" },
  { key: "sales", label: "销量" },
];

export const SortBar: React.FC<SortBarProps> = ({ activeSort, onSortChange }) => {
  return (
    <View style={styles.container}>
      {SORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={styles.sortItem}
          onPress={() => onSortChange(opt.key)}
        >
          <Text style={[styles.sortText, activeSort === opt.key && styles.sortTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sortItem: { paddingHorizontal: 8, paddingVertical: 4 },
  sortText: { fontSize: 14, color: DesignTokens.colors.text.tertiary },
  sortTextActive: { color: "#FF4D4F", fontWeight: "600" },
});

import React from "react";
import { Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface Subcategory {
  name: string;
  count: number;
}

interface SubcategoryTabsProps {
  subcategories: Subcategory[];
  selectedSubcategory: string | null;
  onSelectSubcategory: (subcategory: string | null) => void;
}

export const SubcategoryTabs: React.FC<SubcategoryTabsProps> = ({
  subcategories,
  selectedSubcategory,
  onSelectSubcategory,
}) => {
  if (!subcategories || subcategories.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={[styles.chip, selectedSubcategory === null && styles.chipSelected]}
        onPress={() => onSelectSubcategory(null)}
      >
        <Text style={[styles.chipText, selectedSubcategory === null && styles.chipTextSelected]}>
          全部
        </Text>
      </TouchableOpacity>
      {subcategories.map((sub) => (
        <TouchableOpacity
          key={sub.name}
          style={[styles.chip, selectedSubcategory === sub.name && styles.chipSelected]}
          onPress={() => onSelectSubcategory(selectedSubcategory === sub.name ? null : sub.name)}
        >
          <Text
            style={[styles.chipText, selectedSubcategory === sub.name && styles.chipTextSelected]}
          >
            {sub.name} ({sub.count})
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { maxHeight: 44, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
  },
  chipSelected: { backgroundColor: "#FF4D4F" },
  chipText: { fontSize: 13, color: DesignTokens.colors.text.secondary },
  chipTextSelected: { color: "#FFFFFF", fontWeight: "500" },
});

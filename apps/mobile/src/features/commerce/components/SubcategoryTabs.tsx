/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { Text, ScrollView, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  container: { maxHeight: 44, backgroundColor: colors.surface },
  content: { paddingHorizontal: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
  },
  chipSelected: { backgroundColor: "colors.error" },
  chipText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  chipTextSelected: { color: colors.surface, fontWeight: "500" },
}));

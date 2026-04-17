import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

const CATEGORIES = [
  { key: "tops", icon: "tshirt-crew", label: "上装" },
  { key: "bottoms", icon: "pants", label: "下装" },
  { key: "dresses", icon: "hanger", label: "连衣裙" },
  { key: "outerwear", icon: "coat-rain", label: "外套" },
  { key: "shoes", icon: "shoe-formal", label: "鞋履" },
  { key: "accessories", icon: "necklace", label: "配饰" },
  { key: "activewear", icon: "run", label: "运动装" },
  { key: "swimwear", icon: "swim", label: "泳装" },
] as const;

interface CategoryNavigationProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelectCategory(isSelected ? null : cat.key)}
          >
            <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
              <Text style={styles.iconEmoji}>
                {cat.key === "tops"
                  ? "T"
                  : cat.key === "bottoms"
                  ? "P"
                  : cat.key === "dresses"
                  ? "D"
                  : cat.key === "outerwear"
                  ? "C"
                  : cat.key === "shoes"
                  ? "S"
                  : cat.key === "accessories"
                  ? "A"
                  : cat.key === "activewear"
                  ? "R"
                  : "W"}
              </Text>
            </View>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{cat.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const useStyles = createStyles((colors) => ({
  container: { maxHeight: Spacing['4xl'], backgroundColor: colors.surface },
  content: { paddingHorizontal: DesignTokens.spacing[3], paddingVertical: Spacing.sm, gap: Spacing.xs},
  item: { alignItems: "center", width: 56, paddingVertical: Spacing.xs},
  itemSelected: {},
  iconCircle: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: colors.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  iconCircleSelected: { backgroundColor: "colors.errorLight" },
  iconEmoji: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textSecondary },
  label: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  labelSelected: { color: "colors.error", fontWeight: "500" },
}))

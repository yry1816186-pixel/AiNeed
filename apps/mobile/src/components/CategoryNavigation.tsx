import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { DesignTokens } from "../design-system/theme";

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

const styles = StyleSheet.create({
  container: { maxHeight: 80, backgroundColor: DesignTokens.colors.backgrounds.primary },
  content: { paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  item: { alignItems: "center", width: 56, paddingVertical: 4 },
  itemSelected: {},
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconCircleSelected: { backgroundColor: "DesignTokens.colors.semantic.errorLight" },
  iconEmoji: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: DesignTokens.colors.text.secondary },
  label: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.text.tertiary },
  labelSelected: { color: "DesignTokens.colors.semantic.error", fontWeight: "500" },
});

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@/src/polyfills/expo-vector-icons";
import { ClothingCategory, CATEGORY_LABELS } from "../../../types/clothing";
import { haptics } from "../../utils/haptics";
import { DesignTokens } from "../../../theme/tokens/design-tokens";

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
}

function FilterSection({
  title,
  options,
  selected,
  onSelect,
  _multiSelect = true,
}: FilterSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => {
                haptics.selection();
                onSelect(option.value);
              }}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
              {option.count !== undefined && (
                <Text style={[styles.count, isSelected && styles.countSelected]}>
                  ({option.count})
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface FilterPanelProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  categories: { value: ClothingCategory; count: number }[];
  seasons: { value: string; count: number }[];
  occasions: { value: string; count: number }[];
  initialFilters?: FilterState;
}

export interface FilterState {
  categories: ClothingCategory[];
  seasons: string[];
  occasions: string[];
  priceRange?: [number, number];
  isFavorite?: boolean;
}

export function FilterPanel({
  visible,
  onClose,
  onApply,
  onReset,
  categories,
  seasons,
  occasions,
  initialFilters,
}: FilterPanelProps) {
  const [selectedCategories, setSelectedCategories] = useState<ClothingCategory[]>(
    initialFilters?.categories || []
  );
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(initialFilters?.seasons || []);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>(
    initialFilters?.occasions || []
  );
  const [isFavorite, setIsFavorite] = useState<boolean | undefined>(initialFilters?.isFavorite);

  const handleCategorySelect = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value as ClothingCategory)
        ? prev.filter((c) => c !== value)
        : [...prev, value as ClothingCategory]
    );
  };

  const handleSeasonSelect = (value: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleOccasionSelect = (value: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value]
    );
  };

  const handleApply = () => {
    onApply({
      categories: selectedCategories,
      seasons: selectedSeasons,
      occasions: selectedOccasions,
      isFavorite,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedSeasons([]);
    setSelectedOccasions([]);
    setIsFavorite(undefined);
    onReset();
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>筛选</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={DesignTokens.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <FilterSection
            title="分类"
            options={categories.map((c) => ({
              label: CATEGORY_LABELS[c.value] || c.value,
              value: c.value,
              count: c.count,
            }))}
            selected={selectedCategories}
            onSelect={handleCategorySelect}
          />

          <FilterSection
            title="季节"
            options={seasons.map((s) => ({
              label: s.value,
              value: s.value,
              count: s.count,
            }))}
            selected={selectedSeasons}
            onSelect={handleSeasonSelect}
          />

          <FilterSection
            title="场合"
            options={occasions.map((o) => ({
              label: o.value,
              value: o.value,
              count: o.count,
            }))}
            selected={selectedOccasions}
            onSelect={handleOccasionSelect}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>收藏</Text>
            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.option, isFavorite === true && styles.optionSelected]}
                onPress={() => {
                  haptics.selection();
                  setIsFavorite(isFavorite === true ? undefined : true);
                }}
              >
                <Text style={[styles.optionText, isFavorite === true && styles.optionTextSelected]}>
                  已收藏
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.option, isFavorite === false && styles.optionSelected]}
                onPress={() => {
                  haptics.selection();
                  setIsFavorite(isFavorite === false ? undefined : false);
                }}
              >
                <Text
                  style={[styles.optionText, isFavorite === false && styles.optionTextSelected]}
                >
                  未收藏
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>重置</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>应用</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.text.secondary,
    marginBottom: 12,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  optionSelected: {
    backgroundColor: DesignTokens.colors.brand.terracotta, // custom color
  },
  optionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.primary,
  },
  optionTextSelected: {
    color: DesignTokens.colors.text.inverse,
  },
  count: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.secondary,
    marginLeft: 4,
  },
  countSelected: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.text.secondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.brand.terracotta, // custom color
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
});

export default FilterPanel;

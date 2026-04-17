import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import type { FilterOptions } from '../../../services/api/commerce.api';
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface FilterTagsProps {
  filterOptions: FilterOptions | null;
  activeFilters: {
    brands?: string[];
    colors?: string[];
    sizes?: string[];
    priceRange?: { min: number; max: number };
  };
  onApplyFilter: (
    dimension: "brands" | "colors" | "sizes" | "price",
    value: string | string[] | { min: number; max: number }
  ) => void;
}

const FILTER_DIMENSIONS = [
  { key: "price", label: "价格" },
  { key: "brands", label: "品牌" },
  { key: "colors", label: "颜色" },
  { key: "sizes", label: "尺码" },
  { key: "style", label: "风格" },
] as const;

const PRICE_OPTIONS = [
  { label: "0-100", min: 0, max: 100 },
  { label: "100-300", min: 100, max: 300 },
  { label: "300-500", min: 300, max: 500 },
  { label: "500+", min: 500, max: 99999 },
];

export const FilterTags: React.FC<FilterTagsProps> = ({
  filterOptions,
  activeFilters,
  onApplyFilter,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeDimension, setActiveDimension] = useState<string | null>(null);

  const openFilter = (dimension: string) => {
    setActiveDimension(dimension);
    setModalVisible(true);
  };

  const handleSelect = (value: string) => {
    if (activeDimension === "price") {
      const option = PRICE_OPTIONS.find((o) => o.label === value);
      if (option) {
        onApplyFilter("price", { min: option.min, max: option.max });
      }
    } else if (
      activeDimension === "brands" ||
      activeDimension === "colors" ||
      activeDimension === "sizes"
    ) {
      onApplyFilter(activeDimension, value);
    }
    setModalVisible(false);
  };

  const getFilterOptions = (): string[] => {
    if (!filterOptions) {
      return [];
    }
    switch (activeDimension) {
      case "brands":
        return filterOptions.brands.map((b) => b.name);
      case "colors":
        return filterOptions.colors;
      case "sizes":
        return filterOptions.sizes;
      case "price":
        return PRICE_OPTIONS.map((o) => o.label);
      default:
        return [];
    }
  };

  const getActiveCount = (key: string): number => {
    switch (key) {
      case "price":
        return activeFilters.priceRange ? 1 : 0;
      case "brands":
        return activeFilters.brands?.length ?? 0;
      case "colors":
        return activeFilters.colors?.length ?? 0;
      case "sizes":
        return activeFilters.sizes?.length ?? 0;
      default:
        return 0;
    }
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {FILTER_DIMENSIONS.map((dim) => {
          const count = getActiveCount(dim.key);
          return (
            <TouchableOpacity
              key={dim.key}
              style={[styles.tag, count > 0 && styles.tagActive]}
              onPress={() => openFilter(dim.key)}
            >
              <Text style={[styles.tagText, count > 0 && styles.tagTextActive]}>{dim.label}</Text>
              {count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {FILTER_DIMENSIONS.find((d) => d.key === activeDimension)?.label ?? "筛选"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getFilterOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionRow} onPress={() => handleSelect(item)}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: { maxHeight: DesignTokens.spacing[10], backgroundColor: colors.surface },
  content: { paddingHorizontal: DesignTokens.spacing[3], gap: Spacing.sm},
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    gap: Spacing.xs,
  },
  tagActive: { backgroundColor: "colors.errorLight" },
  tagText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  tagTextActive: { color: "colors.error" },
  badge: {
    backgroundColor: "colors.error",
    borderRadius: 8,
    minWidth: Spacing.md,
    height: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "600", color: colors.surface },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  modalTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary },
  modalClose: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary },
  optionRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  optionText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary },
}))

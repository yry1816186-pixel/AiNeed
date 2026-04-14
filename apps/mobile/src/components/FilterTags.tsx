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
import type { FilterOptions } from "../services/api/commerce.api";

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
    value: string | string[] | { min: number; max: number },
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
    if (!filterOptions) return [];
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
              <Text
                style={[styles.tagText, count > 0 && styles.tagTextActive]}
              >
                {dim.label}
              </Text>
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
                {FILTER_DIMENSIONS.find((d) => d.key === activeDimension)
                  ?.label ?? "筛选"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getFilterOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => handleSelect(item)}
                >
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

const styles = StyleSheet.create({
  container: { maxHeight: 40, backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 12, gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    gap: 4,
  },
  tagActive: { backgroundColor: "#FFF0F0" },
  tagText: { fontSize: 13, color: "#666666" },
  tagTextActive: { color: "#FF4D4F" },
  badge: {
    backgroundColor: "#FF4D4F",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: "600", color: "#FFFFFF" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 16, fontWeight: "600", color: "#333333" },
  modalClose: { fontSize: 14, color: "#999999" },
  optionRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  optionText: { fontSize: 15, color: "#333333" },
});

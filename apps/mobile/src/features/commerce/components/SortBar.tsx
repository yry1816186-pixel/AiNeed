import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: DesignTokens.spacing['2.5'],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  sortItem: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs},
  sortText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary },
  sortTextActive: { color: "colors.error", fontWeight: "600" },
}))

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Spacing } from '../../design-system/theme';
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../design-system/theme";

const PRESET_COLORS = [
  DesignTokens.colors.neutral.black,
  DesignTokens.colors.backgrounds.primary,
  "DesignTokens.colors.semantic.error",
  "#FF6B00",
  "DesignTokens.colors.semantic.warning",
  "#00C853",
  DesignTokens.colors.semantic.info,
  "#7B1FA2",
  DesignTokens.colors.brand.terracotta,
  DesignTokens.colors.brand.camel,
  DesignTokens.colors.backgrounds.tertiary,
  "DesignTokens.colors.semantic.errorLight",
  "DesignTokens.colors.semantic.infoLight",
  "DesignTokens.colors.semantic.successLight",
  DesignTokens.colors.brand.terracottaLight,
  "DesignTokens.colors.neutral[400]",
  "#808080",
  "#4A4A4A",
  "#C6775C",
  "#2D5016",
];

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  visible?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  visible = true,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>选择颜色</Text>
      <FlatList
        data={PRESET_COLORS}
        keyExtractor={(item) => item}
        numColumns={5}
        scrollEnabled={false}
        renderItem={({ item: color }) => {
          const isSelected = selectedColor === color;
          return (
            <TouchableOpacity
              style={[
                styles.colorDot,
                { backgroundColor: color },
                isSelected && styles.colorDotSelected,
              ]}
              onPress={() => onColorChange(color)}
              activeOpacity={0.7}
            />
          );
        }}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  label: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: Spacing[2],
  },
  row: {
    justifyContent: "space-between",
    marginBottom: Spacing[2],
  },
  colorDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "DesignTokens.colors.borders.default",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
});

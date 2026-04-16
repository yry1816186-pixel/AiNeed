import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Spacing, flatColors as colors, DesignTokens } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

const PRESET_COLORS = [
  colors.neutral[900],
  colors.surface,
  colors.error,
  "#FF6B00",
  colors.warning,
  "#00C853",
  colors.info,
  "#7B1FA2",
  colors.primary,
  colors.primary,
  colors.backgroundTertiary,
  colors.errorLight,
  colors.infoLight,
  colors.successLight,
  colors.primaryLight,
  DesignTokens.colors.neutral[400],
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
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[11],
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
});

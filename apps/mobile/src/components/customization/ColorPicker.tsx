import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { theme, Spacing } from '../design-system/theme';

const PRESET_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#FF6B00",
  "#FFD700",
  "#00C853",
  "#2196F3",
  "#7B1FA2",
  "#E91E63",
  "#795548",
  "#F5F5DC",
  "#FFC0CB",
  "#87CEEB",
  "#98FB98",
  "#DDA0DD",
  "#C0C0C0",
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
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textPrimary,
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
    borderColor: "#E0E0E0",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
});

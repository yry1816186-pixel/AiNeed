import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';
import type { ClothingColor } from '../../services/clothing.service';

interface ColorChipsProps {
  colors: ClothingColor[];
  selectedColor: string | null;
  onSelectColor: (colorName: string) => void;
}

export const ColorChips: React.FC<ColorChipsProps> = ({
  colors,
  selectedColor,
  onSelectColor,
}) => {
  if (colors.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>颜色</Text>
      <View style={styles.chipsRow}>
        {colors.map((color) => {
          const isSelected = selectedColor === color.name;
          return (
            <TouchableOpacity
              key={color.name}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => onSelectColor(color.name)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`颜色: ${color.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: color.hex },
                  isSelected && styles.colorDotSelected,
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {color.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600' as const,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.gray100,
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: `${colors.accent}12`,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.accent,
    fontWeight: '600' as const,
  },
});

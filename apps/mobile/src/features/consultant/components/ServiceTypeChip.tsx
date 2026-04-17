import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface ServiceTypeChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const ServiceTypeChip: React.FC<ServiceTypeChipProps> = ({ label, selected, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected ? styles.textSelected : styles.textDefault]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const useStyles = createStyles((colors) => ({
  chip: {
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chipDefault: {
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: "colors.border",
  },
  chipSelected: {
    backgroundColor: "colors.primary",
    borderWidth: 1,
    borderColor: "colors.primary",
  },
  text: {
    fontSize: DesignTokens.typography.sizes.base,
  },
  textDefault: {
    color: colors.textSecondary,
  },
  textSelected: {
    color: colors.surface,
    fontWeight: "500",
  },
}))

export default ServiceTypeChip;

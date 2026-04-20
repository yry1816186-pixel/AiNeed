import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
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
}));

export default ServiceTypeChip;

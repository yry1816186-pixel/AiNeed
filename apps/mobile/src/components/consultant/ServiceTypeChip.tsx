import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../design-system/theme";

interface ServiceTypeChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const ServiceTypeChip: React.FC<ServiceTypeChipProps> = ({ label, selected, onPress }) => {
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

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipDefault: {
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipSelected: {
    backgroundColor: "#C67B5C",
    borderWidth: 1,
    borderColor: "#C67B5C",
  },
  text: {
    fontSize: DesignTokens.typography.sizes.base,
  },
  textDefault: {
    color: DesignTokens.colors.text.secondary,
  },
  textSelected: {
    color: DesignTokens.colors.backgrounds.primary,
    fontWeight: "500",
  },
});

export default ServiceTypeChip;

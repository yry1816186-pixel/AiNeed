import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";

interface ServiceTypeChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const ServiceTypeChip: React.FC<ServiceTypeChipProps> = ({
  label,
  selected,
  onPress,
}) => {
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
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chipSelected: {
    backgroundColor: "#C67B5C",
    borderWidth: 1,
    borderColor: "#C67B5C",
  },
  text: {
    fontSize: 14,
  },
  textDefault: {
    color: "#666",
  },
  textSelected: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
});

export default ServiceTypeChip;

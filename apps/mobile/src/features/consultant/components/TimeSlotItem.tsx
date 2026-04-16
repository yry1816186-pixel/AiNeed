import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../../design-system/theme";

interface TimeSlotItemProps {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export const TimeSlotItem: React.FC<TimeSlotItemProps> = ({
  startTime,
  endTime,
  isAvailable,
  isSelected,
  onSelect,
}) => {
  const variantStyle = !isAvailable
    ? styles.booked
    : isSelected
    ? styles.selected
    : styles.available;

  return (
    <TouchableOpacity
      style={[styles.container, variantStyle]}
      onPress={isAvailable ? onSelect : undefined}
      disabled={!isAvailable}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.time,
          !isAvailable ? styles.timeBooked : isSelected ? styles.timeSelected : null,
        ]}
      >
        {startTime} - {endTime}
      </Text>
      {!isAvailable ? (
        <Text style={styles.bookedLabel}>已预约</Text>
      ) : isSelected ? (
        <Text style={styles.selectedLabel}>已选择</Text>
      ) : (
        <Text style={styles.availableLabel}>可预约</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  available: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderColor: "DesignTokens.colors.borders.default",
  },
  booked: {
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    borderColor: "DesignTokens.colors.backgrounds.tertiary",
    opacity: 0.6,
  },
  selected: {
    backgroundColor: "#FFF8F5",
    borderColor: "DesignTokens.colors.brand.terracotta",
    borderWidth: 2,
  },
  time: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.primary,
    fontWeight: "500",
  },
  timeBooked: {
    color: DesignTokens.colors.text.tertiary,
  },
  timeSelected: {
    color: "DesignTokens.colors.brand.terracotta",
  },
  bookedLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
  },
  selectedLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "DesignTokens.colors.brand.terracotta",
    fontWeight: "500",
  },
  availableLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.semantic.success,
  },
});

export default TimeSlotItem;

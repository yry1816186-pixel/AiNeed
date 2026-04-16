import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../design-system/theme";

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
    borderColor: "#E0E0E0",
  },
  booked: {
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    borderColor: "#E8E8E8",
    opacity: 0.6,
  },
  selected: {
    backgroundColor: "#FFF8F5",
    borderColor: "#C67B5C",
    borderWidth: 2,
  },
  time: {
    fontSize: 15,
    color: DesignTokens.colors.text.primary,
    fontWeight: "500",
  },
  timeBooked: {
    color: DesignTokens.colors.text.tertiary,
  },
  timeSelected: {
    color: "#C67B5C",
  },
  bookedLabel: {
    fontSize: 12,
    color: DesignTokens.colors.text.tertiary,
  },
  selectedLabel: {
    fontSize: 12,
    color: "#C67B5C",
    fontWeight: "500",
  },
  availableLabel: {
    fontSize: 12,
    color: DesignTokens.colors.semantic.success,
  },
});

export default TimeSlotItem;

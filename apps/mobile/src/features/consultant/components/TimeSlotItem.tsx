import React from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  available: {
    backgroundColor: colors.surface,
    borderColor: "colors.border",
  },
  booked: {
    backgroundColor: colors.backgroundTertiary,
    borderColor: "colors.backgroundTertiary",
    opacity: 0.6,
  },
  selected: {
    backgroundColor: DesignTokens.colors.backgrounds.secondary, // warm-tinted bg,
    borderColor: "colors.primary",
    borderWidth: 2,
  },
  time: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  timeBooked: {
    color: colors.textTertiary,
  },
  timeSelected: {
    color: "colors.primary",
  },
  bookedLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  selectedLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.primary",
    fontWeight: "500",
  },
  availableLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.success,
  },
}))

export default TimeSlotItem;

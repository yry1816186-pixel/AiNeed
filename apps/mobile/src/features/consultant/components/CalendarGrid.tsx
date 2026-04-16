import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../../design-system/theme";

interface CalendarGridProps {
  selectedDate: string | null;
  availableDates: string[];
  onDateSelect: (date: string) => void;
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  selectedDate,
  availableDates,
  onDateSelect,
}) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const formatDate = (day: number): string => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${viewYear}-${m}-${d}`;
  };

  const isPast = (day: number): boolean => {
    const date = new Date(viewYear, viewMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date < todayStart;
  };

  const renderDays = () => {
    const cells: React.ReactNode[] = [];

    // Empty cells before the first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.cell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(day);
      const past = isPast(day);
      const available = availableSet.has(dateStr);
      const selected = selectedDate === dateStr;
      const disabled = past;

      cells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.cell,
            selected && styles.cellSelected,
            available && !selected && styles.cellAvailable,
          ]}
          onPress={() => !disabled && onDateSelect(dateStr)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dayText,
              disabled && styles.dayTextDisabled,
              selected && styles.dayTextSelected,
              available && !selected && !disabled && styles.dayTextAvailable,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const monthLabel = `${viewYear} 年 ${viewMonth + 1} 月`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>&lt;</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>&gt;</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayText}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>{renderDays()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
    minWidth: 44,
    alignItems: "center",
  },
  navBtnText: {
    fontSize: DesignTokens.typography.sizes.lg,
    color: DesignTokens.colors.text.primary,
  },
  monthLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}` as unknown as number,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 4,
  },
  cellSelected: {
    backgroundColor: "#C67B5C",
  },
  cellAvailable: {
    backgroundColor: "#FFF5F0",
  },
  dayText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.primary,
  },
  dayTextDisabled: {
    color: DesignTokens.colors.neutral[300],
  },
  dayTextSelected: {
    color: DesignTokens.colors.backgrounds.primary,
    fontWeight: "600",
  },
  dayTextAvailable: {
    color: "#C67B5C",
    fontWeight: "500",
  },
});

export default CalendarGrid;

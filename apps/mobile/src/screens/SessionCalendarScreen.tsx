import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../shared/contexts/ThemeContext';
import { useAiStylistStore } from "../stores/aiStylistStore";
import { DesignTokens } from "../theme/tokens/design-tokens";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export const SessionCalendarScreen: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const {
    calendarDays,
    archivedSessions,
    fetchCalendarDays,
    fetchArchivedSessions,
    setCurrentSessionId,
    fetchOutfitPlan,
  } = useAiStylistStore();

  useEffect(() => {
    void fetchCalendarDays(year, month);
  }, [year, month, fetchCalendarDays]);

  useEffect(() => {
    if (selectedDate) {
      void fetchArchivedSessions(selectedDate);
    }
  }, [selectedDate, fetchArchivedSessions]);

  const markedDates = new Set(calendarDays.map((d) => d.date));
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const handlePrevMonth = useCallback(() => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }, [month]);

  const handleDayPress = useCallback(
    (day: number) => {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setSelectedDate(dateStr);
    },
    [year, month]
  );

  const handleSessionPress = useCallback(
    async (sessionId: string) => {
      setCurrentSessionId(sessionId);
      await fetchOutfitPlan(sessionId);
    },
    [setCurrentSessionId, fetchOutfitPlan]
  );

  // Build calendar grid
  const calendarCells: { day: number | null; dateStr: string | null }[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarCells.push({ day: d, dateStr });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Outfit History</Text>
      </View>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <Pressable style={styles.navButton} onPress={handlePrevMonth}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.monthLabel}>{`${year} / ${String(month).padStart(2, "0")}`}</Text>
        <Pressable style={styles.navButton} onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {/* Day of week headers */}
      <View style={styles.weekHeader}>
        {DAYS_OF_WEEK.map((d) => (
          <View key={d} style={styles.weekHeaderCell}>
            <Text style={styles.weekHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarCells.map((cell, idx) => (
          <Pressable
            key={idx}
            style={[styles.dayCell, cell.dateStr === selectedDate && styles.dayCellSelected]}
            onPress={() => cell.day && handleDayPress(cell.day)}
            disabled={!cell.day}
          >
            {cell.day !== null && (
              <>
                <Text
                  style={[styles.dayText, cell.dateStr === selectedDate && styles.dayTextSelected]}
                >
                  {cell.day}
                </Text>
                {cell.dateStr && markedDates.has(cell.dateStr) && <View style={styles.dotMarker} />}
              </>
            )}
          </Pressable>
        ))}
      </View>

      {/* Session list for selected date */}
      <ScrollView style={styles.sessionList} contentContainerStyle={styles.sessionListContent}>
        {selectedDate && archivedSessions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No outfits for this date</Text>
          </View>
        )}
        {archivedSessions.map((session) => (
          <Pressable
            key={session.id}
            style={styles.sessionCard}
            onPress={() => handleSessionPress(session.id)}
          >
            <View style={styles.sessionCardInfo}>
              <Text style={styles.sessionGoal}>{session.goal || "AI Stylist Session"}</Text>
              <Text style={styles.sessionTime}>
                {new Date(session.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            {session.hasOutfitPlan && (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>Has Plan</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  navButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.text },
  weekHeader: { flexDirection: "row", paddingHorizontal: 8, marginBottom: 4 },
  weekHeaderCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  weekHeaderText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, fontWeight: "500" },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dayCell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 2,
  },
  dayCellSelected: { backgroundColor: DesignTokens.colors.brand.terracotta },
  dayText: { fontSize: DesignTokens.typography.sizes.base, color: colors.text },
  dayTextSelected: { color: DesignTokens.colors.neutral.white, fontWeight: "600" },
  dotMarker: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    marginTop: 2,
  },
  sessionList: { flex: 1, paddingHorizontal: 16, marginTop: 8 },
  sessionListContent: { paddingBottom: 24, gap: 8 },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionCardInfo: { flex: 1 },
  sessionGoal: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.textPrimary, marginBottom: 2 },
  sessionTime: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.brand.sageLight,
  },
  planBadgeText: { fontSize: DesignTokens.typography.sizes.xs, color: DesignTokens.colors.brand.sageDark, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary },
});

export default SessionCalendarScreen;

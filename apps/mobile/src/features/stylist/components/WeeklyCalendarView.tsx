import React, { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles, type FlatColors } from "../../../shared/contexts/ThemeContext";
import { DesignTokens } from "../../../design-system/theme";

export interface DayPlanData {
  id: string;
  plannedDate: string;
  outfitId: string | null;
  sceneTag: string | null;
  isSpecialEvent: boolean;
  eventName: string | null;
  source: string;
  outfit: {
    id: string;
    name: string | null;
    coverImage: string | null;
    occasions: string[];
    seasons: string[];
    style: string | null;
    rating: number | null;
  } | null;
  repeatWarning: boolean;
  weatherContext: {
    tempHigh?: number;
    tempLow?: number;
    condition?: string;
    humidity?: number;
  } | null;
}

export interface WeeklyCalendarViewProps {
  plans: DayPlanData[];
  selectedDate: string | null;
  onDayPress: (date: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getWeatherIcon(condition?: string): keyof typeof Ionicons.glyphMap {
  if (!condition) return "sunny-outline";
  if (condition.includes("雨")) return "rainy-outline";
  if (condition.includes("雪")) return "snow-outline";
  if (condition.includes("云") || condition.includes("阴")) return "cloudy-outline";
  if (condition.includes("雾") || condition.includes("霾")) return "cloud-outline";
  return "sunny-outline";
}

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  plans,
  selectedDate,
  onDayPress,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const scrollViewRef = useRef<ScrollView>(null);

  const planMap = useMemo(() => {
    const map = new Map<string, DayPlanData>();
    for (const plan of plans) {
      map.set(plan.plannedDate, plan);
    }
    return map;
  }, [plans]);

  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
      plan: DayPlanData | undefined;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayName: DAY_NAMES_CN[d.getDay()],
        dayNum: d.getDate(),
        isToday: i === 0,
        plan: planMap.get(dateStr),
      });
    }
    return days;
  }, [planMap]);

  const handleDayPress = useCallback(
    (dateStr: string) => {
      onDayPress(dateStr);
    },
    [onDayPress]
  );

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {weekDays.map((day) => {
        const isSelected = day.dateStr === selectedDate;
        const plan = day.plan;
        const weather = plan?.weatherContext;

        return (
          <Pressable
            key={day.dateStr}
            style={[styles.dayCard, isSelected && styles.dayCardSelected]}
            onPress={() => handleDayPress(day.dateStr)}
          >
            {/* Day header: name + date */}
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {day.dayName}
              </Text>
              <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>{day.dayNum}</Text>
            </View>

            {/* Weather icon */}
            {weather && (
              <View style={styles.weatherRow}>
                <Ionicons
                  name={getWeatherIcon(weather.condition)}
                  size={14}
                  color={isSelected ? colors.surface : colors.textTertiary}
                />
                <Text style={[styles.weatherTemp, isSelected && styles.weatherTempSelected]}>
                  {weather.tempHigh ?? "--"}°
                </Text>
              </View>
            )}

            {/* Scene tag pill */}
            {plan?.sceneTag && (
              <View style={[styles.scenePill, isSelected && styles.scenePillSelected]}>
                <Text style={[styles.sceneText, isSelected && styles.sceneTextSelected]}>
                  {plan.sceneTag}
                </Text>
              </View>
            )}

            {/* Special event dot */}
            {plan?.isSpecialEvent && (
              <View style={styles.eventDotContainer}>
                <View style={styles.eventDot} />
                {plan.eventName && (
                  <Text style={styles.eventName} numberOfLines={1}>
                    {plan.eventName}
                  </Text>
                )}
              </View>
            )}

            {/* Outfit thumbnail */}
            {plan?.outfit?.coverImage ? (
              <Image
                source={{ uri: plan.outfit.coverImage }}
                style={styles.outfitThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.outfitPlaceholder}>
                <Ionicons
                  name="shirt-outline"
                  size={20}
                  color={isSelected ? colors.surface : colors.textTertiary}
                />
              </View>
            )}

            {/* Repeat warning label */}
            {plan?.repeatWarning && (
              <View style={styles.repeatLabel}>
                <Ionicons name="warning-outline" size={10} color={colors.warning} />
                <Text style={styles.repeatText}>重复</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const useStyles = createStyles((colors: FlatColors) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    } as ViewStyle,
    dayCard: {
      width: 80,
      borderRadius: DesignTokens.borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: "center",
      gap: 6,
    } as ViewStyle,
    dayCardSelected: {
      borderColor: DesignTokens.colors.xuno.warmCamel,
      backgroundColor: colors.primaryLight,
      borderWidth: 2,
    } as ViewStyle,
    dayHeader: {
      alignItems: "center",
      gap: 2,
    } as ViewStyle,
    dayName: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: colors.textTertiary,
      fontWeight: "500",
    } as TextStyle,
    dayNameSelected: {
      color: colors.primaryDark,
    } as TextStyle,
    dayNum: {
      fontSize: DesignTokens.typography.sizes.lg,
      fontWeight: "700",
      color: colors.textPrimary,
    } as TextStyle,
    dayNumToday: {
      color: colors.primary,
    } as TextStyle,
    weatherRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    } as ViewStyle,
    weatherTemp: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: colors.textTertiary,
    } as TextStyle,
    weatherTempSelected: {
      color: colors.surface,
    } as TextStyle,
    scenePill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: colors.backgroundTertiary,
    } as ViewStyle,
    scenePillSelected: {
      backgroundColor: "rgba(255,255,255,0.3)",
    } as ViewStyle,
    sceneText: {
      fontSize: 9,
      color: colors.textSecondary,
      fontWeight: "500",
    } as TextStyle,
    sceneTextSelected: {
      color: colors.primaryDark,
    } as TextStyle,
    eventDotContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    } as ViewStyle,
    eventDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.warning,
    } as ViewStyle,
    eventName: {
      fontSize: 8,
      color: colors.textTertiary,
      maxWidth: 60,
    } as TextStyle,
    outfitThumbnail: {
      width: 48,
      height: 48,
      borderRadius: DesignTokens.borderRadius.md,
      backgroundColor: colors.backgroundTertiary,
    } as ImageStyle,
    outfitPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: DesignTokens.borderRadius.md,
      backgroundColor: colors.backgroundTertiary,
      alignItems: "center",
      justifyContent: "center",
    } as ViewStyle,
    repeatLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: "rgba(245, 158, 11, 0.1)",
    } as ViewStyle,
    repeatText: {
      fontSize: 8,
      color: colors.warning,
      fontWeight: "500",
    } as TextStyle,
  })
);

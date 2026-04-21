import { useMemo, memo, type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../../theme/tokens/design-tokens";
import type { WeatherData } from "../../stores/homeStore";
import { flatColors as colors } from "../../../../design-system/theme";
import { useTheme, createStyles } from "../../../../shared/contexts/ThemeContext";

interface WeatherGreetingProps {
  userName: string;
  weatherData: WeatherData | null;
  isLoading: boolean;
}

const WEATHER_ICON_MAP: Record<string, ComponentProps<typeof Ionicons>["name"]> = {
  sunny: "sunny",
  cloudy: "cloudy",
  rainy: "rainy",
  snowy: "snowy",
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "早上好";
  }
  if (hour >= 12 && hour < 18) {
    return "下午好";
  }
  return "晚上好";
};

const formatDate = (): string => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const weekDay = weekDays[now.getDay()];
  return `${month}月${day}日 周${weekDay}`;
};

const WeatherGreeting = memo(({ userName, weatherData, isLoading }: WeatherGreetingProps) => {
  const greeting = useMemo(() => getGreeting(), []);
  const dateStr = useMemo(() => formatDate(), []);
  const weatherIcon = useMemo(() => {
    if (!weatherData?.icon) {
      return "partly-sunny-outline" as const;
    }
    return WEATHER_ICON_MAP[weatherData.icon] ?? "partly-sunny-outline";
  }, [weatherData?.icon]);

  const { seasonAccent } = useTheme();
  const accentColor = seasonAccent?.accent ?? colors.primary;
  const styles = useStyles(colors);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonLine1} />
        <View style={styles.skeletonLine2} />
        <View style={styles.skeletonLine3} />
        <View style={styles.skeletonLine4} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.userName}>Hi, {userName}</Text>
      <Text style={styles.dateText}>{dateStr}</Text>
      {weatherData && (
        <>
          <View style={styles.weatherRow}>
            <Ionicons name={weatherIcon} size={20} color={accentColor} />
            <Text style={[styles.weatherText, { color: accentColor }]}>
              {weatherData.temperature}° · {weatherData.city}
            </Text>
          </View>
          {weatherData.suggestion ? (
            <Text style={styles.suggestionText}>今天的天气适合{weatherData.suggestion}</Text>
          ) : null}
          <View style={[styles.aiInsightRow, { backgroundColor: accentColor + "08" }]}>
            <Ionicons name="sparkles" size={14} color={accentColor} />
            <Text style={[styles.aiInsightText, { color: accentColor }]}>
              今日风格洞察：简约通勤风最适合今天的你
            </Text>
          </View>
        </>
      )}
    </View>
  );
});

WeatherGreeting.displayName = "WeatherGreeting";

const useStyles = createStyles((colors) => ({
  container: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "400",
    color: colors.textTertiary,
    marginBottom: 2,
  },
  userName: {
    fontSize: DesignTokens.typography.sizes["3xl"],
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginBottom: 10,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  weatherText: {
    fontSize: DesignTokens.typography.sizes.base,
  },
  suggestionText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  aiInsightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.primary + "08",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  aiInsightText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  skeletonLine1: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: 6,
  },
  skeletonLine2: {
    width: 140,
    height: 28,
    borderRadius: 6,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: 6,
  },
  skeletonLine3: {
    width: 100,
    height: 14,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: 10,
  },
  skeletonLine4: {
    width: 180,
    height: 14,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
}));

export { WeatherGreeting };
export type { WeatherGreetingProps };

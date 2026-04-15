import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { DesignTokens } from "../../theme/tokens/design-tokens";

interface WeatherBadgeProps {
  temperature: number;
  condition: string;
  location?: string;
  suggestion?: string;
}

const getWeatherIcon = (condition: string): string => {
  if (condition.includes("rain") || condition.includes("Rain")) {
    return "R";
  }
  if (condition.includes("snow") || condition.includes("Snow")) {
    return "W";
  }
  if (
    condition.includes("cloud") ||
    condition.includes("Cloud") ||
    condition.includes("overcast")
  ) {
    return "C";
  }
  return "S";
};

export const WeatherBadge: React.FC<WeatherBadgeProps> = ({
  temperature,
  condition,
  location,
  suggestion,
}) => {
  const [showSuggestion, setShowSuggestion] = useState(false);

  const icon = getWeatherIcon(condition);

  return (
    <Pressable style={styles.container} onPress={() => setShowSuggestion(!showSuggestion)}>
      <View style={styles.badgeContent}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.temperature}>{`${temperature}C`}</Text>
        <Text style={styles.condition}>{condition}</Text>
        {location && <Text style={styles.location}>{location}</Text>}
      </View>
      {showSuggestion && suggestion && <Text style={styles.suggestion}>{suggestion}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  icon: {
    fontSize: 14,
    color: DesignTokens.colors.brand.sage,
    fontWeight: "700",
  },
  temperature: {
    fontSize: 13,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
  },
  condition: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[500],
  },
  location: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[400],
  },
  suggestion: {
    fontSize: 12,
    color: DesignTokens.colors.neutral[600],
    marginTop: 4,
    lineHeight: 16,
  },
});

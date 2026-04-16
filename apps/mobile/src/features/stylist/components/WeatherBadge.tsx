import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 16,
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  badgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  icon: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.secondary,
    fontWeight: "700",
  },
  temperature: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
  },
  condition: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
  },
  location: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.neutral[400],
  },
  suggestion: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[600],
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
}))

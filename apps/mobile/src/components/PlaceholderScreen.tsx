import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "../polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';

interface PlaceholderScreenProps {
  route: {
    name: string;
    params?: Record<string, unknown>;
  };
}

export function PlaceholderScreen({ route }: PlaceholderScreenProps) {
  const phase = route.params?.phase as number | undefined;
  const title = (route.params?.title as string | undefined) || route.name;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="construct-outline" size={48} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {phase !== null && (
        <View style={styles.phaseBadge}>
          <Text style={styles.phaseText}>Phase {phase}</Text>
        </View>
      )}
      <Text style={styles.comingSoon}>Coming Soon</Text>
      <Text style={styles.description}>此功能正在开发中，敬请期待</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  phaseBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  comingSoon: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: "center",
  },
});

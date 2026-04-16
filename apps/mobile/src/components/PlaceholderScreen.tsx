import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "../polyfills/expo-vector-icons";
import { useTheme, createStyles } from 'undefined';
import { DesignTokens } from "../design-system/theme/tokens/design-tokens";

interface PlaceholderScreenProps {
  route: {
    name: string;
    params?: Record<string, unknown>;
  };
}

export function PlaceholderScreen({ route }: PlaceholderScreenProps) {
    const { colors } = useTheme();
  const phase = route.params?.phase as number | undefined;
  const title = (route.params?.title as string | undefined) || route.name;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="construct-outline" size={48} color={colors.primary} />
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
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  phaseBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  phaseText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.surface,
  },
  comingSoon: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  description: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    textAlign: "center",
  },
});

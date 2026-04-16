import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../stores/index";
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";
import { Spacing, flatColors as colors } from '../../design-system/theme';


interface VipGuardProps {
  children: React.ReactNode;
  onNotVip?: () => void;
  featureName?: string;
}

export function VipGuard({ children, onNotVip, featureName = "该功能" }: VipGuardProps) {
    const { colors } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isVip = useAuthStore((state) => state.isVip);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isVip && !hasTriggered.current) {
      hasTriggered.current = true;
      onNotVip?.();
    }
    if (isVip) {
      hasTriggered.current = false;
    }
  }, [isAuthenticated, isVip, onNotVip]);

  if (!isAuthenticated) {
    return null;
  }

  if (!isVip) {
    return (
      <View style={s.container}>
        <View style={s.iconCircle}>
          <Ionicons name="lock-closed" size={28} color={colors.primary} />
        </View>
        <Text style={s.title}>{featureName}为 VIP 专属</Text>
        <Text style={s.subtitle}>升级 VIP 尊享全部高级功能</Text>
        <TouchableOpacity style={s.upgradeBtn} onPress={onNotVip} activeOpacity={0.7}>
          <Ionicons name="star" size={16} color={colors.surface} />
          <Text style={s.upgradeText}>升级 VIP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: colors.background,
  },
  iconCircle: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
    backgroundColor: colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing['1.5'],
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['1.5'],
    backgroundColor: colors.primary,
    paddingHorizontal: DesignTokens.spacing[7],
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  upgradeText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});

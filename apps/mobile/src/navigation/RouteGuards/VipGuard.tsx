import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../stores/index";
import { theme } from '../../design-system/theme';
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";

interface VipGuardProps {
  children: React.ReactNode;
  onNotVip?: () => void;
  featureName?: string;
}

export function VipGuard({ children, onNotVip, featureName = "该功能" }: VipGuardProps) {
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
          <Ionicons name="lock-closed" size={28} color={theme.colors.primary} />
        </View>
        <Text style={s.title}>{featureName}为 VIP 专属</Text>
        <Text style={s.subtitle}>升级 VIP 尊享全部高级功能</Text>
        <TouchableOpacity style={s.upgradeBtn} onPress={onNotVip} activeOpacity={0.7}>
          <Ionicons name="star" size={16} color={DesignTokens.colors.backgrounds.primary} />
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
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: 15,
    fontWeight: "600",
  },
});

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Typography } from '../design-system/theme';

export type ErrorType = "network" | "server" | "permission" | "timeout";

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const ERROR_CONFIG: Record<ErrorType, { icon: string; title: string; description: string }> = {
  network: { icon: "wifi-outline", title: "网络不给力", description: "请检查网络连接后重试" },
  server: {
    icon: "server-outline",
    title: "服务器开小差了",
    description: "我们正在修复，请稍后再试",
  },
  permission: {
    icon: "lock-closed-outline",
    title: "没有权限",
    description: "你暂无权限访问此内容",
  },
  timeout: {
    icon: "hourglass-outline",
    title: "请求超时",
    description: "网络响应时间过长，请重试",
  },
};

export function ErrorState({
  type = "network",
  title,
  description,
  onRetry,
  retryLabel = "重试",
  accessibilityLabel,
  style,
}: ErrorStateProps) {
  const config = ERROR_CONFIG[type];
  const displayTitle = title || config.title;
  const displayDesc = description || config.description;
  const label = accessibilityLabel || `错误: ${displayTitle}`;

  return (
    <Animated.View
      entering={FadeInUp.duration(500).springify()}
      style={[styles.container, style]}
      accessibilityLabel={label}
      accessibilityRole="alert"
    >
      <View style={styles.iconContainer}>
        <Ionicons name={config.icon} size={56} color={Colors.error[500]} />
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.description}>{displayDesc}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          activeOpacity={0.8}
          accessibilityLabel={retryLabel}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color={Colors.neutral.white} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing[10] },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.error[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[6],
  },
  title: {
    ...Typography.heading.lg,
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  description: {
    ...Typography.body.md,
    color: Colors.neutral[500],
    textAlign: "center",
    maxWidth: 280,
    marginBottom: Spacing[6],
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
    elevation: 3,
  },
  retryText: { ...Typography.styles.button, color: Colors.neutral.white },
});

export default ErrorState;

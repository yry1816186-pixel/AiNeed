import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  onReport?: () => void;
  showIllustration?: boolean;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "出错了",
  message = "抱歉，发生了一些错误，请稍后重试",
  errorCode,
  onRetry,
  onReport,
  showIllustration = true,
  style,
}) => {
  const styles = useStyles(colors);
  const shakeX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, springConfig);

    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={[styles.errorContainer, containerAnimatedStyle, style]}>
      {showIllustration && (
        <AnimatedView style={[styles.errorIllustration, shakeAnimatedStyle]}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="warning" size={64} color={colors.error[500]} />
          </View>
          <View style={styles.errorDecorations}>
            <View style={[styles.errorDot, styles.errorDot1]} />
            <View style={[styles.errorDot, styles.errorDot2]} />
            <View style={[styles.errorDot, styles.errorDot3]} />
          </View>
        </AnimatedView>
      )}

      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>

      {errorCode && (
        <View style={styles.errorCodeContainer}>
          <Text style={styles.errorCodeLabel}>错误代码</Text>
          <Text style={styles.errorCodeValue}>{errorCode}</Text>
        </View>
      )}

      <View style={styles.errorActions}>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh" size={18} color={colors.textInverse} />
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        )}
        {onReport && (
          <TouchableOpacity style={styles.reportButton} onPress={onReport}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.neutral[600]} />
            <Text style={styles.reportText}>反馈问题</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedView>
  );
};

export interface MaintenanceScreenProps {
  estimatedTime?: string;
  message?: string;
  style?: ViewStyle;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  estimatedTime,
  message = "我们正在进行系统维护，请稍后再试",
  style,
}) => {
  const styles = useStyles(colors);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const gearAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView style={[styles.maintenanceContainer, containerAnimatedStyle, style]}>
      <View style={styles.maintenanceIconContainer}>
        <AnimatedView style={gearAnimatedStyle}>
          <Ionicons name="settings" size={64} color={colors.primary[500]} />
        </AnimatedView>
        <View style={styles.maintenanceTools}>
          <Ionicons name="construct" size={28} color={colors.warning[500]} />
        </View>
      </View>

      <Text style={styles.maintenanceTitle}>系统维护中</Text>
      <Text style={styles.maintenanceMessage}>{message}</Text>

      {estimatedTime && (
        <View style={styles.estimatedTimeContainer}>
          <Ionicons name="time-outline" size={18} color={colors.neutral[500]} />
          <Text style={styles.estimatedTimeText}>预计恢复时间：{estimatedTime}</Text>
        </View>
      )}

      <View style={styles.maintenanceTips}>
        <Text style={styles.maintenanceTipsTitle}>您可以：</Text>
        <Text style={styles.maintenanceTip}>• 稍后刷新页面重试</Text>
        <Text style={styles.maintenanceTip}>• 关注我们的社交媒体获取最新动态</Text>
      </View>
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorIllustration: {
    marginBottom: 24,
    alignItems: "center",
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.error[500]}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  errorDecorations: {
    position: "absolute",
    width: 140,
    height: 140,
  },
  errorDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error[300],
  },
  errorDot1: {
    top: 10,
    left: 20,
  },
  errorDot2: {
    top: 30,
    right: 15,
  },
  errorDot3: {
    bottom: 20,
    left: 30,
  },
  errorTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  errorCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorCodeLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
    marginRight: 8,
  },
  errorCodeValue: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.neutral[700],
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  reportText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.neutral[600],
  },
  maintenanceContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  maintenanceIconContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  maintenanceTools: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.warning[500]}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  maintenanceTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  maintenanceMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  estimatedTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  estimatedTimeText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[600],
  },
  maintenanceTips: {
    backgroundColor: colors.neutral[50],
    padding: 16,
    borderRadius: 12,
    width: "100%",
  },
  maintenanceTipsTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.neutral[700],
    marginBottom: 8,
  },
  maintenanceTip: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
    lineHeight: 20,
    marginBottom: 4,
  },
}));

import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

export interface NetworkErrorProps {
  onRetry?: () => void;
  onSettings?: () => void;
  style?: ViewStyle;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, onSettings, style }) => {
  const styles = useStyles(colors);
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView style={[styles.networkContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.networkIconContainer, pulseAnimatedStyle]}>
        <View style={styles.networkIconBg}>
          <Ionicons name="cloud-offline" size={56} color={colors.neutral[400]} />
        </View>
        <View style={styles.networkWaves}>
          <View style={[styles.networkWave, styles.networkWave1]} />
          <View style={[styles.networkWave, styles.networkWave2]} />
          <View style={[styles.networkWave, styles.networkWave3]} />
        </View>
      </AnimatedView>

      <Text style={styles.networkTitle}>网络连接失败</Text>
      <Text style={styles.networkMessage}>请检查您的网络连接后重试</Text>

      <View style={styles.networkActions}>
        {onRetry && (
          <TouchableOpacity style={styles.networkRetryButton} onPress={onRetry}>
            <LinearGradient
              colors={[DesignTokens.colors.brand.slateLight, DesignTokens.colors.brand.slateDark]}
              style={styles.networkRetryGradient}
            >
              <Ionicons name="refresh" size={18} color={colors.textInverse} />
              <Text style={styles.networkRetryText}>重试</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {onSettings && (
          <TouchableOpacity style={styles.networkSettingsButton} onPress={onSettings}>
            <Ionicons name="settings-outline" size={18} color={colors.neutral[600]} />
            <Text style={styles.networkSettingsText}>网络设置</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  networkContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  networkIconContainer: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  networkIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  networkWaves: {
    position: "absolute",
    width: 160,
    height: 160,
  },
  networkWave: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    opacity: 0.5,
  },
  networkWave1: {
    top: 0,
    right: 0,
  },
  networkWave2: {
    bottom: 20,
    left: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  networkWave3: {
    top: 30,
    left: 0,
    width: 25,
    height: 25,
    borderRadius: 12.5,
  },
  networkTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.neutral[800],
    textAlign: "center",
    marginBottom: 8,
  },
  networkMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  networkActions: {
    alignItems: "center",
    gap: 12,
  },
  networkRetryButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  networkRetryGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  networkRetryText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  networkSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  networkSettingsText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[600],
    fontWeight: "500",
  },
}));

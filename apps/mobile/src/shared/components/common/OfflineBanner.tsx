import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Colors, Shadows, Spacing } from '../../../design-system/theme';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../contexts/ThemeContext';

export const OfflineBanner: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const { isConnected } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-60)).current;
  const isOffline = isConnected === false;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isOffline ? 0 : -60,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }, [isOffline, translateY]);

  if (isConnected === null) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      pointerEvents={isOffline ? "auto" : "none"}
    >
      <Ionicons name="cloud-offline" size={16} color={colors.surface} />
      <Text style={styles.text}>网络不可用，部分功能受限</Text>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.warning?.[500] || colors.warning,
    ...Shadows.sm,
  },
  text: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.surface,
  },
}))

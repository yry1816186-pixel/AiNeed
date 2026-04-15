import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Colors, Spacing, Typography, ZIndex } from '../design-system/theme';

interface NetworkAwareProps {
  children: React.ReactNode;
  offlineMessage?: string;
  onNetworkChange?: (isConnected: boolean | null) => void;
  showBanner?: boolean;
}

export function NetworkAware({
  children,
  offlineMessage = "网络不可用，部分功能受限",
  onNetworkChange,
  showBanner = true,
}: NetworkAwareProps) {
  const { isConnected } = useNetworkStatus();
  const translateY = useSharedValue(-60);
  const isOffline = isConnected === false;

  useEffect(() => {
    onNetworkChange?.(isConnected);
  }, [isConnected, onNetworkChange]);

  useEffect(() => {
    translateY.value = withSpring(isOffline ? 0 : -60, {
      damping: 20,
      stiffness: 300,
    });
  }, [isOffline, translateY]);

  const bannerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (isConnected === null) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      {children}
      {showBanner && (
        <Animated.View
          style={[styles.banner, bannerAnimatedStyle]}
          pointerEvents={isOffline ? "auto" : "none"}
          accessibilityLabel={offlineMessage}
          accessibilityRole="alert"
        >
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.neutral[0]} />
          <Text style={styles.bannerText}>{offlineMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export function withNetworkAware<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { offlineMessage?: string; showBanner?: boolean }
) {
  const ComponentWithNetwork: React.FC<P> = (props) => (
    <NetworkAware offlineMessage={options?.offlineMessage} showBanner={options?.showBanner}>
      <WrappedComponent {...props} />
    </NetworkAware>
  );
  ComponentWithNetwork.displayName = `withNetworkAware(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;
  return ComponentWithNetwork;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: ZIndex.toast,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.warning[500],
    elevation: 4,
  },
  bannerText: { ...Typography.caption.md, color: Colors.neutral[0], fontWeight: "600" },
});

export default NetworkAware;

import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Colors, Shadows } from '../design-system/theme';

export const OfflineBanner: React.FC = () => {
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
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={styles.text}>网络不可用，部分功能受限</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    backgroundColor: Colors.warning?.[500] || "#f59e0b",
    ...Shadows.sm,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
});

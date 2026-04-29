export { useToast, ToastProvider } from "../../primitives/Toast/Toast";

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type ToastVariant = "success" | "error" | "warning" | "info";
export type ToastPosition = "top" | "bottom";

export interface ToastProps {
  variant?: ToastVariant;
  message: string;
  duration?: number;
  position?: ToastPosition;
  visible?: boolean;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, visible, variant = "info" }) => {
  if (!visible) return null;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 8, backgroundColor: "#EEF1F4" },
  text: { fontSize: 14, color: "#1A1A18" },
});

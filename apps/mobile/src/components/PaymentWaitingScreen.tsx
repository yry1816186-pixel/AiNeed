import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentApi } from "../services/api/commerce.api";
import { DesignTokens } from "../design-system/theme";

interface PaymentWaitingScreenProps {
  orderId: string;
  onSuccess: () => void;
  onTimeout: () => void;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

export const PaymentWaitingScreen: React.FC<PaymentWaitingScreenProps> = ({
  orderId,
  onSuccess,
  onTimeout,
}) => {
  const [timedOut, setTimedOut] = useState(false);
  const pollCountRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(interval);
        setTimedOut(true);
        return;
      }

      try {
        const response = await paymentApi.pollPaymentStatus(orderId);
        if (response.success && response.data?.paid) {
          clearInterval(interval);
          onSuccess();
        }
      } catch {
        // Continue polling on network errors
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [orderId, onSuccess]);

  if (timedOut) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.timeoutIcon}>!</Text>
          <Text style={styles.timeoutTitle}>支付超时</Text>
          <Text style={styles.timeoutMessage}>支付超时，请手动查看订单状态</Text>
          <TouchableOpacity style={styles.actionButton} onPress={onTimeout}>
            <Text style={styles.actionButtonText}>查看订单</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="DesignTokens.colors.semantic.error" />
        <Text style={styles.pollingText}>正在查询支付结果...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.backgrounds.primary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pollingText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: DesignTokens.colors.text.secondary,
    marginTop: 16,
  },
  timeoutIcon: {
    fontSize: DesignTokens.typography.sizes['5xl'],
    fontWeight: "700",
    color: "DesignTokens.colors.semantic.error",
  },
  timeoutTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    marginTop: 12,
  },
  timeoutMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.tertiary,
    marginTop: 8,
    textAlign: "center",
  },
  actionButton: {
    marginTop: 24,
    backgroundColor: "DesignTokens.colors.semantic.error",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionButtonText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});

import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { paymentApi } from '../../../services/api/commerce.api';
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
        <ActivityIndicator size="large" color="colors.error" />
        <Text style={styles.pollingText}>正在查询支付结果...</Text>
      </View>
    </SafeAreaView>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[5],
  },
  pollingText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    marginTop: Spacing.md,
  },
  timeoutIcon: {
    fontSize: DesignTokens.typography.sizes['5xl'],
    fontWeight: "700",
    color: "colors.error",
  },
  timeoutTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: DesignTokens.spacing[3],
  },
  timeoutMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  actionButton: {
    marginTop: Spacing.lg,
    backgroundColor: "colors.error",
    paddingHorizontal: Spacing.xl,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
}))

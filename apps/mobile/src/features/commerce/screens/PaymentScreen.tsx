import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { useScreenTracking } from '../../../hooks/useAnalytics';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Spacing } from '../../../design-system/theme';
import { haptics } from '../../../utils/haptics';
import { paymentApi, orderApi } from '../../../services/api/commerce.api';
import type { Order } from '../../../types';
import type { ProfileStackParamList } from '../../../navigation/types';
import type { RootStackParamList } from '../../../types/navigation';


type PaymentRoute = RouteProp<ProfileStackParamList, "Payment">;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

type PaymentProvider = "alipay" | "wechat";

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PaymentRoute>();
  useScreenTracking("Payment");
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>("alipay");
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    void (async () => {
      try {
        const response = await orderApi.getById(orderId);
        if (response.success && response.data && isMountedRef.current) {
          setOrder(response.data);
        }
      } catch {
        // Order details non-critical for payment flow
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [orderId]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    setPolling(true);
    pollTimerRef.current = setInterval(async () => {
      if (!orderId) {
        return;
      }
      try {
        const response = await paymentApi.pollPaymentStatus(orderId);
        if (response.success && response.data?.paid) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
          }
          setPolling(false);
          haptics.success();
          Alert.alert("支付成功", "您的订单已提交", [
            {
              text: "查看订单",
              onPress: () => navigation.navigate("OrderDetail", { orderId }),
            },
            { text: "返回首页", onPress: () => navigation.navigate("HomeFeed") },
          ]);
        }
      } catch {
        // Continue polling on network error
      }
    }, 3000);
  }, [orderId, navigation]);

  const handlePayment = useCallback(async () => {
    if (!orderId) {
      return;
    }
    const amount = order?.totalAmount ?? 0;
    const providerLabel = selectedProvider === "alipay" ? "支付宝" : "微信支付";
    Alert.alert(
      "确认支付",
      `将通过${providerLabel}支付 ¥${amount.toFixed(2)}，确认继续？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认支付",
          onPress: async () => {
            setPaying(true);
            try {
              const response = await paymentApi.createPayment(orderId, selectedProvider);
              if (response.success && response.data) {
                startPolling();
                Alert.alert(
                  "支付已发起",
                  `请通过${providerLabel}完成支付`
                );
              } else {
                Alert.alert("支付失败", response.error?.message || "无法发起支付");
              }
            } catch {
              Alert.alert("错误", "网络异常，请重试");
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  }, [orderId, selectedProvider, startPolling, order]);

  const formatPrice = (amount: number) => `¥${amount.toFixed(2)}`;

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>支付</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>支付</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.content}>
        {/* Order summary */}
        {order && (
          <View style={s.orderCard}>
            <Text style={s.sectionTitle}>订单摘要</Text>
            <View style={s.orderRow}>
              <Text style={s.orderLabel}>订单号</Text>
              <Text style={s.orderValue}>{order.id.slice(0, 8)}...</Text>
            </View>
            <View style={s.orderRow}>
              <Text style={s.orderLabel}>商品</Text>
              <Text style={s.orderValue}>{order.items.length} 件</Text>
            </View>
            <View style={[s.orderRow, s.totalRow]}>
              <Text style={s.totalLabel}>合计</Text>
              <Text style={s.totalPrice}>{formatPrice(order.totalAmount)}</Text>
            </View>
          </View>
        )}

        {/* Payment methods */}
        <View style={s.paymentSection}>
          <Text style={s.sectionTitle}>支付方式</Text>

          <TouchableOpacity
            style={[s.paymentOption, selectedProvider === "alipay" && s.paymentOptionSelected]}
            onPress={() => setSelectedProvider("alipay")}
            activeOpacity={0.7}
          >
            <View style={[s.providerIcon, { backgroundColor: "colors.info" /* custom color */ }]}>
              <Text style={s.providerIconText}>A</Text>
            </View>
            <View style={s.providerInfo}>
              <Text style={s.providerName}>支付宝</Text>
              <Text style={s.providerDesc}>使用支付宝支付</Text>
            </View>
            <View style={[s.radio, selectedProvider === "alipay" && s.radioSelected]}>
              {selectedProvider === "alipay" && <View style={s.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.paymentOption, selectedProvider === "wechat" && s.paymentOptionSelected]}
            onPress={() => setSelectedProvider("wechat")}
            activeOpacity={0.7}
          >
            <View style={[s.providerIcon, { backgroundColor: "colors.success" /* custom color */ }]}>
              <Text style={s.providerIconText}>W</Text>
            </View>
            <View style={s.providerInfo}>
              <Text style={s.providerName}>微信支付</Text>
              <Text style={s.providerDesc}>使用微信支付</Text>
            </View>
            <View style={[s.radio, selectedProvider === "wechat" && s.radioSelected]}>
              {selectedProvider === "wechat" && <View style={s.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {polling && (
          <View style={s.pollingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s.pollingText}>等待支付确认中...</Text>
          </View>
        )}
      </View>

      {/* Pay button */}
      <View style={s.footer}>
        <View style={s.footerTotal}>
          <Text style={s.footerTotalLabel}>合计</Text>
          <Text style={s.footerTotalPrice}>{formatPrice(order?.totalAmount ?? 0)}</Text>
        </View>
        <TouchableOpacity
          style={[s.payButton, paying && s.payButtonDisabled]}
          onPress={handlePayment}
          disabled={paying || polling}
        >
          {paying ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={s.payButtonText}>立即支付</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: colors.text },
  iconBtn: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, padding: Spacing.md},
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: DesignTokens.spacing[5],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "700", color: colors.textPrimary, marginBottom: DesignTokens.spacing['3.5']},
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing['1.5'],
  },
  orderLabel: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  orderValue: { fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, fontWeight: "500" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: Spacing.sm,
    paddingTop: DesignTokens.spacing[3],
  },
  totalLabel: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  totalPrice: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.primary },
  paymentSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing['3.5'],
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  paymentOptionSelected: {
    backgroundColor: colors.subtleBg,
    borderRadius: 10,
    marginHorizontal: -8,
    paddingHorizontal: Spacing.sm,
  },
  providerIcon: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  providerIconText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700" },
  providerInfo: { flex: 1, marginLeft: DesignTokens.spacing[3]},
  providerName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.text },
  providerDesc: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.primary },
  radioInner: { width: DesignTokens.spacing[3], height: DesignTokens.spacing[3], borderRadius: 6, backgroundColor: colors.primary },
  pollingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: DesignTokens.spacing[3],
    marginTop: Spacing.md,
    backgroundColor: colors.subtleBg,
    borderRadius: 10,
  },
  pollingText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerTotal: { flex: 1 },
  footerTotalLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  footerTotalPrice: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.primary },
  payButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: DesignTokens.spacing[9],
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 24,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.md, fontWeight: "700" },
});

export default PaymentScreen;

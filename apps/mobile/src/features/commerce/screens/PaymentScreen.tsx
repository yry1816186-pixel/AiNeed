import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useScreenTracking } from "../hooks/useAnalytics";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { haptics } from "../utils/haptics";
import { paymentApi, orderApi } from "../services/api/commerce.api";
import type { Order } from "../types";
import type { ProfileStackParamList } from "../navigation/types";
import type { RootStackParamList } from "../types/navigation";

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
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>支付</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
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
            <View style={[s.providerIcon, { backgroundColor: "#1677FF" /* custom color */ }]}>
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
            <View style={[s.providerIcon, { backgroundColor: "#07C160" /* custom color */ }]}>
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
            <ActivityIndicator size="small" color={theme.colors.primary} />
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
            <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
          ) : (
            <Text style={s.payButtonText}>立即支付</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, padding: 16 },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text, marginBottom: 14 },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  orderLabel: { fontSize: 14, color: theme.colors.textSecondary },
  orderValue: { fontSize: 14, color: theme.colors.text, fontWeight: "500" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  totalPrice: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  paymentSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  paymentOptionSelected: {
    backgroundColor: theme.colors.subtleBg,
    borderRadius: 10,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  providerIconText: { color: DesignTokens.colors.neutral.white, fontSize: 18, fontWeight: "700" },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
  providerDesc: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: theme.colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary },
  pollingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
    backgroundColor: theme.colors.subtleBg,
    borderRadius: 10,
  },
  pollingText: { fontSize: 13, color: theme.colors.textSecondary },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerTotal: { flex: 1 },
  footerTotalLabel: { fontSize: 12, color: theme.colors.textSecondary },
  footerTotalPrice: { fontSize: 20, fontWeight: "700", color: theme.colors.primary },
  payButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 24,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: theme.colors.surface, fontSize: 16, fontWeight: "700" },
});

export default PaymentScreen;

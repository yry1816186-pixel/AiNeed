import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { orderApi, orderEnhancementApi, refundApi } from '../../../services/api/commerce.api';
import type { Order } from '../../../types';
import type { RootStackParamList } from '../../../types/navigation';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Spacing } from '../../../design-system/theme';


type Navigation = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, "OrderDetail">;

interface TrackingStep {
  status: string;
  time: string;
  description: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "待支付", color: colors.warning },
  paid: { label: "待发货", color: colors.primary },
  confirmed: { label: "已确认", color: colors.primary },
  processing: { label: "处理中", color: "colors.info" },
  shipped: { label: "配送中", color: "colors.info" },
  delivered: { label: "已签收", color: colors.success },
  cancelled: { label: "已取消", color: colors.error },
  refunded: { label: "已退款", color: colors.textTertiary },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const [order, setOrder] = useState<Order | null>(null);
  const [trackingSteps, setTrackingSteps] = useState<TrackingStep[]>([]);
  const [trackingError, setTrackingError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [detailResponse, trackingResponse] = await Promise.all([
          orderApi.getById(route.params.orderId),
          orderApi.track(route.params.orderId),
        ]);

        if (detailResponse.success && detailResponse.data) {
          setOrder(detailResponse.data);
        } else {
          setOrder(null);
        }

        if (trackingResponse.success && trackingResponse.data) {
          setTrackingSteps(
            trackingResponse.data.timeline.map((step) => ({
              status: step.status,
              time: step.time,
              description: step.description,
            }))
          );
          setTrackingError("");
        } else {
          setTrackingSteps([]);
          setTrackingError(trackingResponse.error?.message ?? "当前订单还没有物流轨迹。");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [route.params.orderId]
  );

  useEffect(() => {
    void loadOrder("initial");
  }, [loadOrder]);

  const statusMeta = useMemo(() => {
    if (!order) {
      return null;
    }

    return (
      STATUS_META[order.status] ?? {
        label: order.status,
        color: colors.textSecondary,
      }
    );
  }, [order]);

  const handleCancel = useCallback(async () => {
    if (!order) {
      return;
    }

    setCancelling(true);
    try {
      const response = await orderApi.cancel(order.id);
      if (response.success) {
        await loadOrder("refresh");
      }
    } finally {
      setCancelling(false);
    }
  }, [loadOrder, order]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="返回"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>订单详情</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => void loadOrder("refresh")}
          accessibilityLabel="刷新订单"
        >
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>订单不存在或已失效</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>返回订单列表</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOrder("refresh")}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.heroCard}>
            <View>
              <Text style={styles.heroLabel}>订单号</Text>
              <Text style={styles.heroValue}>{order.id}</Text>
            </View>
            {statusMeta ? (
              <View style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}16` }]}>
                <Text style={[styles.statusText, { color: statusMeta.color }]}>
                  {statusMeta.label}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>商品明细</Text>
            {order.items.map((item) => (
              <View key={item.id} style={styles.orderItemRow}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImageFallback}>
                    <Ionicons name="shirt-outline" size={18} color={colors.textTertiary} />
                  </View>
                )}
                <View style={styles.itemContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.color || "默认色"} / {item.size || "默认尺码"} x {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {"\u00A5"}
                  {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>收货信息</Text>
            <Text style={styles.addressName}>
              {order.shippingAddress.name} {order.shippingAddress.phone}
            </Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.province}
              {order.shippingAddress.city}
              {order.shippingAddress.district}
              {order.shippingAddress.detail}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>下单时间</Text>
              <Text style={styles.summaryValue}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>订单金额</Text>
              <Text style={styles.summaryTotal}>
                {"\u00A5"}
                {order.totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>物流进度</Text>
            {trackingSteps.length > 0 ? (
              trackingSteps.map((step, index) => (
                <View key={`${step.status}-${step.time}-${index}`} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
                    {index !== trackingSteps.length - 1 ? (
                      <View style={styles.timelineLine} />
                    ) : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{step.status}</Text>
                    <Text style={styles.timelineDescription}>{step.description}</Text>
                    <Text style={styles.timelineTime}>{formatDate(step.time)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.timelineEmpty}>
                {trackingError || "当前订单还没有物流轨迹。"}
              </Text>
            )}
          </View>

          {order.status === "pending" ? (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() => void handleCancel()}
              disabled={cancelling}
              accessibilityLabel="取消订单"
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="colors.error" />
              ) : (
                <Text style={styles.dangerButtonText}>取消订单</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {order.status === "paid" ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert("申请退款", "确认申请仅退款？", [
                    { text: "取消", style: "cancel" },
                    {
                      text: "确认",
                      onPress: async () => {
                        await refundApi.createRefund({
                          orderId: order.id,
                          type: "REFUND_ONLY",
                          reason: "不想要了",
                        });
                        await loadOrder("refresh");
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.secondaryButtonText}>申请退款</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert("申请退货退款", "确认申请退货退款？", [
                    { text: "取消", style: "cancel" },
                    {
                      text: "确认",
                      onPress: async () => {
                        await refundApi.createRefund({
                          orderId: order.id,
                          type: "RETURN_REFUND",
                          reason: "不想要了",
                        });
                        await loadOrder("refresh");
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.secondaryButtonText}>申请退货退款</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {order.status === "shipped" ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryButtonFilled}
                onPress={() => {
                  Alert.alert("确认收货", "确认已收到商品？", [
                    { text: "取消", style: "cancel" },
                    {
                      text: "确认",
                      onPress: async () => {
                        await orderEnhancementApi.confirmReceipt(order.id);
                        await loadOrder("refresh");
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.primaryFilledText}>确认收货</Text>
              </TouchableOpacity>
              {trackingSteps.length > 0 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate("OrderDetail", { orderId: order.id } as never)}
                >
                  <Text style={styles.secondaryButtonText}>查看物流</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {order.status === "delivered" ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  navigation.navigate("MainTabs", { screen: "Home" } as never);
                }}
              >
                <Text style={styles.secondaryButtonText}>再次购买</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.backgroundTertiary",
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: DesignTokens.spacing[3],
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: DesignTokens.spacing[5],
    paddingBottom: DesignTokens.spacing[7],
    gap: Spacing.md,
  },
  heroCard: {
    padding: DesignTokens.spacing[4],
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  heroValue: {
    marginTop: DesignTokens.spacing['1.5'],
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    maxWidth: 220,
  },
  statusBadge: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 999,
  },
  statusText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
  },
  card: {
    padding: Spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing[3],
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['2.5'],
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "colors.backgroundTertiary",
  },
  itemImageFallback: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.backgroundTertiary",
  },
  itemContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  itemName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  itemMeta: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  itemPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  addressName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  addressText: {
    marginTop: DesignTokens.spacing['1.5'],
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  summaryRow: {
    marginTop: DesignTokens.spacing[3],
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textPrimary,
  },
  summaryTotal: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: colors.primary,
  },
  timelineRow: {
    flexDirection: "row",
    gap: DesignTokens.spacing[3],
  },
  timelineLeft: {
    alignItems: "center",
    width: 18,
  },
  timelineDot: {
    width: DesignTokens.spacing['2.5'],
    height: DesignTokens.spacing['2.5'],
    borderRadius: 5,
    backgroundColor: DesignTokens.colors.neutral[300],
    marginTop: DesignTokens.spacing['1.5'],
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: DesignTokens.spacing['0.5'],
    flex: 1,
    marginTop: DesignTokens.spacing['1.5'],
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  timelineContent: {
    flex: 1,
    paddingBottom: DesignTokens.spacing[4],
  },
  timelineStatus: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  timelineDescription: {
    marginTop: Spacing.xs,
    fontSize: DesignTokens.typography.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  timelineTime: {
    marginTop: DesignTokens.spacing['1.5'],
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  timelineEmpty: {
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  primaryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dangerButton: {
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "colors.error",
    backgroundColor: colors.surface,
  },
  dangerButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: "colors.error",
  },
  actionRow: {
    flexDirection: "row",
    gap: DesignTokens.spacing[3],
    marginTop: Spacing.sm,
  },
  primaryButtonFilled: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "colors.error",
  },
  primaryFilledText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.surface,
  },
});

export default OrderDetailScreen;

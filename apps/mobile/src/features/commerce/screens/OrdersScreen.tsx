import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { orderApi, orderEnhancementApi } from '../../../services/api/commerce.api';
import { useOrderStore } from '../stores/orderStore';
import type { Order, OrderStatus } from '../../../types';
import type { RootStackParamList } from '../../../types/navigation';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Spacing } from '../../../design-system/theme';


type OrdersNavigation = NativeStackNavigationProp<RootStackParamList>;
type TabKey = "all" | "pending" | "paid" | "shipped" | "delivered" | "refund";

interface TabConfig {
  key: TabKey;
  label: string;
  status?: OrderStatus;
  isRefundTab?: boolean;
}

const TABS: TabConfig[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待支付", status: "pending" },
  { key: "paid", label: "待发货", status: "paid" },
  { key: "shipped", label: "待收货", status: "shipped" },
  { key: "delivered", label: "已完成", status: "delivered" },
  { key: "refund", label: "退款", isRefundTab: true },
];

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
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

export const OrdersScreen: React.FC = () => {
  const navigation = useNavigation<OrdersNavigation>();
  const orderError = useOrderStore(state => state.error);
  const clearOrderError = useOrderStore(state => state.clearError);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const activeStatus = useMemo(
    () => TABS.find((tab) => tab.key === activeTab)?.status,
    [activeTab]
  );

  const loadOrders = useCallback(
    async (pageNumber = 1, mode: "initial" | "refresh" | "append" = "initial") => {
      if (mode === "append") {
        setLoadingMore(true);
      } else if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const activeTabConfig = TABS.find((tab) => tab.key === activeTab);
        const isRefund = activeTabConfig?.isRefundTab ?? false;

        const response = isRefund
          ? await orderEnhancementApi.getOrdersByTab("refund", pageNumber, 10)
          : await orderApi.getAll({
              status: activeStatus,
              page: pageNumber,
              limit: 10,
            });
        const payload = response.data;

        if (response.success && payload) {
          setOrders((prev) => (mode === "append" ? [...prev, ...payload.items] : payload.items));
          setHasMore(payload.hasMore ?? false);
          setPage(pageNumber);
        } else if (mode !== "append") {
          setOrders([]);
          setHasMore(false);
        }
      } catch {
        if (mode !== "append") {
          setOrders([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeStatus]
  );

  useEffect(() => {
    void loadOrders(1, "initial");
  }, [loadOrders]);

  const handleCancelOrder = useCallback(
    async (orderId: string) => {
      const response = await orderApi.cancel(orderId);
      if (response.success) {
        await loadOrders(1, "refresh");
      }
    },
    [loadOrders]
  );

  const renderOrderCard = useCallback(
    ({ item }: { item: Order }) => {
      const status = STATUS_META[item.status] ?? {
        label: item.status,
        color: colors.textSecondary,
      };

      return (
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderIdLabel}>订单号</Text>
              <Text style={styles.orderIdValue}>{item.id.slice(0, 12).toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${status.color}16` }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <View style={styles.itemsRow}>
            {item.items.slice(0, 4).map((orderItem) =>
              orderItem.imageUri ? (
                <Image
                  key={orderItem.id}
                  source={{ uri: orderItem.imageUri }}
                  style={styles.itemThumbnail}
                />
              ) : (
                <View key={orderItem.id} style={styles.itemThumbnailFallback}>
                  <Ionicons name="shirt-outline" size={18} color={colors.textTertiary} />
                </View>
              )
            )}
            {item.items.length > 4 ? (
              <View style={styles.moreItemsBadge}>
                <Text style={styles.moreItemsText}>+{item.items.length - 4}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.orderFooter}>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            <View style={styles.orderSummary}>
              <Text style={styles.orderSummaryText}>{item.items.length} 件 · 合计</Text>
              <Text style={styles.orderTotal}>
                {"\u00A5"}
                {item.totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            {item.status === "pending" ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => void handleCancelOrder(item.id)}
                accessibilityLabel="取消订单"
              >
                <Text style={styles.secondaryButtonText}>取消订单</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === "pending" ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
              >
                <Text style={styles.primaryButtonText}>去支付</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === "paid" ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert("提醒发货", "已提醒商家尽快发货");
                }}
              >
                <Text style={styles.secondaryButtonText}>提醒发货</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === "shipped" ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert("查看物流", "物流信息可在订单详情中查看");
                }}
              >
                <Text style={styles.secondaryButtonText}>查看物流</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === "shipped" ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={async () => {
                  await orderEnhancementApi.confirmReceipt(item.id);
                  await loadOrders(1, "refresh");
                }}
              >
                <Text style={styles.primaryButtonText}>确认收货</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === "delivered" ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("MainTabs", { screen: "Home" } as never)}
              >
                <Text style={styles.secondaryButtonText}>再次购买</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === "delivered" || item.status === "cancelled" ? (
              <TouchableOpacity
                style={styles.dangerTextButton}
                onPress={async () => {
                  Alert.alert("删除订单", "确定删除此订单？", [
                    { text: "取消", style: "cancel" },
                    {
                      text: "删除",
                      style: "destructive",
                      onPress: async () => {
                        await orderEnhancementApi.softDeleteOrder(item.id);
                        await loadOrders(1, "refresh");
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.dangerText}>删除</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
              accessibilityLabel="查看订单详情"
            >
              <Text style={styles.primaryButtonText}>查看详情</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleCancelOrder, navigation]
  );

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
        <Text style={styles.headerTitle}>我的订单</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityLabel={`${tab.label}订单`}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bag-handle-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>还没有订单</Text>
              <Text style={styles.emptySubtitle}>先去看看推荐的穿搭和单品吧。</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOrders(1, "refresh")}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.2}
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              void loadOrders(page + 1, "append");
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOrders(1, "refresh")}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !hasMore ? (
              <Text style={styles.footerText}>没有更多订单了</Text>
            ) : null
          }
        />
      )}

      <Snackbar
        visible={!!orderError}
        onDismiss={clearOrderError}
        duration={3000}
        action={{ label: '关闭', onPress: clearOrderError }}
      >
        {orderError}
      </Snackbar>
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
  headerPlaceholder: {
    width: DesignTokens.spacing[10],
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing['3.5'],
    backgroundColor: colors.surface,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  tabItemActive: {
    backgroundColor: "colors.backgroundTertiary",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingBottom: DesignTokens.spacing[7],
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    fontSize: DesignTokens.typography.sizes.base,
    lineHeight: 22,
    textAlign: "center",
    color: colors.textSecondary,
  },
  orderCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  orderIdValue: {
    marginTop: Spacing.xs,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
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
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['2.5'],
    marginTop: Spacing.md,
  },
  itemThumbnail: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "colors.backgroundTertiary",
  },
  itemThumbnailFallback: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "colors.backgroundTertiary",
  },
  moreItemsBadge: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  moreItemsText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: DesignTokens.spacing['3.5'],
    borderTopWidth: 1,
    borderTopColor: "colors.backgroundTertiary",
  },
  orderDate: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  orderSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  orderSummaryText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  orderTotal: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: DesignTokens.spacing['2.5'],
    marginTop: Spacing.md,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  primaryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.surface,
  },
  footerLoading: {
    paddingVertical: DesignTokens.spacing[5],
  },
  footerText: {
    paddingVertical: DesignTokens.spacing[5],
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  dangerTextButton: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  dangerText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.error",
  },
});

export default OrdersScreen;

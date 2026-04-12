import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, typography, spacing, radius, shadows } from '../../../src/theme';
import { Badge } from '../../../src/components/ui/Badge';
import { Loading } from '../../../src/components/ui/Loading';
import { Empty } from '../../../src/components/ui/Empty';
import {
  customOrderService,
  CustomOrder,
  CustomOrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
  PRODUCT_TYPE_LABELS,
  formatPrice,
} from '../../../src/services/custom-order.service';

type TabKey = 'all' | CustomOrderStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'producing', label: '生产中' },
  { key: 'shipped', label: '已发货' },
  { key: 'completed', label: '已完成' },
];

function OrderCard({ order, onPress }: { order: CustomOrder; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.orderCardLeft}>
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailIcon}>
            {order.productType === 'tshirt' ? '👕' :
             order.productType === 'hoodie' ? '🧥' :
             order.productType === 'hat' ? '🧢' :
             order.productType === 'bag' ? '👜' : '📱'}
          </Text>
        </View>
      </View>
      <View style={styles.orderCardRight}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderProductType} numberOfLines={1}>
            {PRODUCT_TYPE_LABELS[order.productType] ?? order.productType}
          </Text>
          <Badge
            label={ORDER_STATUS_LABELS[order.status]}
            variant={ORDER_STATUS_VARIANT[order.status]}
            size="small"
          />
        </View>
        <Text style={styles.orderMaterial} numberOfLines={1}>
          {order.material} · {order.size} · x{order.quantity}
        </Text>
        <View style={styles.orderCardFooter}>
          <Text style={styles.orderPrice}>{formatPrice(order.totalPrice)}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const statusFilter = activeTab === 'all' ? undefined : activeTab;

  const {
    data: orderData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['custom-orders', statusFilter],
    queryFn: () => customOrderService.getList(statusFilter),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/customize/orders/${orderId}`);
  };

  const orders = orderData?.items ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <Loading variant="fullscreen" message="加载订单中..." />
      ) : orders.length === 0 ? (
        <Empty
          title="暂无订单"
          description="定制服装后订单将显示在这里"
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => handleOrderPress(item.id)} />
          )}
          contentContainerStyle={styles.orderList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.white,
  },
  orderList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  orderCardLeft: {
    marginRight: spacing.md,
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailIcon: {
    fontSize: 28,
  },
  orderCardRight: {
    flex: 1,
    justifyContent: 'space-between',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  orderProductType: {
    fontSize: typography.body.fontSize,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  orderMaterial: {
    fontSize: typography.body2.fontSize,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPrice: {
    fontSize: typography.body.fontSize,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  orderDate: {
    fontSize: typography.caption.fontSize,
    color: colors.textTertiary,
  },
});

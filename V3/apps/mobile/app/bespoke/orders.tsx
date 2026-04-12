import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { bespokeApi } from '../../src/services/bespoke.api';
import type { BespokeOrder, BespokeOrderStatus } from '../../src/types';
import {
  BESPOKE_ORDER_STATUS_LABELS,
  BESPOKE_ORDER_STATUS_COLORS,
} from '../../src/types';

const STATUS_TABS: Array<{ key: BespokeOrderStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'submitted', label: '已提交' },
  { key: 'quoted', label: '已报价' },
  { key: 'paid', label: '已支付' },
  { key: 'in_progress', label: '制作中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

function StatusTimeline({ status }: { status: BespokeOrderStatus }) {
  const steps: Array<{ key: BespokeOrderStatus; label: string }> = [
    { key: 'submitted', label: '提交' },
    { key: 'quoted', label: '报价' },
    { key: 'paid', label: '支付' },
    { key: 'in_progress', label: '制作' },
    { key: 'completed', label: '完成' },
  ];

  const statusOrder: Record<BespokeOrderStatus, number> = {
    submitted: 0,
    quoted: 1,
    paid: 2,
    in_progress: 3,
    completed: 4,
    cancelled: -1,
  };

  if (status === 'cancelled') {
    return (
      <View style={styles.timelineRow}>
        <View style={[styles.timelineDot, { backgroundColor: colors.error }]} />
        <Text style={[styles.timelineLabel, { color: colors.error }]}>已取消</Text>
      </View>
    );
  }

  const currentIndex = statusOrder[status];

  return (
    <View style={styles.timelineContainer}>
      {steps.map((step, idx) => {
        const isCompleted = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        const dotColor = isCompleted
          ? BESPOKE_ORDER_STATUS_COLORS[step.key]
          : colors.gray300;
        const lineColor = isCompleted ? colors.accent : colors.gray200;

        return (
          <View key={step.key} style={styles.timelineStep}>
            <View style={styles.timelineDotRow}>
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: dotColor,
                    width: isCurrent ? 12 : 8,
                    height: isCurrent ? 12 : 8,
                    borderRadius: isCurrent ? 6 : 4,
                  },
                ]}
              />
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: lineColor },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                {
                  color: isCompleted ? colors.textPrimary : colors.textDisabled,
                  fontWeight: isCurrent ? '600' : '400',
                },
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function OrderCard({
  order,
  onPress,
}: {
  order: BespokeOrder;
  onPress: () => void;
}) {
  const dateStr = new Date(order.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardLeft}>
          {order.studio?.logoUrl ? null : (
            <View style={styles.studioAvatar}>
              <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <Circle cx="9" cy="7" r="3.5" fill={colors.gray300} />
                <Path d="M3 17C3 13.134 5.686 10 9 10C12.314 10 15 13.134 15 17" fill={colors.gray300} />
              </Svg>
            </View>
          )}
          <View style={styles.orderCardInfo}>
            <Text style={styles.orderCardTitle} numberOfLines={1}>
              {order.title ?? order.studio?.name ?? '定制订单'}
            </Text>
            <Text style={styles.orderCardDate}>{dateStr}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: BESPOKE_ORDER_STATUS_COLORS[order.status] + '18' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: BESPOKE_ORDER_STATUS_COLORS[order.status] },
            ]}
          >
            {BESPOKE_ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.orderCardDesc} numberOfLines={2}>
        {order.description}
      </Text>

      <StatusTimeline status={order.status} />

      {order.budgetRange && (
        <View style={styles.orderCardFooter}>
          <Text style={styles.budgetTag}>预算: {order.budgetRange}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function BespokeOrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<BespokeOrder[]>([]);
  const [activeTab, setActiveTab] = useState<BespokeOrderStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = useCallback(async () => {
    try {
      const result = await bespokeApi.getOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50,
      });
      setOrders(result.items);
    } catch {
      Alert.alert('错误', '加载订单失败');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleOrderPress = useCallback(
    (order: BespokeOrder) => {
      router.push(`/bespoke/chat/${order.id}`);
    },
    [router],
  );

  const handleNewOrder = useCallback(() => {
    router.push('/bespoke/submit');
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的定制</Text>
        <TouchableOpacity style={styles.newButton} onPress={handleNewOrder} activeOpacity={0.7}>
          <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <Path d="M8 2V14M2 8H14" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
          </Svg>
          <Text style={styles.newButtonText}>新定制</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => {
              setActiveTab(tab.key);
              setIsLoading(true);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => handleOrderPress(item)} />
        )}
        contentContainerStyle={styles.orderList}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>加载中...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <Rect x="8" y="12" width="48" height="40" rx="6" stroke={colors.divider} strokeWidth="1.5" />
                <Path d="M20 28H44M20 36H36" stroke={colors.textDisabled} strokeWidth="1.5" strokeLinecap="round" />
                <Circle cx="48" cy="48" r="14" fill={colors.accent} />
                <Path d="M48 42V54M42 48H54" stroke={colors.white} strokeWidth="2" strokeLinecap="round" />
              </Svg>
              <Text style={styles.emptyTitle}>暂无定制订单</Text>
              <Text style={styles.emptySubtitle}>点击右上角开始您的定制之旅</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  newButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  tabBar: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tabBarContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  orderList: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl * 2,
  },
  orderCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  studioAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orderCardInfo: {
    flex: 1,
  },
  orderCardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  orderCardDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  orderCardDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    marginHorizontal: -spacing.xs,
  },
  timelineLabel: {
    ...typography.overline,
    marginTop: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  orderCardFooter: {
    marginTop: spacing.sm,
  },
  budgetTag: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

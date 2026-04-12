import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, radius, shadows } from '../../../src/theme';
import { Badge } from '../../../src/components/ui/Badge';
import { Loading } from '../../../src/components/ui/Loading';
import { Empty } from '../../../src/components/ui/Empty';
import { Button } from '../../../src/components/ui/Button';
import {
  customOrderService,
  CustomOrderDetail,
  TrackingResponse,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANT,
  PRODUCT_TYPE_LABELS,
  formatPrice,
} from '../../../src/services/custom-order.service';

function TimelineStep({
  label,
  time,
  isActive,
  isLast,
}: {
  label: string;
  time?: string;
  isActive: boolean;
  isLast: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, isActive && styles.timelineDotActive]} />
        {!isLast && <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />}
      </View>
      <View style={styles.timelineRight}>
        <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
          {label}
        </Text>
        {time && (
          <Text style={styles.timelineTime}>
            {new Date(time).toLocaleString('zh-CN')}
          </Text>
        )}
      </View>
    </View>
  );
}

function TrackingTimeline({ tracking }: { tracking: TrackingResponse['tracking'] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>物流追踪</Text>
      <View style={styles.trackingCard}>
        <View style={styles.trackingHeader}>
          <Text style={styles.trackingCarrier}>{tracking.carrier}</Text>
          <Text style={styles.trackingNumber}>{tracking.trackingNumber}</Text>
        </View>
        {tracking.nodes.map((node, index) => (
          <View key={index} style={styles.trackingNode}>
            <View style={styles.trackingNodeLeft}>
              <View style={[
                styles.trackingNodeDot,
                index === 0 && styles.trackingNodeDotLatest,
              ]} />
              {index < tracking.nodes.length - 1 && <View style={styles.trackingNodeLine} />}
            </View>
            <View style={styles.trackingNodeRight}>
              <Text style={[
                styles.trackingNodeDesc,
                index === 0 && styles.trackingNodeDescLatest,
              ]}>
                {node.description}
              </Text>
              <Text style={styles.trackingNodeMeta}>
                {node.location} · {new Date(node.time).toLocaleString('zh-CN')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CustomOrderDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showTracking, setShowTracking] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['custom-order-detail', orderId],
    queryFn: () => customOrderService.getDetail(orderId),
    enabled: !!orderId,
  });

  const { data: trackingData } = useQuery({
    queryKey: ['custom-order-tracking', orderId],
    queryFn: () => customOrderService.track(orderId),
    enabled: showTracking && !!orderId,
  });

  const cancelMutation = useMutation({
    mutationFn: () => customOrderService.cancel(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      Alert.alert('提示', '订单已取消');
    },
    onError: (err: Error) => Alert.alert('取消失败', err.message),
  });

  const payMutation = useMutation({
    mutationFn: () => customOrderService.pay(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      Alert.alert('提示', '支付成功，订单已提交生产');
    },
    onError: (err: Error) => Alert.alert('支付失败', err.message),
  });

  const handleCancel = () => {
    Alert.alert('确认取消', '确定要取消该订单吗？', [
      { text: '再想想', style: 'cancel' },
      { text: '确认取消', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  const handlePay = () => {
    Alert.alert('确认支付', `支付金额: ${order ? formatPrice(order.totalPrice) : ''}`, [
      { text: '取消', style: 'cancel' },
      { text: '确认支付', onPress: () => payMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载订单详情..." />;
  }

  if (isError || !order) {
    return (
      <Empty
        title="订单不存在"
        description="该订单可能已被删除"
        actionLabel="返回订单列表"
        onAction={() => router.back()}
      />
    );
  }

  const timelineSteps = buildTimelineSteps(order);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.statusSection}>
        <Badge
          label={ORDER_STATUS_LABELS[order.status]}
          variant={ORDER_STATUS_VARIANT[order.status]}
          size="medium"
        />
        <Text style={styles.orderId}>订单号: {order.id.slice(0, 8).toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>订单信息</Text>
        <View style={styles.infoCard}>
          <InfoRow label="产品类型" value={PRODUCT_TYPE_LABELS[order.productType] ?? order.productType} />
          <InfoRow label="面料/材质" value={order.material} />
          <InfoRow label="尺码" value={order.size} />
          <InfoRow label="数量" value={`${order.quantity}`} />
          <InfoRow label="单价" value={formatPrice(order.unitPrice)} />
          <InfoRow label="总价" value={formatPrice(order.totalPrice)} highlight />
          {order.designName && <InfoRow label="设计名称" value={order.designName} />}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>收货地址</Text>
        <View style={styles.infoCard}>
          <Text style={styles.addressName}>
            {order.shippingAddress.name} {order.shippingAddress.phone}
          </Text>
          <Text style={styles.addressDetail}>
            {order.shippingAddress.province}
            {order.shippingAddress.city}
            {order.shippingAddress.district}
            {order.shippingAddress.address}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>订单进度</Text>
        <View style={styles.timelineCard}>
          {timelineSteps.map((step, index) => (
            <TimelineStep
              key={step.label}
              label={step.label}
              time={step.time}
              isActive={step.isActive}
              isLast={index === timelineSteps.length - 1}
            />
          ))}
        </View>
      </View>

      {(order.status === 'paid' || order.status === 'producing' || order.status === 'shipped') && (
        <View style={styles.section}>
          {!showTracking ? (
            <Button
              variant="secondary"
              size="medium"
              onPress={() => setShowTracking(true)}
              fullWidth
            >
              查看物流
            </Button>
          ) : trackingData ? (
            <TrackingTimeline tracking={trackingData.tracking} />
          ) : (
            <Loading variant="inline" message="获取物流信息..." />
          )}
        </View>
      )}

      {order.status === 'completed' && (
        <View style={styles.section}>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              定制产品不支持退货，如有质量问题请联系客服
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actionBar}>
        {order.status === 'pending' && (
          <>
            <Button
              variant="secondary"
              size="large"
              onPress={handleCancel}
              loading={cancelMutation.isPending}
              style={styles.actionButton}
            >
              取消订单
            </Button>
            <Button
              variant="primary"
              size="large"
              onPress={handlePay}
              loading={payMutation.isPending}
              style={styles.actionButton}
            >
              立即支付
            </Button>
          </>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

function buildTimelineSteps(order: CustomOrderDetail) {
  const steps: { label: string; time?: string; isActive: boolean }[] = [
    { label: '提交订单', time: order.timeline.submittedAt, isActive: true },
    { label: '完成付款', time: order.timeline.paidAt, isActive: !!order.timeline.paidAt },
    { label: '生产制作', time: order.timeline.producingAt, isActive: !!order.timeline.producingAt },
    { label: '已发货', time: order.timeline.shippedAt, isActive: !!order.timeline.shippedAt },
    { label: '已完成', time: order.timeline.completedAt, isActive: !!order.timeline.completedAt },
  ];

  if (order.status === 'cancelled' && order.timeline.cancelledAt) {
    return steps.map((s) => ({ ...s, isActive: false })).concat([
      { label: '已取消', time: order.timeline.cancelledAt, isActive: true },
    ]);
  }

  return steps;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  statusSection: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: {
    fontSize: typography.caption.fontSize,
    color: colors.textTertiary,
  },
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.body2.fontSize,
    color: colors.textTertiary,
  },
  infoValue: {
    fontSize: typography.body2.fontSize,
    color: colors.textPrimary,
  },
  infoValueHighlight: {
    fontSize: typography.body.fontSize,
    fontWeight: '600' as const,
    color: colors.accent,
  },
  addressName: {
    fontSize: typography.body.fontSize,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  addressDetail: {
    fontSize: typography.body2.fontSize,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  timelineCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.gray300,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: colors.accent,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray200,
    marginTop: 4,
  },
  timelineLineActive: {
    backgroundColor: colors.accentLight,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  timelineLabel: {
    fontSize: typography.body2.fontSize,
    color: colors.textTertiary,
  },
  timelineLabelActive: {
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  timelineTime: {
    fontSize: typography.caption.fontSize,
    color: colors.textTertiary,
    marginTop: 2,
  },
  trackingCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  trackingCarrier: {
    fontSize: typography.body.fontSize,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  trackingNumber: {
    fontSize: typography.body2.fontSize,
    color: colors.textSecondary,
  },
  trackingNode: {
    flexDirection: 'row',
    minHeight: 44,
  },
  trackingNodeLeft: {
    width: 24,
    alignItems: 'center',
  },
  trackingNodeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray300,
    marginTop: 6,
  },
  trackingNodeDotLatest: {
    backgroundColor: colors.accent,
    width: 10,
    height: 10,
    marginTop: 5,
  },
  trackingNodeLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray200,
    marginTop: 4,
  },
  trackingNodeRight: {
    flex: 1,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.sm,
  },
  trackingNodeDesc: {
    fontSize: typography.body2.fontSize,
    color: colors.textTertiary,
  },
  trackingNodeDescLatest: {
    color: colors.textPrimary,
    fontWeight: '500' as const,
  },
  trackingNodeMeta: {
    fontSize: typography.caption.fontSize,
    color: colors.textTertiary,
    marginTop: 2,
  },
  noticeCard: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noticeText: {
    fontSize: typography.body2.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});

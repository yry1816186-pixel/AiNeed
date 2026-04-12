import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../../src/theme';
import { bespokeApi } from '../../../src/services/bespoke.api';
import type { BespokeQuote, BespokeOrder } from '../../../src/types';
import {
  BESPOKE_ORDER_STATUS_LABELS,
  BESPOKE_ORDER_STATUS_COLORS,
} from '../../../src/types';

function formatPrice(cents: number): string {
  return `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

function QuoteCard({
  quote,
  orderStatus,
  onAccept,
  onReject,
}: {
  quote: BespokeQuote;
  orderStatus: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const isPending = quote.status === 'pending';
  const canAction = isPending && orderStatus === 'quoted';
  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();

  const statusLabel: Record<string, string> = {
    pending: isExpired ? '已过期' : '待确认',
    accepted: '已接受',
    rejected: '已拒绝',
    expired: '已过期',
  };

  const statusColor: Record<string, string> = {
    pending: isExpired ? colors.error : colors.warning,
    accepted: colors.success,
    rejected: colors.error,
    expired: colors.error,
  };

  return (
    <View style={styles.quoteCard}>
      <View style={styles.quoteHeader}>
        <Text style={styles.quoteTotalPrice}>
          {formatPrice(quote.totalPrice)}
        </Text>
        <View
          style={[
            styles.quoteStatusBadge,
            { backgroundColor: statusColor[quote.status] + '18' },
          ]}
        >
          <Text style={[styles.quoteStatusText, { color: statusColor[quote.status] }]}>
            {statusLabel[quote.status]}
          </Text>
        </View>
      </View>

      <View style={styles.quoteDivider} />

      <View style={styles.quoteItemsSection}>
        <Text style={styles.quoteSectionTitle}>报价明细</Text>
        {quote.items.map((item, idx) => (
          <View key={idx} style={styles.quoteItemRow}>
            <View style={styles.quoteItemLeft}>
              <Text style={styles.quoteItemName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.quoteItemDesc}>{item.description}</Text>
              ) : null}
            </View>
            <View style={styles.quoteItemRight}>
              <Text style={styles.quoteItemQty}>x{item.quantity}</Text>
              <Text style={styles.quoteItemSubtotal}>
                {formatPrice(item.subtotal)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.quoteMeta}>
        {quote.estimatedDays ? (
          <View style={styles.quoteMetaRow}>
            <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <Circle cx="8" cy="8" r="7" stroke={colors.textTertiary} strokeWidth="1.2" />
              <Path d="M8 4V8L10.5 10.5" stroke={colors.textTertiary} strokeWidth="1.2" strokeLinecap="round" />
            </Svg>
            <Text style={styles.quoteMetaText}>
              预计工期 {quote.estimatedDays} 天
            </Text>
          </View>
        ) : null}
        {quote.validUntil ? (
          <View style={styles.quoteMetaRow}>
            <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <Rect x="1" y="3" width="14" height="12" rx="2" stroke={colors.textTertiary} strokeWidth="1.2" />
              <Path d="M1 7H15" stroke={colors.textTertiary} strokeWidth="1.2" />
              <Path d="M5 1V4M11 1V4" stroke={colors.textTertiary} strokeWidth="1.2" strokeLinecap="round" />
            </Svg>
            <Text style={styles.quoteMetaText}>
              有效期至 {new Date(quote.validUntil).toLocaleDateString('zh-CN')}
            </Text>
          </View>
        ) : null}
        {quote.notes ? (
          <Text style={styles.quoteNotes}>备注：{quote.notes}</Text>
        ) : null}
      </View>

      {canAction && !isExpired && (
        <View style={styles.quoteActions}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => onReject(quote.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.rejectButtonText}>拒绝</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(quote.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptButtonText}>接受报价</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function BespokeQuoteScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<BespokeOrder | null>(null);
  const [quotes, setQuotes] = useState<BespokeQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    loadData();
  }, [orderId]);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    try {
      const [orderData, quotesData] = await Promise.all([
        bespokeApi.getOrderById(orderId),
        bespokeApi.getQuotes(orderId),
      ]);
      setOrder(orderData);
      setQuotes(quotesData);
    } catch {
      Alert.alert('错误', '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  const handleAccept = useCallback(
    async (quoteId: string) => {
      Alert.alert('确认接受', '接受报价后将进入支付流程，确认接受？', [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await bespokeApi.acceptQuote(quoteId);
              Alert.alert('已接受', '报价已接受，请完成支付', [
                {
                  text: '确定',
                  onPress: () => {
                    router.back();
                  },
                },
              ]);
            } catch (err) {
              const msg = err instanceof Error ? err.message : '操作失败';
              Alert.alert('操作失败', msg);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]);
    },
    [router],
  );

  const handleReject = useCallback(
    async (quoteId: string) => {
      Alert.alert('确认拒绝', '拒绝后工作室可能重新报价，确认拒绝？', [
        { text: '取消', style: 'cancel' },
        {
          text: '确认拒绝',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await bespokeApi.rejectQuote(quoteId);
              loadData();
            } catch (err) {
              const msg = err instanceof Error ? err.message : '操作失败';
              Alert.alert('操作失败', msg);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]);
    },
    [loadData],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {order && (
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {order.title ?? '定制订单'}
          </Text>
          <View style={styles.orderMetaRow}>
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
            {order.budgetRange && (
              <Text style={styles.budgetText}>预算: {order.budgetRange}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.quotesSection}>
        <Text style={styles.sectionTitle}>
          报价单 ({quotes.length})
        </Text>
        {quotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <Rect x="4" y="8" width="40" height="32" rx="4" stroke={colors.divider} strokeWidth="1.5" />
              <Path d="M14 20H34M14 28H26" stroke={colors.textDisabled} strokeWidth="1.5" strokeLinecap="round" />
            </Svg>
            <Text style={styles.emptyText}>暂无报价，等待工作室回复</Text>
          </View>
        ) : (
          quotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              orderStatus={order?.status ?? 'submitted'}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))
        )}
      </View>

      <View style={{ height: spacing.xxxl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  orderInfo: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  orderTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  budgetText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  quotesSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  quoteCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteTotalPrice: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
  },
  quoteStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  quoteStatusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  quoteDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  quoteItemsSection: {
    marginBottom: spacing.md,
  },
  quoteSectionTitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  quoteItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  quoteItemLeft: {
    flex: 1,
  },
  quoteItemName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  quoteItemDesc: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  quoteItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  quoteItemQty: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  quoteItemSubtotal: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  quoteMeta: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  quoteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteMetaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  quoteNotes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  quoteActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  rejectButtonText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },
  acceptButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    ...shadows.sm,
  },
  acceptButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
});

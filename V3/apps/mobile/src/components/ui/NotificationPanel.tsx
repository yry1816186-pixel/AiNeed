import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '../../theme';
import { useNotificationStore } from '../../stores/notification.store';
import type { NotificationItem, NotificationReferenceType } from '../../types';
import {
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
} from '../../types';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getNotificationRoute(
  referenceType?: NotificationReferenceType,
  referenceId?: string,
): string | null {
  if (!referenceType || !referenceId) return null;

  const routes: Record<NotificationReferenceType, (id: string) => string> = {
    post: (id) => `/community/${id}`,
    comment: (id) => `/community/${id}`,
    user: (id) => `/community/user/${id}`,
    order: (id) => `/customize/order/${id}`,
    custom_order: (id) => `/customize/order/${id}`,
    bespoke_order: (id) => `/bespoke/orders`,
    tryon: (id) => `/tryon`,
    outfit: (id) => `/community/${id}`,
    design: (id) => `/market/${id}`,
  };

  return routes[referenceType]?.(referenceId) ?? null;
}

function BellIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2C6.68629 2 4 4.68629 4 8V12L2 15H18L16 12V8C16 4.68629 13.3137 2 10 2Z"
        stroke={colors.primary}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Path
        d="M8 15C8 16.1046 8.89543 17 10 17C11.1046 17 12 16.1046 12 15"
        stroke={colors.primary}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        d="M15 5L5 15M5 5L15 15"
        stroke={colors.textTertiary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function NotificationRow({
  item,
  onPress,
  onDelete,
}: {
  item: NotificationItem;
  onPress: () => void;
  onDelete: () => void;
}) {
  const icon = NOTIFICATION_TYPE_ICONS[item.type] ?? '🔔';

  return (
    <Pressable
      style={[styles.notificationRow, !item.isRead && styles.unreadRow]}
      onPress={onPress}
    >
      <View style={styles.iconBadge}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.notificationTitle, !item.isRead && styles.unreadText]}
            numberOfLines={1}
          >
            {item.title ?? NOTIFICATION_TYPE_LABELS[item.type]}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        {item.content ? (
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.content}
          </Text>
        ) : null}
        <Text style={styles.notificationTime}>{formatTime(item.createdAt)}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete} hitSlop={8}>
        <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <Path
            d="M11 3L3 11M3 3L11 11"
            stroke={colors.textDisabled}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </Svg>
      </TouchableOpacity>
    </Pressable>
  );
}

export function NotificationPanel() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    isPanelOpen,
    closePanel,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const handleNotificationPress = useCallback(
    (item: NotificationItem) => {
      if (!item.isRead) {
        markAsRead(item.id);
      }
      const route = getNotificationRoute(item.referenceType, item.referenceId);
      if (route) {
        closePanel();
        router.push(route as never);
      }
    },
    [markAsRead, closePanel, router],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotification(id);
    },
    [deleteNotification],
  );

  const handleLoadMore = useCallback(() => {
    const state = useNotificationStore.getState();
    if (state.currentPage < state.totalPages && !isLoading) {
      fetchNotifications(state.currentPage + 1);
    }
  }, [fetchNotifications, isLoading]);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <NotificationRow
        item={item}
        onPress={() => handleNotificationPress(item)}
        onDelete={() => handleDelete(item.id)}
      />
    ),
    [handleNotificationPress, handleDelete],
  );

  const keyExtractor = useCallback((item: NotificationItem) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View style={styles.panelHeader}>
        <View style={styles.headerLeft}>
          <BellIcon />
          <Text style={styles.panelTitle}>通知</Text>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} hitSlop={8}>
              <Text style={styles.markAllText}>全部已读</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={closePanel} hitSlop={8}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [unreadCount, handleMarkAllRead, closePanel],
  );

  const EmptyContent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <Circle cx="24" cy="24" r="22" stroke={colors.gray300} strokeWidth="2" />
          <Path
            d="M24 14C19.58 14 16 17.58 16 22V28L14 32H34L32 28V22C32 17.58 28.42 14 24 14Z"
            stroke={colors.gray300}
            strokeWidth="2"
          />
        </Svg>
        <Text style={styles.emptyText}>暂无通知</Text>
      </View>
    ),
    [],
  );

  return (
    <Modal
      visible={isPanelOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closePanel}
    >
      <View style={styles.container}>
        {ListHeader}
        {isLoading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={EmptyContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyList : undefined
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingTop: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  panelTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  markAllText: {
    ...typography.bodySmall,
    color: colors.accent,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  unreadRow: {
    backgroundColor: colors.gray50,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  iconText: {
    fontSize: 16,
  },
  notificationContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notificationTitle: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  unreadText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  notificationBody: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  notificationTime: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme';

const NOTIFICATIONS_KEY = '@aineed_notifications';

type NotificationType = 'order' | 'recommendation' | 'system';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, string>;
}

const NOTIFICATION_ICONS: Record<NotificationType, { icon: string; color: string }> = {
  order: { icon: 'bag-outline', color: theme.colors.primary },
  recommendation: { icon: 'sparkles-outline', color: theme.colors.warning },
  system: { icon: 'information-circle-outline', color: '#3B82F6' },
};

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const generateSeedNotifications = (): AppNotification[] => {
  const now = Date.now();
  return [
    {
      id: generateId(),
      type: 'system',
      title: '欢迎使用 AiNeed',
      body: '您的 AI 穿搭助手已就绪，开始探索智能推荐吧！',
      read: false,
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(),
    },
    {
      id: generateId(),
      type: 'recommendation',
      title: '今日穿搭推荐',
      body: '根据您的衣橱和天气情况，我们为您准备了今日穿搭方案。',
      read: false,
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
    },
    {
      id: generateId(),
      type: 'system',
      title: '新功能上线',
      body: 'AI 造型师功能已上线，快来体验个性化造型建议！',
      read: false,
      createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: generateId(),
      type: 'recommendation',
      title: '风格分析完成',
      body: '您本周的风格分析报告已生成，点击查看详情。',
      read: true,
      createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: generateId(),
      type: 'system',
      title: '系统更新',
      body: '我们优化了推荐算法，现在推荐更精准了。',
      read: true,
      createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    },
  ];
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        const parsed: AppNotification[] = JSON.parse(stored);
        setNotifications(parsed);
      } else {
        // First-time: seed with sample notifications
        const seed = generateSeedNotifications();
        setNotifications(seed);
        await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(seed));
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const persistNotifications = useCallback(async (updated: AppNotification[]) => {
    setNotifications(updated);
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    } catch {
      // Silent fail on persistence
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      persistNotifications(updated);
    },
    [notifications, persistNotifications],
  );

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(updated);
  }, [notifications, persistNotifications]);

  const clearAll = useCallback(() => {
    Alert.alert('清空通知', '确定要清空所有通知吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => persistNotifications([]),
      },
    ]);
  }, [persistNotifications]);

  const deleteNotification = useCallback(
    (id: string) => {
      const updated = notifications.filter((n) => n.id !== id);
      persistNotifications(updated);
    },
    [notifications, persistNotifications],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="返回">
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          通知{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Action bar */}
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton} accessibilityLabel="全部标为已读">
            <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.actionText}>全部已读</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={styles.actionButton} accessibilityLabel="清空所有通知">
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>清空</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? null : notifications.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>暂无通知</Text>
          <Text style={styles.emptySubtext}>下拉刷新获取最新通知</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {notifications.map((notification) => {
            const iconConfig = NOTIFICATION_ICONS[notification.type];
            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.notificationCardUnread,
                ]}
                onPress={() => markAsRead(notification.id)}
                onLongPress={() => deleteNotification(notification.id)}
                activeOpacity={0.7}
                accessibilityLabel={`${notification.title}: ${notification.body}`}
              >
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: iconConfig.color + '15' },
                  ]}
                >
                  <Ionicons name={iconConfig.icon as 'bag-outline' | 'sparkles-outline' | 'information-circle-outline'} size={22} color={iconConfig.color} />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.read && styles.notificationTitleUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.notificationBody} numberOfLines={2}>
                    {notification.body}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  placeholder: { width: 40 },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },

  // Content
  content: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },

  // Notification card
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  notificationCardUnread: {
    backgroundColor: '#F8F8FF',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  notificationTitleUnread: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  notificationBody: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
});

export default NotificationsScreen;

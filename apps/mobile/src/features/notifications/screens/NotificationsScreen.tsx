import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useNotificationStore } from "../stores/notificationStore";
import { useTranslation } from "../i18n";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import type { RootStackParamList } from "../types/navigation";
import type { NotificationItem } from "../services/api/notification.api";
import { wsService } from "../services/websocket";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type NotificationCategory = "all" | "order" | "recommendation" | "community" | "system";

const CATEGORY_TABS: { key: NotificationCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "recommendation", label: "Recommendations" },
  { key: "community", label: "Community" },
  { key: "system", label: "System" },
];

const NOTIFICATION_ICONS: Record<string, { icon: string; color: string }> = {
  order: { icon: "bag-outline", color: theme.colors.primary },
  recommendation: { icon: "sparkles-outline", color: DesignTokens.colors.semantic.warning },
  community: { icon: "people-outline", color: DesignTokens.colors.semantic.success },
  system: { icon: "information-circle-outline", color: DesignTokens.colors.brand.slate },
};

// Social notification type config for rendering
const SOCIAL_NOTIFICATION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  like: { icon: "heart", color: "#FF4757", label: "赞了你的帖子" }, // custom color
  comment: { icon: "chatbubble", color: DesignTokens.colors.semantic.success, label: "评论了你的帖子" },
  bookmark: { icon: "bookmark", color: "#F1C40F", label: "收藏了你的帖子" }, // custom color
  new_follower: { icon: "person-add", color: DesignTokens.colors.brand.slate, label: "关注了你" },
  reply_mention: { icon: "at", color: "#3498DB", label: "回复了你" }, // custom color
};

function getNotificationCategory(type: string): string {
  const orderTypes = ["system_update"];
  const recTypes = ["daily_recommendation", "price_drop"];
  const communityTypes = ["new_follower", "comment", "like", "bookmark", "reply_mention"];

  if (orderTypes.includes(type)) {
    return "order";
  }
  if (recTypes.includes(type)) {
    return "recommendation";
  }
  if (communityTypes.includes(type)) {
    return "community";
  }
  return "system";
}

function getIconConfig(type: string) {
  const category = getNotificationCategory(type);
  return NOTIFICATION_ICONS[category] || NOTIFICATION_ICONS.system;
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const t = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    currentCategory,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setCurrentCategory,
  } = useNotificationStore();

  useEffect(() => {
    void fetchNotifications(true);
  }, [fetchNotifications]);

  // WebSocket listener for social notifications
  useEffect(() => {
    const handleSocialNotification = (..._args: unknown[]) => {
      void fetchNotifications(true);
    };

    if (wsService.isConnected()) {
      wsService.on("social_notification", handleSocialNotification);
    }

    return () => {
      wsService.off("social_notification", handleSocialNotification);
    };
  }, [fetchNotifications]);

  const handleRefresh = useCallback(() => {
    void fetchNotifications(true);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      void fetchNotifications(false);
    }
  }, [hasMore, loading, fetchNotifications]);

  const handleNotificationTap = useCallback(
    (notification: NotificationItem) => {
      void markAsRead(notification.id);

      // Navigate based on target type/id
      if (notification.targetId) {
        if (notification.targetType === "deeplink") {
          // Parse deeplink URL for navigation
          const url = notification.targetId;
          if (url.includes("/orders/")) {
            const orderId = url.split("/orders/")[1]?.split("/")[0];
            if (orderId) {
              navigation.navigate("OrderDetail", { orderId });
            }
          } else if (url.includes("/clothing/")) {
            const clothingId = url.split("/clothing/")[1]?.split("/")[0];
            if (clothingId) {
              navigation.navigate("Product", { clothingId });
            }
          }
        } else if (notification.targetId.match(/^[a-f0-9-]+$/)) {
          // Looks like a UUID - try to navigate by target type
          const targetType = notification.targetType;
          if (targetType === "order") {
            navigation.navigate("OrderDetail", { orderId: notification.targetId });
          }
        }
      }
    },
    [markAsRead, navigation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      void deleteNotification(id);
    },
    [deleteNotification]
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(t.notifications.title, t.notifications.noNotifications, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          // Clear all by deleting each
          notifications.forEach((n) => deleteNotification(n.id));
        },
      },
    ]);
  }, [notifications, deleteNotification]);

  const isCloseToBottom = useCallback(
    ({
      layoutMeasurement,
      contentOffset,
      contentSize,
    }: {
      layoutMeasurement: { height: number };
      contentOffset: { y: number };
      contentSize: { height: number };
    }) => {
      const paddingToBottom = 100;
      return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    },
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.notifications.title}{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Category filter tabs */}
      <ScrollView horizontal style={styles.tabsContainer} showsHorizontalScrollIndicator={false}>
        {CATEGORY_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, currentCategory === tab.key && styles.tabActive]}
            onPress={() => setCurrentCategory(tab.key)}
            accessibilityLabel={`Filter by ${tab.label}`}
          >
            <Text style={[styles.tabText, currentCategory === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Action bar */}
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            onPress={() => markAllAsRead()}
            style={styles.actionButton}
            accessibilityLabel="Mark all as read"
          >
            <Ionicons name="checkmark-done-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.actionText}>Read All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.actionButton}
            accessibilityLabel="Clear all notifications"
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 && !loading ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={styles.emptyText}>{t.notifications.noNotifications}</Text>
          <Text style={styles.emptySubtext}>Pull to refresh</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          onScroll={({ nativeEvent }) => {
            if (isCloseToBottom(nativeEvent)) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {notifications.map((notification) => {
            const iconConfig = getIconConfig(notification.type);
            const socialConfig = SOCIAL_NOTIFICATION_CONFIG[notification.type];
            const isSocial = !!socialConfig;

            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.notificationCardUnread,
                ]}
                onPress={() => handleNotificationTap(notification)}
                onLongPress={() => handleDelete(notification.id)}
                activeOpacity={0.7}
                accessibilityLabel={`${notification.title}: ${notification.content}`}
              >
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: (isSocial ? socialConfig.color : iconConfig.color) + "15" },
                  ]}
                >
                  <Ionicons
                    name={(isSocial ? socialConfig.icon : iconConfig.icon) as "bag-outline"}
                    size={22}
                    color={isSocial ? socialConfig.color : iconConfig.color}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.notificationTitleUnread,
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
                    {isSocial ? socialConfig.label : notification.content}
                  </Text>
                </View>
                {!notification.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}
          {!hasMore && notifications.length > 0 && (
            <Text style={styles.endText}>No more notifications</Text>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.text },
  placeholder: { width: 40 },

  // Tabs
  tabsContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  tabTextActive: {
    color: theme.colors.surface,
  },

  // Action bar
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: "500",
  },

  // Content
  content: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  endText: {
    textAlign: "center",
    fontSize: 13,
    color: theme.colors.textTertiary,
    paddingVertical: 16,
  },

  // Notification card
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  notificationCardUnread: {
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  notificationTitleUnread: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
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

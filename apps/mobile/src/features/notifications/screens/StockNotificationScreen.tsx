import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { stockNotificationApi, type StockNotification } from '../../../services/api/commerce.api';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "等待中", color: DesignTokens.colors.semantic.warning },
  NOTIFIED: { label: "已通知", color: DesignTokens.colors.semantic.success },
  CANCELLED: { label: "已取消", color: DesignTokens.colors.neutral[300] },
};

export const StockNotificationScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await stockNotificationApi.getAll();
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchNotifications();
  };

  const handleUnsubscribe = async (id: string) => {
    try {
      await stockNotificationApi.unsubscribe(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      Alert.alert("操作失败", "请稍后重试");
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bell-off-outline" size={64} color={DesignTokens.colors.neutral[300]} />
      <Text style={styles.emptyTitle}>暂无到货通知</Text>
      <TouchableOpacity
        style={styles.goButton}
        onPress={() => {
          // Navigation note: should navigate to Home
        }}
      >
        <Text style={styles.goButtonText}>去逛逛</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: StockNotification }) => {
    const statusCfg = STATUS_CONFIG[item.status] ?? {
      label: item.status,
      color: DesignTokens.colors.text.tertiary,
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          {item.item?.images?.[0] ? (
            <Image source={{ uri: item.item.images[0] }} style={styles.itemImage} />
          ) : (
            <View style={styles.itemImageFallback}>
              <Ionicons name="shirt-outline" size={18} color={DesignTokens.colors.neutral[300]} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.item?.name ?? "商品"}
          </Text>
          <Text style={styles.itemSpec}>
            {item.color ?? "-"} / {item.size ?? "-"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}20` }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>
        {item.status === "PENDING" ? (
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleUnsubscribe(item.id)}>
            <Text style={styles.cancelText}>取消通知</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>到货通知</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={DesignTokens.colors.semantic.error} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>到货通知</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[DesignTokens.colors.semantic.error]} />
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DesignTokens.colors.backgrounds.primary },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: DesignTokens.colors.text.primary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
    gap: 12,
  },
  cardLeft: {},
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  itemImageFallback: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  itemName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.text.primary,
  },
  itemSpec: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "500",
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.semantic.error,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    marginTop: 16,
  },
  goButton: {
    marginTop: 24,
    backgroundColor: DesignTokens.colors.semantic.error,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goButtonText: {
    color: DesignTokens.colors.neutral.white,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});

export default StockNotificationScreen;

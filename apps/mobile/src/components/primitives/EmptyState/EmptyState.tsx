import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { Colors, theme } from "../../../theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={theme.colors.neutral[300]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// 预设变体
export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="cart-outline"
      title="购物车是空的"
      description="快去挑选你喜欢的商品吧"
      actionLabel="去逛逛"
      onAction={onBrowse}
    />
  );
}

export function EmptyFavorites({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="heart-outline"
      title="暂无收藏"
      description="收藏的商品会显示在这里"
      actionLabel="去发现"
      onAction={onBrowse}
    />
  );
}

export function EmptyOrders({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="cube-outline"
      title="暂无订单"
      description="你的订单会显示在这里"
      actionLabel="去购物"
      onAction={onBrowse}
    />
  );
}

export function EmptySearch({
  query,
  onClear,
}: {
  query?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon="search-outline"
      title="未找到结果"
      description={query ? `没有找到"${query}"相关的商品` : "试试其他关键词"}
      actionLabel={query ? "清除搜索" : undefined}
      onAction={onClear}
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="notifications-off-outline"
      title="暂无通知"
      description="新的通知会显示在这里"
    />
  );
}

export function EmptyWardrobe({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon="shirt-outline"
      title="衣橱是空的"
      description="添加你的第一件衣服吧"
      actionLabel="添加服装"
      onAction={onAdd}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});

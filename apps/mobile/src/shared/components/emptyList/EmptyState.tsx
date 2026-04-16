import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name={icon} size={64} color="#a1a1aa" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyCloset({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <EmptyState
      icon="shopping-bag"
      title="衣柜是空的"
      description="添加你的第一件衣服开始管理你的衣柜"
      actionLabel="添加衣服"
      onAction={onAddItem}
    />
  );
}

export function EmptyOutfits({ onAddOutfit }: { onAddOutfit?: () => void }) {
  return (
    <EmptyState
      icon="layers"
      title="还没有穿搭"
      description="创建你的第一个穿搭组合"
      actionLabel="创建穿搭"
      onAction={onAddOutfit}
    />
  );
}

export function EmptySearch({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon="search"
      title="没有找到结果"
      description={query ? `没有找到与 "${query}" 相关的内容` : "没有找到相关内容"}
      actionLabel="清除搜索"
      onAction={onClear}
    />
  );
}

export function EmptyFavorites() {
  return <EmptyState icon="heart" title="没有收藏" description="你还没有收藏任何衣服或穿搭" />;
}

export function EmptyOrders() {
  return <EmptyState icon="package" title="没有订单" description="你还没有任何订单" />;
}

export function NoInternet({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="wifi-off"
      title="网络连接失败"
      description="请检查你的网络连接后重试"
      actionLabel="重试"
      onAction={onRetry}
    />
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="alert-circle"
      title="出错了"
      description={message || "加载失败，请重试"}
      actionLabel="重试"
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#18181b",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EmptyState;

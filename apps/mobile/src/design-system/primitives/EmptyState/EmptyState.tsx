import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Colors, theme, Spacing, BorderRadius, Shadows } from '../theme';
import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  /** Gradient colors for the icon background. Defaults to brand gradient. */
  iconGradient?: [string, string];
}

export function EmptyState({
  icon = "folder-open-outline",
  title,
  description,
  actionLabel,
  onAction,
  style,
  iconGradient,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const gradient = iconGradient ?? [colors.primary, colors.primary];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons name={icon} size={40} color={colors.surface} />
      </LinearGradient>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.primary, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Empty wardrobe - hanger icon + "Start adding your first piece" + photo button */
export function EmptyWardrobe({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon="shirt-outline"
      title="衣橱还是空的"
      description="开始添加你的第一件衣服，让AI造型师为你推荐穿搭"
      actionLabel="拍照添加"
      onAction={onAdd}
      iconGradient={[colors.primary, colors.primary]}
    />
  );
}

/** No recommendations - AI stylist icon + "Chat with AI stylist about your style" + chat button */
export function EmptyRecommendations({ onChat }: { onChat?: () => void }) {
  return (
    <EmptyState
      icon="sparkles-outline"
      title="还没有推荐"
      description="和AI造型师聊聊你的风格偏好，获取专属穿搭推荐"
      actionLabel="和AI聊聊"
      onAction={onChat}
      iconGradient={[Colors.primary[400], Colors.primary[600]]}
    />
  );
}

/** No search results - search icon + "Try these popular styles" + tag cloud */
export function EmptySearch({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon="search-outline"
      title="未找到结果"
      description={query ? `没有找到"${query}"相关的商品，试试其他关键词吧` : "试试其他关键词，发现更多好物"}
      actionLabel={query ? "清除搜索" : undefined}
      onAction={onClear}
      iconGradient={[Colors.amber[400], Colors.amber[600]]}
    />
  );
}

/** No favorites - heart icon + "Discover outfits you like" + explore button */
export function EmptyFavorites({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="heart-outline"
      title="还没有收藏"
      description="发现你喜欢的穿搭，收藏起来方便随时查看"
      actionLabel="去发现"
      onAction={onBrowse}
      iconGradient={[Colors.rose[400], Colors.rose[600]]}
    />
  );
}

/** No orders - shopping bag icon + "Go browse for good stuff" + shop button */
export function EmptyOrders({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="bag-outline"
      title="暂无订单"
      description="去逛逛有什么好物，找到属于你的风格单品"
      actionLabel="去逛逛"
      onAction={onBrowse}
      iconGradient={[Colors.emerald[400], Colors.emerald[600]]}
    />
  );
}

/** Empty cart */
export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon="cart-outline"
      title="购物车是空的"
      description="快去挑选你喜欢的商品吧，好物不等人"
      actionLabel="去逛逛"
      onAction={onBrowse}
      iconGradient={[Colors.sky[400], Colors.sky[600]]}
    />
  );
}

/** No notifications */
export function EmptyNotifications() {
  return (
    <EmptyState
      icon="notifications-off-outline"
      title="暂无通知"
      description="新的通知会显示在这里，不错过任何精彩"
      iconGradient={[Colors.neutral[300], Colors.neutral[500]]}
    />
  );
}

/** No posts - camera icon + "Share your outfit inspiration" + publish button */
export function EmptyPosts({ onPublish }: { onPublish?: () => void }) {
  return (
    <EmptyState
      icon="camera-outline"
      title="还没有动态"
      description="分享你的穿搭灵感，让更多人看到你的风格"
      actionLabel="发布动态"
      onAction={onPublish}
      iconGradient={[Colors.primary[400], Colors.primary[600]]}
    />
  );
}

/** Generic empty state - brand icon + warm encouraging text */
export function EmptyGeneric({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon="leaf-outline"
      title={title ?? "这里还没有内容"}
      description={description ?? "精彩即将到来，敬请期待"}
      actionLabel={actionLabel}
      onAction={onAction}
      iconGradient={[colors.primary, colors.primary]}
    />
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[8],
  },
  iconContainer: {
    width: Spacing['5xl'],
    height: Spacing['5xl'],
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[5],
    ...Shadows.md,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  description: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing[6],
    paddingHorizontal: Spacing[4],
  },
  actionButton: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.brand,
  },
  actionGradient: {
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
}))

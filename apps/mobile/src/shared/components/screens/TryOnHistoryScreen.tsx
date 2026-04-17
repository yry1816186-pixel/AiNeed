import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { tryOnApi, type TryOnResult } from '../../../services/api/tryon.api';
import { colors } from '../../../design-system/theme/tokens/colors';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { typography } from '../../../design-system/theme/tokens/typography';
import { spacing } from '../../../design-system/theme/tokens/spacing';
import { shadows } from '../../../design-system/theme/tokens/shadows';
import { Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../contexts/ThemeContext';


type FilterTab = "all" | "completed" | "failed";

export const TryOnHistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation();
  const [items, setItems] = useState<TryOnResult[]>([]);
  const [_total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [hasMore, setHasMore] = useState(true);

  const loadHistory = useCallback(
    async (pageNum: number = 1, isRefresh: boolean = false) => {
      if (loading) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await tryOnApi.getHistory(pageNum, 20);
        if (response.success && response.data) {
          const newItems = response.data.items;
          if (isRefresh || pageNum === 1) {
            setItems(newItems);
          } else {
            setItems((prev) => [...prev, ...newItems]);
          }
          setTotal(response.data.total);
          setPage(pageNum);
          setHasMore(newItems.length >= 20);
        }
      } catch {
        if (!isRefresh) {
          Alert.alert("错误", "加载试衣历史失败");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading]
  );

  useEffect(() => {
    void loadHistory(1);
  }, []);

  const handleRefresh = useCallback(() => {
    void loadHistory(1, true);
  }, [loadHistory]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      void loadHistory(page + 1);
    }
  }, [hasMore, loading, page, loadHistory]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("确认删除", "确定要删除这条试衣记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          await tryOnApi.deleteTryOn(id);
          setItems((prev) => prev.filter((item) => item.id !== id));
          setTotal((prev) => prev - 1);
        },
      },
    ]);
  }, []);

  const handleRetry = useCallback(
    async (id: string) => {
      const response = await tryOnApi.retryTryOn(id);
      if (response.success && response.data) {
        Alert.alert("提示", "重试请求已提交");
        void loadHistory(1, true);
      } else {
        Alert.alert("提示", response.error?.message ?? "重试失败");
      }
    },
    [loadHistory]
  );

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) =>
          activeTab === "completed" ? item.status === "completed" : item.status === "failed"
        );

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "completed", label: "已完成" },
    { key: "failed", label: "失败" },
  ];

  const renderItem = useCallback(
    ({ item }: { item: TryOnResult }) => {
      const statusColor =
        item.status === "completed"
          ? colors.warmPrimary.mint[500]
          : item.status === "failed"
          ? colors.semantic.error.main
          : colors.warmPrimary.ocean[500];

      const statusLabel =
        item.status === "completed"
          ? "已完成"
          : item.status === "failed"
          ? "失败"
          : item.status === "processing"
          ? "处理中"
          : "等待中";

      return (
        <Animated.View entering={FadeInUp.duration(300)}>
          <View style={styles.card}>
            <Image
              source={{
                uri: item.resultImageDataUri ?? item.resultImageUrl ?? item.item?.mainImage ?? "",
              }}
              style={styles.cardImage}
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.item?.name ?? "试衣结果"}
              </Text>
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleDateString("zh-CN")}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              {item.status === "failed" && (
                <TouchableOpacity style={styles.retryButton} onPress={() => handleRetry(item.id)}>
                  <Ionicons name="refresh" size={16} color={colors.warmPrimary.ocean[600]} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.semantic.error.main} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      );
    },
    [handleDelete, handleRetry]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="shirt-outline" size={64} color={colors.neutral[300]} />
        <Text style={styles.emptyTitle}>还没有试衣记录</Text>
        <Text style={styles.emptySubtitle}>去试试 AI 虚拟试衣吧</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate("VirtualTryOn" as never)}
        >
          <Ionicons name="sparkles" size={18} color={colors.textInverse} />
          <Text style={styles.emptyButtonText}>开始试衣</Text>
        </TouchableOpacity>
      </View>
    ),
    [navigation]
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.layout.screenPadding,
    paddingVertical: DesignTokens.spacing[3],
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
  },
  tabActive: {
    backgroundColor: colors.brand.warmPrimary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[600],
  },
  tabTextActive: {
    color: colors.textInverse,
    fontWeight: typography.fontWeight.bold,
  },
  listContent: {
    paddingHorizontal: spacing.layout.screenPadding,
    paddingBottom: DesignTokens.spacing[10],
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius.xl,
    padding: DesignTokens.spacing[3],
    marginBottom: DesignTokens.spacing[3],
    ...shadows.presets.md,
  },
  cardImage: {
    width: Spacing['4xl'],
    height: 100,
    borderRadius: spacing.borderRadius.lg,
    resizeMode: "cover",
    backgroundColor: colors.neutral[100],
  },
  cardContent: {
    flex: 1,
    marginLeft: DesignTokens.spacing[3],
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  cardDate: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textInverse,
  },
  cardActions: {
    justifyContent: "center",
    gap: Spacing.sm,
  },
  retryButton: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    backgroundColor: colors.warmPrimary.ocean[50],
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    backgroundColor: colors.semantic.error.light,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    marginTop: DesignTokens.spacing['1.5'],
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: colors.brand.warmPrimary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: spacing.borderRadius.xl,
    ...shadows.presets.md,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textInverse,
  },
}))

export default TryOnHistoryScreen;

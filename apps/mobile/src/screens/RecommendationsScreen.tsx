import React, { useState, useCallback, useEffect, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { recommendationsApi, type RecommendedItem } from "../services/api/tryon.api";
import { useAuthStore } from "../stores/index";
import { useTheme, createStyles } from 'undefined';
import { DesignTokens } from "../theme/tokens/design-tokens";

import { ImageWithPlaceholder } from "../shared/components/common/ImageWithPlaceholder";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2 + 80; // 图片高度 + 信息区域高度

type RecommendationTab = "personalized" | "trending" | "discover";

const TABS: { key: RecommendationTab; label: string }[] = [
  { key: "personalized", label: "为你推荐" },
  { key: "trending", label: "热门趋势" },
  { key: "discover", label: "发现好物" },
];

/**
 * 推荐卡片组件 - 使用 React.memo 优化
 * 避免父组件状态变化时不必要的重渲染
 */
interface RecommendationCardProps {
  item: RecommendedItem;
  index: number;
  onPress: (item: RecommendedItem) => void;
}

const RecommendationCard = memo(function RecommendationCard({
  item,
  index,
  onPress,
}: RecommendationCardProps) {
    const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { marginLeft: index % 2 === 0 ? 12 : 6, marginRight: index % 2 === 0 ? 6 : 12 },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <ImageWithPlaceholder source={{ uri: item.mainImage }} style={styles.cardImage} />
      {item.score && item.score > 0.8 && (
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{Math.round(item.score * 100)}% 匹配</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={styles.cardBrand} numberOfLines={1}>
            {item.brand}
          </Text>
        )}
        <Text style={styles.cardPrice}>¥{item.price?.toFixed(0) ?? "--"}</Text>
      </View>
    </TouchableOpacity>
  );
});

export const RecommendationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<RecommendationTab>("personalized");
  const [items, setItems] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (tab: RecommendationTab) => {
    setError(null);
    try {
      let response;
      switch (tab) {
        case "personalized":
          response = await recommendationsApi.getPersonalized({ limit: 20 });
          break;
        case "trending":
          response = await recommendationsApi.getTrending(20);
          break;
        case "discover":
          response = await recommendationsApi.getDiscover(20);
          break;
      }
      if (response.success && response.data) {
        setItems(Array.isArray(response.data) ? response.data : []);
      } else {
        setItems([]);
        setError("暂无推荐数据");
      }
    } catch (err) {
      setItems([]);
      setError("加载失败，请重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchRecommendations(activeTab);
  }, [activeTab, fetchRecommendations]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchRecommendations(activeTab);
  }, [activeTab, fetchRecommendations]);

  const handleItemPress = useCallback(
    (item: RecommendedItem) => {
      navigation.navigate("RecommendationDetail", {
        id: item.id,
        recommendation: item,
      });
    },
    [navigation]
  );

  const renderCard = useCallback(
    ({ item, index }: { item: RecommendedItem; index: number }) => (
      <RecommendationCard item={item} index={index} onPress={handleItemPress} />
    ),
    [handleItemPress]
  );

  // 固定高度的卡片，使用 getItemLayout 优化 FlatList 性能
  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * Math.floor(index / 2) + 12 * Math.floor(index / 2),
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: RecommendedItem) => item.id, []);

  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>正在获取推荐...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchRecommendations(activeTab)}
          >
            <Text style={styles.retryText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Ionicons name="sparkles-outline" size={64} color={colors.primary} />
        <Text style={styles.emptyTitle}>AI 智能推荐</Text>
        <Text style={styles.emptySubtext}>
          {isAuthenticated ? "完善你的风格偏好，获取更精准的推荐" : "登录后获取个性化穿搭推荐"}
        </Text>
      </View>
    );
  }, [loading, error, activeTab, fetchRecommendations, isAuthenticated]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 推荐</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            /* filter modal - v3 deferred */
          }}
        >
          <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              if (tab.key !== activeTab) {
                setLoading(true);
                setActiveTab(tab.key);
              }
            }}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderCard}
        numColumns={2}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        // FlatList 性能优化参数
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: colors.text },
  filterButton: { padding: 8 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.textSecondary },
  tabLabelActive: { color: DesignTokens.colors.neutral.white },
  list: { paddingHorizontal: 6, paddingBottom: 20 },
  emptyList: { flexGrow: 1 },
  card: {
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden",
    elevation: 2,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImage: { width: "100%", height: CARD_WIDTH * 1.2, backgroundColor: colors.background },
  matchBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  matchText: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "700", color: DesignTokens.colors.neutral.white },
  cardInfo: { padding: 10 },
  cardName: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "600", color: colors.textPrimary, lineHeight: 18 },
  cardBrand: { fontSize: DesignTokens.typography.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  cardPrice: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "700", color: colors.primary, marginTop: 4 },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, marginTop: 16 },
  emptySubtext: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: 12 },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  retryText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: DesignTokens.colors.neutral.white },
});

export default RecommendationsScreen;

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FlashList } from "../../polyfills/flash-list";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { PostMasonryCard } from '../../../components/community/PostMasonryCard';
import type { PostCardData } from '../../../components/community/PostMasonryCard';
import { Spacing } from '../../../design-system/theme';


type PostCardDataInternal = PostCardData;

interface CommunityFeedProps {
  activeMainTab: string;
  posts: PostCardDataInternal[];
  followingFeed: PostCardDataInternal[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  visibleIds: Set<string>;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onHeightMeasured: (itemId: string, height: number) => void;
  onViewableItemsChanged: (info: {
    viewableItems: { item: PostCardData; index: number | null }[];
  }) => void;
  viewabilityConfig: { itemVisiblePercentThreshold: number };
}

function CommunityFeedInner({
  activeMainTab,
  posts,
  followingFeed,
  loading,
  error,
  refreshing,
  visibleIds,
  hasMore,
  onRefresh,
  onLoadMore,
  onRetry,
  onHeightMeasured,
  onViewableItemsChanged,
  viewabilityConfig,
}: CommunityFeedProps) {
    const { colors } = useTheme();
  const currentPosts = activeMainTab === "discover" ? posts : followingFeed;

  const renderFollowingFeedItem = (item: PostCardDataInternal, index: number) => {
    if (item.feedType === "like" || item.feedType === "tryon") {
      return (
        <View key={item.id} style={s.feedActivityCard}>
          <View style={s.feedActivityContent}>
            <Ionicons
              name={item.feedType === "like" ? "heart" : "shirt-outline"}
              size={16}
              color={item.feedType === "like" ? "colors.error" : colors.neutral[500]} // custom color
            />
            <Text style={s.feedActivityText}>{item.title}</Text>
          </View>
        </View>
      );
    }
    return (
      <PostMasonryCard
        key={item.id}
        item={item}
        index={index}
        onPress={() => {}}
        visible={visibleIds.has(item.id)}
      />
    );
  };

  if (loading && currentPosts.length === 0) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centerContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color={colors.textTertiary} />
        <Text style={s.errorTitle}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
          <Text style={s.retryBtnText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentPosts.length === 0) {
    return (
      <View style={s.centerContainer}>
        <Ionicons name="chatbubbles-outline" size={56} color={colors.textTertiary} />
        <Text style={s.emptyTitle}>
          {activeMainTab === "following" ? "还没有关注动态" : "还没有内容"}
        </Text>
        <Text style={s.emptySubtext}>
          {activeMainTab === "following" ? "关注更多用户来获取动态" : "成为第一个分享穿搭的人吧"}
        </Text>
      </View>
    );
  }

  if (activeMainTab === "following") {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={s.scrollContent}
      >
        {followingFeed.map((item, idx) => renderFollowingFeedItem(item, idx))}
        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>
    );
  }

  return (
    <FlashList
      masonry
      data={posts}
      numColumns={2}
      renderItem={({ item, index }: { item: PostCardData; index: number }) => (
        <PostMasonryCard
          item={item}
          index={index}
          onPress={() => {}}
          visible={visibleIds.has(item.id)}
          onHeightMeasured={(height) => onHeightMeasured(item.id, height)}
        />
      )}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={s.masonryListContent}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      ListFooterComponent={
        loading && posts.length > 0 ? (
          <View style={s.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s.loadingMoreText}>加载更多...</Text>
          </View>
        ) : null
      }
    />
  );
}

export const CommunityFeed = React.memo(CommunityFeedInner);

const s = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: DesignTokens.spacing[10],
  },
  loadingText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary, marginTop: DesignTokens.spacing[3]},
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary, marginTop: Spacing.md},
  emptySubtext: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, marginTop: DesignTokens.spacing['1.5']},
  errorTitle: { fontSize: DesignTokens.typography.sizes.md, color: colors.textPrimary, marginTop: Spacing.md, textAlign: "center" },
  retryBtn: {
    marginTop: Spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 28,
  },
  retryBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  scrollContent: { paddingTop: DesignTokens.spacing[3], paddingBottom: DesignTokens.spacing[10]},
  masonryListContent: { paddingHorizontal: DesignTokens.spacing[3], paddingTop: DesignTokens.spacing[3], paddingBottom: DesignTokens.spacing[10]},
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingMoreText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary },
  feedActivityCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: DesignTokens.spacing['3.5'],
    marginHorizontal: DesignTokens.spacing[3],
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  feedActivityContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  feedActivityText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    flex: 1,
  },
});

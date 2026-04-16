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
import { theme } from '../../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { PostMasonryCard } from "../../components/community/PostMasonryCard";
import type { PostCardData } from "../../components/community/PostMasonryCard";

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
  const currentPosts = activeMainTab === "discover" ? posts : followingFeed;

  const renderFollowingFeedItem = (item: PostCardDataInternal, index: number) => {
    if (item.feedType === "like" || item.feedType === "tryon") {
      return (
        <View key={item.id} style={s.feedActivityCard}>
          <View style={s.feedActivityContent}>
            <Ionicons
              name={item.feedType === "like" ? "heart" : "shirt-outline"}
              size={16}
              color={item.feedType === "like" ? "#FF4757" : DesignTokens.colors.brand.slate} // custom color
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={s.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centerContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color={theme.colors.textTertiary} />
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
        <Ionicons name="chatbubbles-outline" size={56} color={theme.colors.textTertiary} />
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
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={s.scrollContent}
      >
        {followingFeed.map((item, idx) => renderFollowingFeedItem(item, idx))}
        <View style={{ height: 80 }} />
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
          tintColor={theme.colors.primary}
        />
      }
      contentContainerStyle={s.masonryListContent}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      ListFooterComponent={
        loading && posts.length > 0 ? (
          <View style={s.loadingMore}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
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
    paddingHorizontal: 40,
  },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 6 },
  errorTitle: { fontSize: 16, color: theme.colors.textPrimary, marginTop: 16, textAlign: "center" },
  retryBtn: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  retryBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: "600" },
  scrollContent: { paddingTop: 12, paddingBottom: 40 },
  masonryListContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 },
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingMoreText: { fontSize: 13, color: theme.colors.textTertiary },
  feedActivityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  feedActivityContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  feedActivityText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
});

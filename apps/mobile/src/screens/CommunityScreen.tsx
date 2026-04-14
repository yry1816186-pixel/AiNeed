import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MasonryFlashList } from '@shopify/flash-list';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../theme';
import { communityApi } from '../services/api/community.api';
import { TrendingCard } from '../components/community/TrendingCard';
import { PostMasonryCard } from '../components/community/PostMasonryCard';
import type { PostCardData } from '../components/community/PostMasonryCard';
import { CreatePostModal } from '../components/community/CreatePostModal';

/**
 * Estimate image card height from image URL using a deterministic hash.
 * Produces heights in the range [baseHeight, baseHeight * 2] for masonry variety.
 */
function estimateImageHeight(imageUrl: string, baseHeight: number = 160): number {
  if (!imageUrl) return baseHeight;
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    hash = ((hash << 5) - hash + imageUrl.charCodeAt(i)) | 0;
  }
  const ratio = 1.0 + (Math.abs(hash) % 100) / 100; // 1.0 to 2.0
  return Math.round(baseHeight * ratio);
}

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'outfit', label: '穿搭分享' },
  { key: 'recommend', label: '好物推荐' },
  { key: 'style', label: '风格讨论' },
  { key: 'ootd', label: 'OOTD' },
] as const;

const MAIN_TABS = [
  { key: 'discover', label: '发现' },
  { key: 'following', label: '关注' },
] as const;

type PostCardDataInternal = PostCardData;

interface CommunityPostData {
  id: string;
  title?: string;
  content?: string;
  images?: string[];
  likesCount?: number;
  author?: {
    nickname?: string;
    avatar?: string | null;
  };
}

export const CommunityScreen: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<string>('discover');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [posts, setPosts] = useState<PostCardDataInternal[]>([]);
  const [followingFeed, setFollowingFeed] = useState<PostCardDataInternal[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Track which card IDs are currently visible for intersection-based animation
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const transformPosts = useCallback((raw: CommunityPostData[]): PostCardDataInternal[] => {
    return raw.map((p: CommunityPostData, idx: number) => ({
      id: p.id || String(idx),
      title: p.title || p.content?.slice(0, 40) || '',
      image: p.images?.[0] || '',
      authorName: p.author?.nickname || '用户',
      authorAvatar: p.author?.avatar || '',
      likesCount: p.likesCount || 0,
      isFeatured: (p.likesCount || 0) > 100,
      imageHeight: estimateImageHeight(p.images?.[0] || ''),
    }));
  }, []);

  const fetchPosts = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (pageNum === 1) setLoading(true);
        setError(null);

        const params: Record<string, string | number> = { page: pageNum, limit: 12, sort: 'latest' };
        if (activeCategory !== 'all') {
          params.category = activeCategory;
        }

        const response = await communityApi.getPosts(params);

        if (response.success && response.data) {
          const items = response.data.items || [];
          const transformed = transformPosts(items);
          setPosts((prev) => (append ? [...prev, ...transformed] : transformed));
          setPage(pageNum);
          setHasMore(response.data.hasMore ?? items.length >= 12);
        } else {
          setError(response.error?.message || '加载社区内容失败，请重试');
        }
      } catch {
        setError('网络错误，请重试');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, transformPosts],
  );

  const fetchFollowingFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await communityApi.getFollowingFeed({ page: 1, limit: 20 });
      if (response.success && response.data) {
        const items = response.data.items || [];
        const feedItems: PostCardDataInternal[] = items.map((item, idx) => {
          const feedType = (item as unknown as PostCardDataInternal & { feedType?: string }).feedType;
          if (feedType === 'like') {
            return {
              id: item.id || String(idx),
              title: `${item.author?.nickname || '用户'} 赞了某帖子`,
              image: item.images?.[0] || '',
              authorName: item.author?.nickname || '用户',
              authorAvatar: item.author?.avatar || '',
              likesCount: 0,
              isFeatured: false,
              imageHeight: 80,
              feedType: 'like',
              feedMeta: item.title || '',
            };
          }
          if (feedType === 'tryon') {
            return {
              id: item.id || String(idx),
              title: `${item.author?.nickname || '用户'} 试穿了某服装`,
              image: item.images?.[0] || '',
              authorName: item.author?.nickname || '用户',
              authorAvatar: item.author?.avatar || '',
              likesCount: 0,
              isFeatured: false,
              imageHeight: 80,
              feedType: 'tryon',
              feedMeta: item.title || '',
            };
          }
          return transformPosts([item])[0];
        });
        setFollowingFeed(feedItems);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [transformPosts]);

  useEffect(() => {
    if (activeMainTab === 'discover') {
      fetchPosts(1, false);
    } else {
      fetchFollowingFeed();
    }
  }, [activeMainTab, fetchPosts, fetchFollowingFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeMainTab === 'discover') {
      fetchPosts(1, false);
    } else {
      fetchFollowingFeed();
    }
  }, [activeMainTab, fetchPosts, fetchFollowingFeed]);

  const onLoadMore = useCallback(() => {
    if (activeMainTab === 'discover' && hasMore && !loading) {
      fetchPosts(page + 1, true);
    }
  }, [activeMainTab, hasMore, loading, page, fetchPosts]);

  const handleCreatePost = useCallback(
    async (title: string, content: string, category: string) => {
      try {
        const response = await communityApi.createPost({ title, content, category });
        if (response.success) {
          Alert.alert('成功', '发布成功');
          fetchPosts(1, false);
        } else {
          Alert.alert('提示', response.error?.message || '发布失败，请重试');
        }
      } catch {
        Alert.alert('提示', '发布失败，请重试');
      }
    },
    [fetchPosts],
  );

  // Intersection-based visibility handler for masonry cards
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; index: number }> }) => {
      const newVisibleIds = new Set<string>();
      viewableItems.forEach((vi) => {
        newVisibleIds.add(vi.item.id);
      });
      // Only update if the set actually changed
      if (
        newVisibleIds.size !== visibleIdsRef.current.size ||
        [...newVisibleIds].some((id) => !visibleIdsRef.current.has(id))
      ) {
        visibleIdsRef.current = newVisibleIds;
        setVisibleIds(newVisibleIds);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
  }).current;

  const renderFollowingFeedItem = useCallback(
    (item: PostCardDataInternal, index: number) => {
      if (item.feedType === 'like' || item.feedType === 'tryon') {
        return (
          <View key={item.id} style={s.feedActivityCard}>
            <View style={s.feedActivityContent}>
              <Ionicons
                name={item.feedType === 'like' ? 'heart' : 'shirt-outline'}
                size={16}
                color={item.feedType === 'like' ? '#FF4757' : '#6C5CE7'}
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
    },
    [visibleIds],
  );

  const currentPosts = activeMainTab === 'discover' ? posts : followingFeed;

  return (
    <GestureHandlerRootView style={s.root}>
      <View style={s.header}>
        <Text style={s.headerTitle}>社区</Text>
        <TouchableOpacity style={s.searchBtn} accessibilityLabel="搜索" accessibilityRole="button">
          <Ionicons name="search-outline" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main tabs: discover / following */}
      <View style={s.mainTabRow}>
        {MAIN_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.mainTab, activeMainTab === tab.key && s.mainTabActive]}
            onPress={() => setActiveMainTab(tab.key)}
          >
            <Text style={[s.mainTabText, activeMainTab === tab.key && s.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category filter - only in discover tab */}
      {activeMainTab === 'discover' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryScrollContent}
          style={s.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[s.categoryChip, activeCategory === cat.key && s.categoryChipActive]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text
                style={[s.categoryChipText, activeCategory === cat.key && s.categoryChipTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Trending section - only in discover tab */}
      {activeMainTab === 'discover' && (
        <TrendingCard onPressTag={(tag) => {
          setActiveCategory('all');
        }} />
      )}

      {loading && currentPosts.length === 0 ? (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={s.loadingText}>加载中...</Text>
        </View>
      ) : error ? (
        <View style={s.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={theme.colors.textTertiary} />
          <Text style={s.errorTitle}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => {
            if (activeMainTab === 'discover') fetchPosts(1, false);
            else fetchFollowingFeed();
          }}>
            <Text style={s.retryBtnText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : currentPosts.length === 0 ? (
        <View style={s.centerContainer}>
          <Ionicons name="chatbubbles-outline" size={56} color={theme.colors.textTertiary} />
          <Text style={s.emptyTitle}>{activeMainTab === 'following' ? '还没有关注动态' : '还没有内容'}</Text>
          <Text style={s.emptySubtext}>{activeMainTab === 'following' ? '关注更多用户来获取动态' : '成为第一个分享穿搭的人吧'}</Text>
        </View>
      ) : activeMainTab === 'following' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          contentContainerStyle={s.scrollContent}
        >
          {followingFeed.map((item, idx) => renderFollowingFeedItem(item, idx))}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <MasonryFlashList
          data={posts}
          numColumns={2}
          renderItem={({ item, index }) => (
            <PostMasonryCard
              item={item}
              index={index}
              onPress={() => {}}
              visible={visibleIds.has(item.id)}
              onHeightMeasured={(height) => {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === item.id && Math.abs(p.imageHeight - height) > 5
                      ? { ...p, imageHeight: height }
                      : p,
                  ),
                );
              }}
            />
          )}
          estimatedItemSize={250}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          contentContainerStyle={s.masonryListContent}
          onViewableItemsChanged={handleViewableItemsChanged}
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
      )}
      <TouchableOpacity
        style={s.fab}
        onPress={() => setShowCreateModal(true)}
        accessibilityLabel="发布动态"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={theme.colors.surface} />
      </TouchableOpacity>
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />
    </GestureHandlerRootView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  searchBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mainTab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 8,
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  mainTabText: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: '500' },
  mainTabTextActive: { color: theme.colors.primary, fontWeight: '700' },
  categoryScroll: { backgroundColor: theme.colors.surface, maxHeight: 52 },
  categoryScrollContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: theme.colors.background },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryChipText: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '500' },
  categoryChipTextActive: { color: theme.colors.surface, fontWeight: '600' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 6 },
  errorTitle: { fontSize: 16, color: theme.colors.text, marginTop: 16, textAlign: 'center' },
  retryBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  retryBtnText: { color: theme.colors.surface, fontSize: 15, fontWeight: '600' },
  scrollContent: { paddingTop: 12, paddingBottom: 40 },
  masonryListContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 },
  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText: { fontSize: 13, color: theme.colors.textTertiary },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  feedActivityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedActivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  feedActivityText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
});

export default CommunityScreen;

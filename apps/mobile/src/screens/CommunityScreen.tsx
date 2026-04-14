﻿﻿import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../theme';
import { communityApi } from '../services/api/community.api';
import { TrendingCard } from '../components/community/TrendingCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SPRING_CFG = { damping: 15, stiffness: 150, mass: 0.5 };

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

interface PostCardData {
  id: string;
  title: string;
  image: string;
  authorName: string;
  authorAvatar: string;
  likesCount: number;
  isFeatured: boolean;
  imageHeight: number;
  bloggerLevel?: 'blogger' | 'big_v' | null;
  feedType?: 'post' | 'like' | 'tryon';
  feedMeta?: string;
}

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

function BloggerBadge({ level }: { level: 'blogger' | 'big_v' }) {
  if (level === 'big_v') {
    return (
      <View style={s.bigVBadge}>
        <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
      </View>
    );
  }
  return (
    <View style={s.bloggerBadge}>
      <Ionicons name="checkmark" size={8} color="#FFFFFF" />
    </View>
  );
}

function PostMasonryCard({
  item,
  index,
  onPress,
}: {
  item: PostCardData;
  index: number;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);

  useEffect(() => {
    const d = (index % 6) * 80;
    opacity.value = withDelay(d, withTiming(1, { duration: 350 }));
    scale.value = withDelay(d, withSpring(1, SPRING_CFG));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[s.masonryCard, animatedStyle]}>
        <View style={[s.masonryImageContainer, { height: item.imageHeight }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={s.masonryImage} resizeMode="cover" />
          ):(
            <View style={s.masonryImagePlaceholder}>
              <Ionicons name="image-outline" size={28} color={theme.colors.placeholderBg} />
            </View>
          )}
          {item.isFeatured && (
            <View style={s.featuredBadge}>
              <Ionicons name="star" size={10} color={theme.colors.gold} />
              <Text style={s.featuredText}>精华</Text>
            </View>
          )}
        </View>
        <View style={s.masonryInfo}>
          <Text style={s.masonryTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.masonryFooter}>
            <View style={s.masonryAuthor}>
              {item.authorAvatar?(
                <View style={s.avatarWrapper}>
                  <Image source={{ uri: item.authorAvatar }} style={s.masonryAvatar} />
                  {item.bloggerLevel && <BloggerBadge level={item.bloggerLevel} />}
                </View>
              ):(
                <View style={s.avatarWrapper}>
                  <View style={s.masonryAvatarPlaceholder}>
                    <Ionicons name="person" size={10} color={theme.colors.surface} />
                  </View>
                  {item.bloggerLevel && <BloggerBadge level={item.bloggerLevel} />}
                </View>
              )}
              <Text style={s.masonryAuthorName} numberOfLines={1}>{item.authorName}</Text>
            </View>
            <View style={s.masonryLikes}>
              <Ionicons name="heart-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={s.masonryLikesCount}>
                {item.likesCount >= 1000
                  ? `${(item.likesCount / 1000).toFixed(1)}k`
                  : String(item.likesCount)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function CreatePostModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, category: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('outfit');

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入标题');
      return;
    }
    onSubmit(title, content, selectedCategory);
    setTitle('');
    setContent('');
    setSelectedCategory('outfit');
    onClose();
  }, [title, content, selectedCategory, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.modalCancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>发布动态</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={s.modalSubmitText}>发布</Text>
          </TouchableOpacity>
        </View>
        <View style={s.modalCategoryRow}>
          {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[s.modalCategoryChip, selectedCategory === cat.key && s.modalCategoryChipActive]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[s.modalCategoryChipText, selectedCategory === cat.key && s.modalCategoryChipTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={s.modalTitleInput}
          placeholder="标题"
          placeholderTextColor={theme.colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />
        <TextInput
          style={s.modalContentInput}
          placeholder="分享你的穿搭心得..."
          placeholderTextColor={theme.colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <View style={s.modalToolbar}>
          <TouchableOpacity style={s.modalToolBtn}>
            <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
            <Text style={s.modalToolText}>添加图片</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalToolBtn}>
            <Ionicons name="pricetag-outline" size={20} color={theme.colors.primary} />
            <Text style={s.modalToolText}>添加标签</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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

  const transformPosts = useCallback((raw: CommunityPostData[]): PostCardDataInternal[] => {
    return raw.map((p: CommunityPostData, idx: number) => ({
      id: p.id || String(idx),
      title: p.title || p.content?.slice(0, 40) || '',
      image: p.images?.[0] || '',
      authorName: p.author?.nickname || '用户',
      authorAvatar: p.author?.avatar || '',
      likesCount: p.likesCount || 0,
      isFeatured: (p.likesCount || 0) > 100,
      imageHeight: 160 + (idx % 4) * 30,
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
          const transformed =transformPosts(items);
          setPosts((prev) => (append ? [...prev, ...transformed]: transformed));
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
          const feedType = (item as PostCardDataInternal & { feedType?: string }).feedType;
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

  const onLoadMore= useCallback(() => {
    if (activeMainTab === 'discover' && hasMore && !loading) {
      fetchPosts(page + 1, true);
    }
  }, [activeMainTab, hasMore, loading, page, fetchPosts]);

  const handleCreatePost= useCallback(
    async (title: string, content: string, category: string) => {
      try {
        const response= await communityApi.createPost({ title, content, category });
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

  const { leftColumn, rightColumn } = useMemo(() => {
    const left: { item: PostCardData; index: number }[] = [];
    const right: { item: PostCardData; index: number }[] = [];
    posts.forEach((item, index) => {
      if (index % 2 === 0) {
        left.push({ item, index });
      } else {
        right.push({ item, index });
      }
    });
    return { leftColumn: left, rightColumn: right };
  }, [posts]);

  const renderCard= (data: { item: PostCardData; index: number }) => (
    <PostMasonryCard
      key={data.item.id}
      item={data.item}
      index={data.index}
      onPress={() => {}}
    />
  );

  const renderFollowingFeedItem = useCallback((item: PostCardDataInternal, index: number) => {
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
      />
    );
  }, []);

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
      ) : currentPosts.length === 0? (
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
              onLoadMore();
            }
          }}
          scrollEventThrottle={16}
          contentContainerStyle={s.scrollContent}
        >
          <View style={s.masonryRow}>
            <View style={s.masonryColumn}>{leftColumn.map(renderCard)}</View>
            <View style={s.masonryColumn}>{rightColumn.map(renderCard)}</View>
          </View>
          {loading && posts.length > 0 && (
            <View style={s.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={s.loadingMoreText}>加载更多...</Text>
            </View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
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

const s= StyleSheet.create({
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
  masonryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  masonryColumn: { flex: 1, gap: 12 },
  masonryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  masonryImageContainer: { width: '100%', backgroundColor: theme.colors.subtleBg, overflow: 'hidden' },
  masonryImage: { width: '100%', height: '100%' },
  masonryImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.subtleBg },
  featuredBadge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,184,0,0.9)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  featuredText: { fontSize: 10, fontWeight: '700', color: theme.colors.surface },
  masonryInfo: { padding: 10 },
  masonryTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, lineHeight: 18 },
  masonryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  masonryAuthor: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  masonryAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.subtleBg },
  masonryAvatarPlaceholder: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  masonryAuthorName: { fontSize: 11, color: theme.colors.textTertiary, flex: 1 },
  masonryLikes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  masonryLikesCount: { fontSize: 11, color: theme.colors.textTertiary, fontWeight: '500' },
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
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  modalCancelText: { fontSize: 15, color: theme.colors.textSecondary },
  modalSubmitText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  modalCategoryRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12,
    gap: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalCategoryChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surface },
  modalCategoryChipActive: { backgroundColor: theme.colors.primary },
  modalCategoryChipText: { fontSize: 13, color: theme.colors.textSecondary },
  modalCategoryChipTextActive: { color: theme.colors.surface, fontWeight: '600' },
  modalTitleInput: {
    paddingHorizontal: 20, paddingVertical: 14,
    fontSize: 18, fontWeight: '600', color: theme.colors.text,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalContentInput: {
    flex: 1, paddingHorizontal: 20, paddingVertical: 14,
    fontSize: 15, color: theme.colors.text, lineHeight: 22, minHeight: 150,
  },
  modalToolbar: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.border, gap: 24,
  },
  modalToolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalToolText: { fontSize: 13, color: theme.colors.textSecondary },
  avatarWrapper: { position: 'relative' },
  bloggerBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#6C5CE7',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF',
  },
  bigVBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#F1C40F',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF',
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


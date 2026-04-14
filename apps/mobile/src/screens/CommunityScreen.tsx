﻿import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Alert, Dimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '../theme';
import { communityApi } from '../services/api/community.api';
import { TrendingCard } from '../components/community/TrendingCard';
import { CreatePostModal } from '../components/community/CreatePostModal';
import type { PostCardData } from '../components/community/PostMasonryCard';
import { CommunityHeader } from './community/CommunityHeader';
import { CommunityFeed } from './community/CommunityFeed';
import { CreatePostFab } from './community/CreatePostFab';

const CARD_WIDTH = (Dimensions.get('window').width - 24 - 8) / 2;
const TEXT_AREA_HEIGHT = 68;
const calcHeight = (w?: number, h?: number) =>
  (w && h && w > 0) ? Math.round(CARD_WIDTH * (h / w) + TEXT_AREA_HEIGHT) : Math.round(CARD_WIDTH + TEXT_AREA_HEIGHT);

interface PostData { id: string; title?: string; content?: string; images?: string[]; imageWidth?: number; imageHeight?: number; likesCount?: number; author?: { nickname?: string; avatar?: string | null } }
type PostItem = PostCardData;

export const CommunityScreen: React.FC = () => {
  const [tab, setTab] = useState('discover');
  const [cat, setCat] = useState('all');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [feed, setFeed] = useState<PostItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const visRef = useRef<Set<string>>(new Set());
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const transform = useCallback((raw: PostData[]): PostItem[] =>
    raw.map((p, i) => ({ id: p.id || String(i), title: p.title || p.content?.slice(0, 40) || '', image: p.images?.[0] || '', authorName: p.author?.nickname || '用户', authorAvatar: p.author?.avatar || '', likesCount: p.likesCount || 0, isFeatured: (p.likesCount || 0) > 100, imageHeight: calcHeight(p.imageWidth, p.imageHeight) })), []);

  const fetchPosts = useCallback(async (pn = 1, append = false) => {
    try { if (pn === 1) setLoading(true); setError(null);
      const params: Record<string, string | number> = { page: pn, limit: 12, sort: 'latest' };
      if (cat !== 'all') params.category = cat;
      const r = await communityApi.getPosts(params);
      if (r.success && r.data) { const t = transform(r.data.items || []); setPosts(p => append ? [...p, ...t] : t); setPage(pn); setHasMore(r.data.hasMore ?? (r.data.items || []).length >= 12); }
      else setError(r.error?.message || '加载社区内容失败，请重试');
    } catch { setError('网络错误，请重试'); } finally { setLoading(false); setRefreshing(false); }
  }, [cat, transform]);

  const fetchFeed = useCallback(async () => {
    try { setLoading(true); setError(null);
      const r = await communityApi.getFollowingFeed({ page: 1, limit: 20 });
      if (r.success && r.data) { const items = r.data.items || [];
        setFeed(items.map((item, i) => { const ft = (item as any).feedType;
          if (ft === 'like' || ft === 'tryon') return { id: item.id || String(i), title: `${item.author?.nickname || '用户'} ${ft === 'like' ? '赞了某帖子' : '试穿了某服装'}`, image: item.images?.[0] || '', authorName: item.author?.nickname || '用户', authorAvatar: item.author?.avatar || '', likesCount: 0, isFeatured: false, imageHeight: 80, feedType: ft, feedMeta: item.title || '' } as PostItem;
          return transform([item])[0]; })); }
    } catch { setError('网络错误，请重试'); } finally { setLoading(false); }
  }, [transform]);

  useEffect(() => { tab === 'discover' ? fetchPosts(1, false) : fetchFeed(); }, [tab, fetchPosts, fetchFeed]);

  const onRefresh = useCallback(() => { setRefreshing(true); tab === 'discover' ? fetchPosts(1, false) : fetchFeed(); }, [tab, fetchPosts, fetchFeed]);
  const onLoadMore = useCallback(() => { if (tab === 'discover' && hasMore && !loading) fetchPosts(page + 1, true); }, [tab, hasMore, loading, page, fetchPosts]);
  const onCreate = useCallback(async (t: string, c: string, ct: string) => { try { const r = await communityApi.createPost({ title: t, content: c, category: ct }); if (r.success) { Alert.alert('成功', '发布成功'); fetchPosts(1, false); } else Alert.alert('提示', r.error?.message || '发布失败'); } catch { Alert.alert('提示', '发布失败，请重试'); } }, [fetchPosts]);
  const onVisChange = useCallback(({ viewableItems }: { viewableItems: Array<{ item: PostCardData }> }) => { const s = new Set<string>(); viewableItems.forEach(v => s.add(v.item.id)); if (s.size !== visRef.current.size || [...s].some(id => !visRef.current.has(id))) { visRef.current = s; setVisibleIds(s); } }, []);
  const onHeight = useCallback((id: string, h: number) => setPosts(p => p.map(x => x.id === id && Math.abs(x.imageHeight - h) > 5 ? { ...x, imageHeight: h } : x)), []);
  const onRetry = useCallback(() => { tab === 'discover' ? fetchPosts(1, false) : fetchFeed(); }, [tab, fetchPosts, fetchFeed]);
  const viewCfg = useRef({ itemVisiblePercentThreshold: 30 }).current;

  return (
    <GestureHandlerRootView style={s.root}>
      <CommunityHeader activeMainTab={tab} activeCategory={cat} onMainTabChange={setTab} onCategoryChange={setCat} showCategories={tab === 'discover'} />
      {tab === 'discover' && <TrendingCard onPressTag={() => setCat('all')} />}
      <CommunityFeed activeMainTab={tab} posts={posts} followingFeed={feed} loading={loading} error={error} refreshing={refreshing} visibleIds={visibleIds} hasMore={hasMore} onRefresh={onRefresh} onLoadMore={onLoadMore} onRetry={onRetry} onHeightMeasured={onHeight} onViewableItemsChanged={onVisChange} viewabilityConfig={viewCfg} />
      <CreatePostFab onPress={() => setShowModal(true)} />
      <CreatePostModal visible={showModal} onClose={() => setShowModal(false)} onSubmit={onCreate} />
    </GestureHandlerRootView>
  );
};

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background } });
export default CommunityScreen;

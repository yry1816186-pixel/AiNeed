import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, Alert, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useScreenTracking } from "../../../hooks/useAnalytics";
import { useTranslation } from "../../../i18n";
import { communityApi } from "../../../services/api/community.api";
import { flatColors as colors } from "../../../design-system/theme";
import type { PostCardData } from "../../community/components/PostMasonryCard";
import { CommunityHeader } from "./CommunityHeader";
import { CommunityFeed } from "./CommunityFeed";
import { CreatePostFab } from "./CreatePostFab";

const TEXT_AREA_HEIGHT = 68;

interface PostData {
  id: string;
  title?: string;
  content?: string;
  images?: string[];
  imageWidth?: number;
  imageHeight?: number;
  likesCount?: number;
  author?: { nickname?: string; avatar?: string | null };
}
type PostItem = PostCardData;

export const CommunityScreen: React.FC = () => {
  useScreenTracking("Community");
  const t = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const CARD_WIDTH = (screenWidth - 24 - 8) / 2;
  const calcHeight = useCallback(
    (w?: number, h?: number) =>
      w && h && w > 0
        ? Math.round(CARD_WIDTH * (h / w) + TEXT_AREA_HEIGHT)
        : Math.round(CARD_WIDTH + TEXT_AREA_HEIGHT),
    [CARD_WIDTH]
  );

  const [tab, setTab] = useState("discover");
  const [cat, setCat] = useState("all");
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

  const transform = useCallback(
    (raw: PostData[]): PostItem[] =>
      raw.map((p, i) => ({
        id: p.id || String(i),
        title: p.title || p.content?.slice(0, 40) || "",
        image: p.images?.[0] || "",
        authorName: p.author?.nickname || "用户",
        authorAvatar: p.author?.avatar || "",
        likesCount: p.likesCount || 0,
        isFeatured: (p.likesCount || 0) > 100,
        imageHeight: calcHeight(p.imageWidth, p.imageHeight),
      })),
    [calcHeight]
  );

  const networkError = t.errors.networkError;
  const serverError = t.errors.serverError;

  const fetchPosts = useCallback(
    async (pn = 1, append = false) => {
      try {
        if (pn === 1) {
          setLoading(true);
        }
        setError(null);
        const params: Record<string, string | number> = { page: pn, limit: 12, sort: "latest" };
        if (cat !== "all") {
          params.category = cat;
        }
        const r = await communityApi.getPosts(params);
        if (r.success && r.data) {
          const items = transform((r.data.items as PostData[]) || []);
          setPosts((prev) => (append ? [...prev, ...items] : items));
          setPage(pn);
          setHasMore(r.data.hasMore ?? (r.data.items || []).length >= 12);
        } else {
          setError((r.error?.message as string) || serverError);
        }
      } catch {
        setError(networkError);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cat, transform, networkError, serverError]
  );

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await communityApi.getFollowingFeed({ page: 1, limit: 20 });
      if (r.success && r.data) {
        const rawItems = (r.data.items || []) as (PostData & {
          feedType?: string;
          title?: string;
        })[];
        setFeed(
          rawItems.map((item, i) => {
            const ft = item.feedType;
            if (ft === "like" || ft === "tryon") {
              const feedItem: PostItem = {
                id: item.id || String(i),
                title: `${item.author?.nickname || "用户"} ${
                  ft === "like" ? "赞了某帖子" : "试穿了某服装"
                }`,
                image: item.images?.[0] || "",
                authorName: item.author?.nickname || "用户",
                authorAvatar: item.author?.avatar || "",
                likesCount: 0,
                isFeatured: false,
                imageHeight: 80,
              };
              return feedItem;
            }
            return transform([item])[0];
          })
        );
      }
    } catch {
      setError(networkError);
    } finally {
      setLoading(false);
    }
  }, [transform, networkError]);

  useEffect(() => {
    void (tab === "discover" ? fetchPosts(1, false) : fetchFeed());
  }, [tab, fetchPosts, fetchFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (tab === "discover" ? fetchPosts(1, false) : fetchFeed());
  }, [tab, fetchPosts, fetchFeed]);

  const onLoadMore = useCallback(() => {
    if (tab === "discover" && hasMore && !loading) {
      void fetchPosts(page + 1, true);
    }
  }, [tab, hasMore, loading, page, fetchPosts]);

  const doneText = t.common.done;
  const confirmText = t.common.confirm;
  const postText = t.community.post;
  const serverErrorText = t.errors.serverError;

  const onCreate = useCallback(
    async (title: string, content: string, category: string) => {
      try {
        const r = await communityApi.createPost({ title, content, category });
        if (r.success) {
          Alert.alert(doneText, postText);
          void fetchPosts(1, false);
        } else {
          Alert.alert(confirmText, (r.error?.message as string) || postText);
        }
      } catch {
        Alert.alert(confirmText, serverErrorText);
      }
    },
    [fetchPosts, doneText, postText, confirmText, serverErrorText]
  );

  const onVisChange = useCallback(
    ({ viewableItems }: { viewableItems: { item: PostCardData }[] }) => {
      const s = new Set<string>();
      viewableItems.forEach((v) => s.add(v.item.id));
      if (s.size !== visRef.current.size || [...s].some((id) => !visRef.current.has(id))) {
        visRef.current = s;
        setVisibleIds(s);
      }
    },
    []
  );

  const onHeight = useCallback(
    (id: string, h: number) =>
      setPosts((prev) =>
        prev.map((x) =>
          x.id === id && Math.abs(x.imageHeight - h) > 5 ? { ...x, imageHeight: h } : x
        )
      ),
    []
  );

  const onRetry = useCallback(() => {
    void (tab === "discover" ? fetchPosts(1, false) : fetchFeed());
  }, [tab, fetchPosts, fetchFeed]);

  const viewCfg = useRef({ itemVisiblePercentThreshold: 30 }).current;

  // TrendingCard and CreatePostModal may not exist yet — use dynamic imports to avoid build errors
  const TrendingCard = React.lazy(() => import("../components/TrendingCard"));
  const CreatePostModal = React.lazy(() =>
    import("../components/CreatePostModal").then((mod) => ({ default: mod.CreatePostModal }))
  );

  return (
    <GestureHandlerRootView style={s.root}>
      <CommunityHeader
        activeMainTab={tab}
        activeCategory={cat}
        onMainTabChange={setTab}
        onCategoryChange={setCat}
        showCategories={tab === "discover"}
      />
      {tab === "discover" && (
        <React.Suspense fallback={null}>
          <TrendingCard onPressTag={() => setCat("all")} />
        </React.Suspense>
      )}
      <CommunityFeed
        activeMainTab={tab}
        posts={posts}
        followingFeed={feed}
        loading={loading}
        error={error}
        refreshing={refreshing}
        visibleIds={visibleIds}
        hasMore={hasMore}
        onRefresh={onRefresh}
        onLoadMore={onLoadMore}
        onRetry={onRetry}
        onHeightMeasured={onHeight}
        onViewableItemsChanged={onVisChange}
        viewabilityConfig={viewCfg}
      />
      <CreatePostFab onPress={() => setShowModal(true)} />
      <React.Suspense fallback={null}>
        <CreatePostModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={onCreate}
        />
      </React.Suspense>
    </GestureHandlerRootView>
  );
};

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
export default CommunityScreen;

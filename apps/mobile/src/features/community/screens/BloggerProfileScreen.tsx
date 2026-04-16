import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { communityApi } from "../services/api/community.api";
import { bloggerApi, BloggerProduct } from "../services/api/blogger.api";
import { FollowButton } from "../components/social/FollowButton";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type BloggerProfileRoute = RouteProp<RootStackParamList, "BloggerProfile">;

const SCREEN_WIDTH = Dimensions.get("window").width;

const TAB_KEYS = ["posts", "schemes", "about"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  posts: "帖子",
  schemes: "TA的方案",
  about: "关于",
};

interface BloggerInfo {
  id: string;
  nickname: string;
  avatar: string | null;
  bio: string;
  bloggerLevel: "blogger" | "big_v" | null;
  followersCount: number;
  postsCount: number;
  isFollowing: boolean;
}

function BloggerBadge({ level }: { level: "blogger" | "big_v" }) {
  if (level === "big_v") {
    return (
      <View style={styles.bigVBadge}>
        <Ionicons name="shield-checkmark" size={12} color={DesignTokens.colors.neutral.white} />
      </View>
    );
  }
  return (
    <View style={styles.bloggerBadge}>
      <Ionicons name="checkmark" size={10} color={DesignTokens.colors.neutral.white} />
    </View>
  );
}

export const BloggerProfileScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<BloggerProfileRoute>();
  const bloggerId = route.params?.bloggerId ?? "";

  const [blogger, setBlogger] = useState<BloggerInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [posts, setPosts] = useState<
    {
      id: string;
      title: string;
      image: string;
      likesCount: number;
      imageHeight: number;
    }[]
  >([]);
  const [products, setProducts] = useState<BloggerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchBloggerProfile = useCallback(async () => {
    if (!bloggerId) {
      return;
    }
    try {
      setLoading(true);
      const response = await communityApi.getUserProfile?.(bloggerId);
      if (response && response.success && response.data) {
        const data = response.data;
        setBlogger({
          id: data.id,
          nickname: data.nickname ?? "",
          avatar: data.avatar ?? null,
          bio: data.bio ?? "",
          bloggerLevel:
            ((data as { bloggerLevel?: string }).bloggerLevel as "blogger" | "big_v" | null) ??
            null,
          followersCount: data.followersCount ?? 0,
          postsCount: data.postsCount ?? 0,
          isFollowing: data.isFollowing ?? false,
        });
      } else {
        // Fallback: construct from route params or show minimal profile
        setBlogger({
          id: bloggerId,
          nickname: "博主",
          avatar: null,
          bio: "",
          bloggerLevel: null,
          followersCount: 0,
          postsCount: 0,
          isFollowing: false,
        });
      }
    } catch {
      setBlogger({
        id: bloggerId,
        nickname: "博主",
        avatar: null,
        bio: "",
        bloggerLevel: null,
        followersCount: 0,
        postsCount: 0,
        isFollowing: false,
      });
    } finally {
      setLoading(false);
    }
  }, [bloggerId]);

  const fetchPosts = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (pageNum === 1) {
          setLoadingMore(true);
        }
        const response = await communityApi.getPosts({
          authorId: bloggerId,
          page: pageNum,
          limit: 12,
        });
        if (response.success && response.data) {
          const items = response.data.items.map((p, idx) => ({
            id: p.id,
            title: p.title || p.content?.slice(0, 40) || "",
            image: p.images?.[0] || "",
            likesCount: p.likesCount || 0,
            imageHeight: 160 + (idx % 4) * 30,
          }));
          setPosts((prev) => (append ? [...prev, ...items] : items));
          setPage(pageNum);
          setHasMore(response.data.hasMore ?? items.length >= 12);
        }
      } catch {
        // Posts loading failure is non-critical
      } finally {
        setLoadingMore(false);
      }
    },
    [bloggerId]
  );

  const fetchProducts = useCallback(async () => {
    try {
      const response = await bloggerApi.getBloggerProducts(bloggerId, { limit: 20 });
      if (response.success && response.data) {
        setProducts(response.data.items);
      }
    } catch {
      // Products loading failure is non-critical
    }
  }, [bloggerId]);

  useEffect(() => {
    void fetchBloggerProfile();
  }, [fetchBloggerProfile]);

  useEffect(() => {
    if (activeTab === "posts") {
      void fetchPosts(1, false);
    } else if (activeTab === "schemes") {
      void fetchProducts();
    }
  }, [activeTab, fetchPosts, fetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (activeTab === "posts" && hasMore && !loadingMore) {
      void fetchPosts(page + 1, true);
    }
  }, [activeTab, hasMore, loadingMore, page, fetchPosts]);

  const renderPostCard = useCallback(
    ({
      item,
    }: {
      item: { id: string; title: string; image: string; likesCount: number; imageHeight: number };
    }) => (
      <TouchableOpacity style={styles.postCard} activeOpacity={0.8}>
        <View style={[styles.postImageContainer, { height: item.imageHeight }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
          ) : (
            <View style={styles.postImagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={theme.colors.textTertiary} />
            </View>
          )}
        </View>
        <Text style={styles.postTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.postFooter}>
          <Ionicons name="heart-outline" size={12} color={theme.colors.textTertiary} />
          <Text style={styles.postLikes}>{item.likesCount}</Text>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  const renderProductCard = useCallback(
    ({ item }: { item: BloggerProduct }) => (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate("BloggerProduct", { productId: item.id })}
        activeOpacity={0.8}
      >
        {item.images[0] ? (
          <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="bag-outline" size={24} color={theme.colors.textTertiary} />
          </View>
        )}
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productPrice}>¥{item.price.toFixed(2)}</Text>
      </TouchableOpacity>
    ),
    [navigation]
  );

  if (loading || !blogger) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{blogger.nickname}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Profile section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            {blogger.avatar ? (
              <Image source={{ uri: blogger.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{blogger.nickname.charAt(0)}</Text>
              </View>
            )}
            {blogger.bloggerLevel && <BloggerBadge level={blogger.bloggerLevel} />}
          </View>
          <Text style={styles.nickname}>{blogger.nickname}</Text>
          {blogger.bio ? <Text style={styles.bio}>{blogger.bio}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{blogger.followersCount}</Text>
              <Text style={styles.statLabel}>粉丝</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{blogger.postsCount}</Text>
              <Text style={styles.statLabel}>帖子</Text>
            </View>
          </View>
          <FollowButton userId={blogger.id} initialFollowing={blogger.isFollowing} />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TAB_KEYS.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                {TAB_LABELS[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === "posts" && (
          <View style={styles.postsGrid}>
            {posts.map((item) => (
              <View key={item.id} style={styles.postGridItem}>
                {renderPostCard({ item })}
              </View>
            ))}
          </View>
        )}

        {activeTab === "schemes" && (
          <View style={styles.productsGrid}>
            {products.map((item) => (
              <View key={item.id} style={styles.productGridItem}>
                {renderProductCard({ item })}
              </View>
            ))}
            {products.length === 0 && <Text style={styles.emptyText}>暂无方案</Text>}
          </View>
        )}

        {activeTab === "about" && (
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>关于</Text>
            <Text style={styles.aboutText}>{blogger.bio || "这个人很懒，什么都没写..."}</Text>
            {blogger.bloggerLevel && (
              <View style={styles.levelInfo}>
                <View style={styles.levelBadge}>
                  {blogger.bloggerLevel === "big_v" ? (
                    <Ionicons name="shield-checkmark" size={16} color="DesignTokens.colors.semantic.warning" /> // custom color
                  ) : (
                    <Ionicons name="checkmark-circle" size={16} color={DesignTokens.colors.brand.slate} />
                  )}
                  <Text style={styles.levelText}>
                    {blogger.bloggerLevel === "big_v" ? "大V认证" : "博主认证"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {loadingMore && (
          <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: theme.colors.text },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerSpacer: { width: 40 },
  profileSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
  },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: DesignTokens.typography.sizes['3xl'], fontWeight: "600", color: DesignTokens.colors.neutral.white },
  bloggerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.brand.slate,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DesignTokens.colors.neutral.white,
  },
  bigVBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "DesignTokens.colors.semantic.warning", // custom color
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DesignTokens.colors.neutral.white,
  },
  nickname: { fontSize: DesignTokens.typography.sizes.xl, fontWeight: "700", color: theme.colors.text },
  bio: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 24,
  },
  stat: { alignItems: "center" },
  statNumber: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: theme.colors.border },
  tabRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: DesignTokens.colors.brand.slate,
  },
  tabText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: DesignTokens.colors.brand.slate, fontWeight: "700" },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 6,
  },
  postGridItem: {
    width: (SCREEN_WIDTH - 24) / 2,
    padding: 6,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  postImageContainer: {
    width: "100%",
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  },
  postImage: { width: "100%", height: "100%" },
  postImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  postTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    padding: 8,
    lineHeight: 16,
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  postLikes: { fontSize: DesignTokens.typography.sizes.xs, color: theme.colors.textTertiary },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 6,
  },
  productGridItem: {
    width: (SCREEN_WIDTH - 24) / 2,
    padding: 6,
  },
  productCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 160,
    backgroundColor: theme.colors.background,
  },
  productImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  productTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    padding: 8,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700",
    color: DesignTokens.colors.brand.slate,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  aboutSection: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginTop: 8,
  },
  aboutTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 8 },
  aboutText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.textSecondary, lineHeight: 22 },
  levelInfo: { marginTop: 16 },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "DesignTokens.colors.semantic.infoLight", // custom color
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  levelText: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.brand.slate, fontWeight: "500" },
  emptyText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textTertiary,
    textAlign: "center",
    paddingVertical: 40,
    width: "100%",
  },
  loader: { paddingVertical: 16 },
});

export default BloggerProfileScreen;

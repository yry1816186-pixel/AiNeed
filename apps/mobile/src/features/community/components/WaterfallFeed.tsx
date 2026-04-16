import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 8;
const CARD_PADDING = 12;
const COLUMN_COUNT = 2;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / COLUMN_COUNT;

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  category: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface WaterfallFeedProps {
  posts: CommunityPost[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPostPress?: (post: CommunityPost) => void;
  onAuthorPress?: (authorId: string) => void;
  onLikePress?: (postId: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const PostCard: React.FC<{
  post: CommunityPost;
  index: number;
  onPostPress: (post: CommunityPost) => void;
  onAuthorPress: (authorId: string) => void;
  onLikePress: (postId: string) => void;
}> = ({ post, index, onPostPress, onAuthorPress, onLikePress }) => {
  const imageHeight = useMemo(() => {
    const heights = [180, 220, 200, 240, 190, 210];
    return heights[index % heights.length];
  }, [index]);

  const _formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return "刚刚";
    }
    if (minutes < 60) {
      return `${minutes}分钟前`;
    }
    if (hours < 24) {
      return `${hours}小时前`;
    }
    if (days < 7) {
      return `${days}天前`;
    }
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }, []);

  const formatCount = useCallback((count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }, []);

  return (
    <Pressable
      style={[styles.card, { marginBottom: index % 2 === 0 ? CARD_GAP : 0 }]}
      onPress={() => onPostPress(post)}
      accessibilityLabel={`帖子：${post.title}`}
      accessibilityRole="button"
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {post.images[0] ? (
          <Image source={{ uri: post.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholderImage, { height: imageHeight }]}>
            <Text style={styles.placeholderText}>暂无图片</Text>
          </View>
        )}

        {post.images.length > 1 && (
          <View style={styles.multiImageBadge}>
            <Text style={styles.multiImageText}>{post.images.length}图</Text>
          </View>
        )}

        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.imageGradient} />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {post.title}
        </Text>

        {post.content && (
          <Text style={styles.cardContent} numberOfLines={2}>
            {post.content}
          </Text>
        )}

        <View style={styles.tagsRow}>
          {post.tags.slice(0, 2).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <Pressable style={styles.authorRow} onPress={() => onAuthorPress(post.author.id)} accessibilityLabel={`查看作者${post.author.nickname}`} accessibilityRole="link">
            {post.author.avatar ? (
              <Image source={{ uri: post.author.avatar }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorAvatarText}>
                  {post.author.nickname?.charAt(0) || "U"}
                </Text>
              </View>
            )}
            <Text style={styles.authorName} numberOfLines={1}>
              {post.author.nickname || "匿名用户"}
            </Text>
          </Pressable>

          <Pressable style={styles.likeButton} onPress={() => onLikePress(post.id)} accessibilityLabel="点赞" accessibilityRole="button">
            <Text style={styles.likeIcon}>♡</Text>
            <Text style={styles.likeCount}>
              {formatCount(post.likeCount || post._count?.likes || 0)}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export const WaterfallFeed: React.FC<WaterfallFeedProps> = ({
  posts,
  isLoading = false,
  hasMore = true,
  onLoadMore,
  onPostPress,
  onAuthorPress,
  onLikePress,
  refreshing = false,
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();

  const leftColumn = useMemo(() => posts.filter((_, i) => i % 2 === 0), [posts]);
  const rightColumn = useMemo(() => posts.filter((_, i) => i % 2 === 1), [posts]);

  const renderColumn = useCallback(
    (columnPosts: CommunityPost[], startIndex: number) => (
      <View style={styles.column}>
        {columnPosts.map((post, idx) => (
          <PostCard
            key={post.id}
            post={post}
            index={startIndex + idx * 2}
            onPostPress={onPostPress || (() => {})}
            onAuthorPress={onAuthorPress || (() => {})}
            onLikePress={onLikePress || (() => {})}
          />
        ))}
      </View>
    ),
    [onPostPress, onAuthorPress, onLikePress]
  );

  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoading) {
      return null;
    }
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={DesignTokens.colors.brand.terracotta} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={[leftColumn, rightColumn]}
        keyExtractor={(_, index) => `column-${index}`}
        renderItem={({ item, index }) => renderColumn(item, index)}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnsWrapper}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  listContent: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 12,
    paddingBottom: 100,
  },
  columnsWrapper: {
    justifyContent: "space-between",
  },
  column: {
    width: CARD_WIDTH,
  },
  card: {
    backgroundColor: DesignTokens.colors.neutral.white,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: CARD_GAP,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    backgroundColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: DesignTokens.colors.neutral[400],
    fontSize: DesignTokens.typography.sizes.sm,
  },
  multiImageBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  multiImageText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "500",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  cardContent: {
    padding: 10,
    gap: 6,
  },
  cardTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[800],
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: DesignTokens.colors.brand.terracottaLight + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  authorAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DesignTokens.colors.brand.sage,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  authorAvatarText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
  authorName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
    flex: 1,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeIcon: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.brand.terracotta,
  },
  likeCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[400],
  },
});

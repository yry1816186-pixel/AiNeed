import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { SharedElement } from "react-navigation-shared-element";
import { theme , Spacing } from '../../../design-system/theme'
import { communityApi, PostComment } from '../../../services/api/community.api';
import { DesignTokens } from '../../../theme/tokens/design-tokens';
import { BookmarkSheet } from '../../../components/community/BookmarkSheet';
import type { RootStackParamList } from '../../../types/navigation';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type _PostDetailRoute = RouteProp<RootStackParamList, "Community">;

const SCREEN_WIDTH = Dimensions.get("window").width;

const DEFAULT_COMMENTS: PostComment[] = [];

export const PostDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const postId = (route.params as { postId?: string })?.postId ?? '';

  const [post, setPost] = useState<{
    id: string;
    title: string;
    content: string;
    images: string[];
    tags: string[];
    likesCount: number;
    commentsCount: number;
    isLiked: boolean;
    isBookmarked: boolean;
    author: { id: string; nickname: string; avatar: string | null };
    bloggerLevel?: "blogger" | "big_v" | null;
    createdAt: string;
  } | null>(null);
  const [comments, setComments] = useState<PostComment[]>(DEFAULT_COMMENTS);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showBookmarkSheet, setShowBookmarkSheet] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchPost = useCallback(async () => {
    if (!postId) {
      return;
    }
    try {
      setLoading(true);
      const response = await communityApi.getPostById(postId);
      if (response.success && response.data) {
        setPost({
          id: response.data.id,
          title: response.data.title,
          content: response.data.content,
          images: response.data.images,
          tags: response.data.tags,
          likesCount: response.data.likesCount,
          commentsCount: response.data.commentsCount,
          isLiked: response.data.isLiked,
          isBookmarked: response.data.isBookmarked,
          author: response.data.author,
          createdAt: response.data.createdAt,
        });
      }
    } catch {
      Alert.alert("提示", "加载帖子失败");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    if (!postId) {
      return;
    }
    try {
      const response = await communityApi.getComments(postId, { limit: 50 });
      if (response.success && response.data) {
        setComments(response.data.items);
      }
    } catch {
      // Comments loading failure is non-critical
    }
  }, [postId]);

  useEffect(() => {
    void fetchPost();
    void fetchComments();
  }, [fetchPost, fetchComments]);

  const handleLike = useCallback(async () => {
    if (!postId) {
      return;
    }
    try {
      const response = await communityApi.toggleLike(postId);
      if (response.success && response.data) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                isLiked: response.data!.liked,
                likesCount: prev.likesCount + (response.data!.liked ? 1 : -1),
              }
            : prev
        );
      }
    } catch {
      // Like toggle failure is non-critical
    }
  }, [postId]);

  const handleShare = useCallback(async () => {
    if (!postId) {
      return;
    }
    try {
      await communityApi.sharePost(postId);
      Alert.alert("提示", "分享链接已复制");
    } catch {
      Alert.alert("提示", "分享失败");
    }
  }, [postId]);

  const handleReport = useCallback(() => {
    const reasons = ["垃圾内容", "虚假信息", "不当内容", "侵权", "其他"];
    Alert.alert("举报", "请选择举报原因", [
      { text: "取消", style: "cancel" },
      ...reasons.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await communityApi.reportContent({
              targetType: "post",
              targetId: postId,
              reason,
            });
            Alert.alert("提示", "举报已提交");
          } catch {
            Alert.alert("提示", "举报失败");
          }
        },
      })),
    ]);
  }, [postId]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !postId) {
      return;
    }
    try {
      setSubmittingComment(true);
      const response = await communityApi.addComment(postId, {
        content: commentText.trim(),
      });
      if (response.success) {
        setCommentText("");
        void fetchComments();
      }
    } catch {
      Alert.alert("提示", "评论失败");
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, postId, fetchComments]);

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>帖子不存在</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>返回</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderComment = (comment: PostComment) => {
    const isExpanded = expandedReplies.has(comment.id);
    const hasReplies = comment.repliesCount > 0;

    return (
      <View key={comment.id} style={styles.commentItem}>
        <View style={styles.commentHeader}>
          {comment.author.avatar ? (
            <Image source={{ uri: comment.author.avatar }} style={styles.commentAvatar} />
          ) : (
            <View style={styles.commentAvatarPlaceholder}>
              <Text style={styles.commentAvatarText}>
                {comment.author.nickname?.charAt(0) ?? "U"}
              </Text>
            </View>
          )}
          <View style={styles.commentBody}>
            <Text style={styles.commentAuthor}>{comment.author.nickname}</Text>
            <Text style={styles.commentContent}>{comment.content}</Text>
            <View style={styles.commentMeta}>
              <Text style={styles.commentTime}>
                {new Date(comment.createdAt).toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCommentText(`@${comment.author.nickname} `);
                }}
              >
                <Text style={styles.replyLink}>回复</Text>
              </TouchableOpacity>
            </View>

            {/* Replies section - collapsed by default, show first 2 */}
            {hasReplies && (
              <View style={styles.repliesSection}>
                {isExpanded ? (
                  <Text style={styles.repliesExpanded}>所有回复已展开</Text>
                ) : (
                  <TouchableOpacity onPress={() => toggleReplies(comment.id)}>
                    <Text style={styles.showRepliesText}>查看更多回复({comment.repliesCount})</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>帖子详情</Text>
        <TouchableOpacity onPress={handleReport} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Author section */}
        <View style={styles.authorSection}>
          {post.author.avatar ? (
            <View style={styles.authorAvatarWrapper}>
              <Image source={{ uri: post.author.avatar }} style={styles.authorAvatar} />
              {post.bloggerLevel === "blogger" && (
                <View style={styles.authorBadge}>
                  <Ionicons name="checkmark" size={8} color={colors.surface} />
                </View>
              )}
              {post.bloggerLevel === "big_v" && (
                <View style={styles.authorBigVBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={colors.surface} />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.authorAvatarPlaceholder}>
              <Text style={styles.authorAvatarText}>{post.author.nickname.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{post.author.nickname}</Text>
            <Text style={styles.postTime}>
              {new Date(post.createdAt).toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Title and content */}
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postContent}>{post.content}</Text>

        {/* Image carousel */}
        {post.images.length > 0 && (
          <View style={styles.imageCarousel}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / SCREEN_WIDTH);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {post.images.map((uri, index) =>
                index === 0 ? (
                  <SharedElement key={uri} id={`post.${postId}.image`}>
                    <Image source={{ uri }} style={styles.carouselImage} resizeMode="cover" />
                  </SharedElement>
                ) : (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={styles.carouselImage}
                    resizeMode="cover"
                  />
                )
              )}
            </ScrollView>
            {post.images.length > 1 && (
              <View style={styles.paginationDots}>
                {post.images.map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[styles.dot, index === currentImageIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag, _index) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Purchase button for blogger posts */}
        {post.bloggerLevel && (
          <TouchableOpacity style={styles.purchaseBtn}>
            <Ionicons name="bag-outline" size={18} color={colors.surface} />
            <Text style={styles.purchaseBtnText}>购买此方案</Text>
          </TouchableOpacity>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>评论 ({comments.length})</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>暂无评论，来说点什么吧</Text>
          ) : (
            comments.map(renderComment)
          )}
        </View>

        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="写评论..."
            placeholderTextColor={theme.colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={commentText.trim() ? colors.surface : theme.colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons
              name={post.isLiked ? "heart" : "heart-outline"}
              size={22}
              color={post.isLiked ? "#FF4757" : theme.colors.textSecondary} // custom color
            />
            <Text style={[styles.actionCount, post.isLiked && styles.actionCountLiked]}>
              {post.likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.actionCount}>{post.commentsCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowBookmarkSheet(true)}>
            <Ionicons
              name={post.isBookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={post.isBookmarked ? "#F1C40F" : theme.colors.textSecondary} // custom color
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <BookmarkSheet
        visible={showBookmarkSheet}
        postId={post.id}
        onClose={() => setShowBookmarkSheet(false)}
        onBookmarked={() => {
          setPost((prev) => (prev ? { ...prev, isBookmarked: true } : prev));
        }}
      />
    </SafeAreaView>
  );
};

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: DesignTokens.typography.sizes.md, color: theme.colors.textSecondary },
  goBackText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.primary, marginTop: DesignTokens.spacing[3]},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: theme.colors.text },
  backBtn: { width: DesignTokens.spacing[10], height: DesignTokens.spacing[10], justifyContent: "center" },
  moreBtn: { width: DesignTokens.spacing[10], height: DesignTokens.spacing[10], alignItems: "flex-end", justifyContent: "center" },
  content: { flex: 1 },
  authorSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: theme.colors.surface,
  },
  authorAvatarWrapper: { position: "relative" },
  authorAvatar: { width: DesignTokens.spacing[11], height: DesignTokens.spacing[11], borderRadius: 22 },
  authorAvatarPlaceholder: {
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[11],
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  authorAvatarText: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.surface },
  authorBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: Spacing.md,
    height: Spacing.md,
    borderRadius: 8,
    backgroundColor: colors.neutral[500],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  authorBigVBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: DesignTokens.spacing[5],
    height: DesignTokens.spacing[5],
    borderRadius: 10,
    backgroundColor: "#F1C40F", // custom color
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  authorInfo: { marginLeft: DesignTokens.spacing[3], flex: 1 },
  authorName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: theme.colors.text },
  postTime: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  postTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingTop: DesignTokens.spacing[3],
    backgroundColor: theme.colors.surface,
  },
  postContent: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: theme.colors.surface,
  },
  imageCarousel: {
    backgroundColor: colors.neutral[900],
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing['2.5'],
    gap: DesignTokens.spacing['1.5'],
  },
  dot: {
    width: DesignTokens.spacing['1.5'],
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: colors.surface,
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: 4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: theme.colors.surface,
    marginTop: Spacing.sm,
  },
  tagChip: {
    backgroundColor: "#F0EDFF", // custom color
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  tagText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.neutral[500], fontWeight: "500" },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: colors.neutral[500],
    marginHorizontal: Spacing.md,
    marginVertical: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 12,
  },
  purchaseBtnText: { color: colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  commentsSection: {
    backgroundColor: theme.colors.surface,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
  },
  commentsTitle: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: DesignTokens.spacing[3]},
  noComments: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  commentItem: {
    paddingVertical: DesignTokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  commentHeader: { flexDirection: "row", gap: DesignTokens.spacing['2.5']},
  commentAvatar: { width: Spacing.xl, height: Spacing.xl, borderRadius: 16 },
  commentAvatarPlaceholder: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "600", color: theme.colors.textSecondary },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "600", color: theme.colors.text },
  commentContent: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.textPrimary, lineHeight: 20, marginTop: Spacing.xs},
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing[3],
    marginTop: DesignTokens.spacing['1.5'],
  },
  commentTime: { fontSize: DesignTokens.typography.sizes.xs, color: theme.colors.textTertiary },
  replyLink: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.primary, fontWeight: "500" },
  repliesSection: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
  },
  showRepliesText: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.primary, fontWeight: "500" },
  repliesExpanded: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textTertiary },
  bottomBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    height: DesignTokens.spacing[9],
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    paddingHorizontal: DesignTokens.spacing['3.5'],
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  sendBtn: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: theme.colors.background },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  actionCount: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary },
  actionCountLiked: { color: "#FF4757" }, // custom color
}))

export default PostDetailScreen;

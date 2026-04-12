import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Avatar } from '../../src/components/ui/Avatar';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import { Badge } from '../../src/components/ui/Badge';
import { CommentItem } from '../../src/components/community/CommentItem';
import {
  usePostDetail,
  useTogglePostLike,
  useCreateComment,
  useDeleteComment,
  useToggleCommentLike,
} from '../../src/hooks/useCommunity';
import { useAuthStore } from '../../src/stores/auth.store';
import type { PostComment } from '../../src/services/community.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toggleLike = useTogglePostLike();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const toggleCommentLike = useToggleCommentLike();

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const { data: post, isLoading, isError, refetch } = usePostDetail(postId);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (SCREEN_WIDTH - spacing.lg * 2));
    setCurrentImageIndex(index);
  };

  const handleLike = () => {
    if (postId) toggleLike.mutate(postId);
  };

  const handleReply = (comment: PostComment) => {
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() || !postId) return;

    createComment.mutate(
      {
        postId,
        payload: {
          content: commentText.trim(),
          parent_id: replyTo?.id,
        },
      },
      {
        onSuccess: () => {
          setCommentText('');
          setReplyTo(null);
        },
      },
    );
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment.mutate(commentId);
  };

  const handleCommentLike = (commentId: string) => {
    toggleCommentLike.mutate(commentId);
  };

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载帖子..." />;
  }

  if (isError || !post) {
    return (
      <Empty
        title="帖子不存在"
        description="该帖子可能已被删除"
        actionLabel="返回社区"
        onAction={() => router.back()}
      />
    );
  }

  const isOwner = user?.id === post.userId;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {post.imageUrls.length > 0 && (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {post.imageUrls.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={styles.postImage}
                  resizeMode="cover"
                  accessibilityRole="image"
                />
              ))}
            </ScrollView>
            {post.imageUrls.length > 1 && (
              <View style={styles.pagination}>
                {post.imageUrls.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentImageIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.postInfo}>
          <View style={styles.authorRow}>
            <Avatar
              size="md"
              source={post.user?.avatarUrl ? { uri: post.user.avatarUrl } : undefined}
              placeholder={post.user?.nickname ?? ''}
            />
            <View style={styles.authorInfo}>
              <Text variant="body" weight="600">
                {post.user?.nickname ?? '匿名用户'}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </View>
            {isOwner && (
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text variant="caption" color={colors.textTertiary}>删除</Text>
              </TouchableOpacity>
            )}
          </View>

          {post.title && (
            <Text variant="h3" style={styles.title}>{post.title}</Text>
          )}

          <Text variant="body" style={styles.content}>{post.content}</Text>

          {post.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {post.tags.map((tag) => (
                <Badge key={tag} label={`#${tag}`} variant="default" size="small" />
              ))}
            </View>
          )}

          <View style={styles.statsRow}>
            <TouchableOpacity
              onPress={handleLike}
              activeOpacity={0.7}
              style={styles.statItem}
            >
              <Text variant="body2" color={post.isLiked ? colors.accent : colors.textSecondary}>
                {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
              </Text>
            </TouchableOpacity>
            <Text variant="body2" color={colors.textSecondary}>
              💬 {post.commentsCount}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.commentsSection}>
          <Text variant="h3" style={styles.commentsTitle}>评论</Text>
          {post.comments.length === 0 ? (
            <Text variant="body2" color={colors.textTertiary} style={styles.noComments}>
              暂无评论，来说两句吧
            </Text>
          ) : (
            post.comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onLike={handleCommentLike}
                onReply={handleReply}
                onDelete={handleDeleteComment}
                currentUserId={user?.id}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.inputBar, shadows.sm]}>
        {replyTo && (
          <View style={styles.replyHint}>
            <Text variant="caption" color={colors.textTertiary}>
              回复 @{replyTo.user?.nickname ?? '匿名'}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text variant="caption" color={colors.accent}>取消</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={replyTo ? `回复 @${replyTo.user?.nickname ?? '匿名'}` : '写评论...'}
            placeholderTextColor={colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || createComment.isPending}
            style={[
              styles.sendButton,
              (!commentText.trim() || createComment.isPending) && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.7}
          >
            <Text variant="buttonSmall" color={colors.white}>发送</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;

  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageSection: {
    position: 'relative',
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: colors.gray100,
  },
  pagination: {
    position: 'absolute',
    bottom: spacing.md,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    opacity: 0.5,
  },
  dotActive: {
    opacity: 1,
    width: 18,
  },
  postInfo: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  authorInfo: {
    flex: 1,
    gap: 2,
  },
  title: {
    lineHeight: typography.h3.lineHeight,
  },
  content: {
    lineHeight: typography.body.lineHeight,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingTop: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: spacing.xs,
    backgroundColor: colors.gray50,
  },
  commentsSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  commentsTitle: {
    lineHeight: typography.h3.lineHeight,
  },
  noComments: {
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  replyHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: typography.body.lineHeight,
  },
  sendButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

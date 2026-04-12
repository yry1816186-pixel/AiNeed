import React from 'react';
import {
  View,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';
import type { PostComment } from '../../services/community.service';

interface CommentItemProps {
  comment: PostComment;
  onLike: (commentId: string) => void;
  onReply: (comment: PostComment) => void;
  onDelete?: (commentId: string) => void;
  currentUserId?: string;
  style?: StyleProp<ViewStyle>;
}

const SmallHeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: 8, height: 7,
      backgroundColor: filled ? colors.accent : 'transparent',
      borderWidth: filled ? 0 : 1,
      borderColor: filled ? colors.accent : colors.textTertiary,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      position: 'absolute',
      bottom: 5,
    }} />
    <View style={{
      width: 8, height: 7,
      backgroundColor: filled ? colors.accent : 'transparent',
      borderWidth: filled ? 0 : 1,
      borderColor: filled ? colors.accent : colors.textTertiary,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      position: 'absolute',
      bottom: 5,
      transform: [{ rotate: '-45deg' }, { translateX: -3 }],
    }} />
    <View style={{
      width: 8, height: 7,
      backgroundColor: filled ? colors.accent : 'transparent',
      borderWidth: filled ? 0 : 1,
      borderColor: filled ? colors.accent : colors.textTertiary,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      position: 'absolute',
      bottom: 5,
      transform: [{ rotate: '45deg' }, { translateX: 3 }],
    }} />
  </View>
);

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  onDelete,
  currentUserId,
  style,
}) => {
  const isOwner = currentUserId === comment.userId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mainRow}>
        <Avatar
          size="sm"
          source={comment.user?.avatarUrl ? { uri: comment.user.avatarUrl } : undefined}
          placeholder={comment.user?.nickname ?? ''}
        />
        <View style={styles.commentBody}>
          <View style={styles.headerRow}>
            <Text variant="caption" weight="600" style={styles.nickname}>
              {comment.user?.nickname ?? '匿名用户'}
            </Text>
          </View>
          <Text variant="body2" style={styles.content}>
            {comment.content}
          </Text>
          <View style={styles.actionsRow}>
            <Text variant="caption" color={colors.textTertiary}>
              {formatTimeAgo(comment.createdAt)}
            </Text>
            <TouchableOpacity
              onPress={() => onReply(comment)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Text variant="caption" color={colors.textSecondary}>回复</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onLike(comment.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
              style={styles.likeButton}
            >
              <SmallHeartIcon filled={comment.isLiked} />
              {comment.likesCount > 0 && (
                <Text variant="caption" color={comment.isLiked ? colors.accent : colors.textTertiary}>
                  {comment.likesCount}
                </Text>
              )}
            </TouchableOpacity>
            {isOwner && onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(comment.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Text variant="caption" color={colors.textTertiary}>删除</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {hasReplies && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onLike={onLike}
              onReply={onReply}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </View>
      )}
    </View>
  );
};

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

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;

  return `${Math.floor(months / 12)}年前`;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentBody: {
    flex: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nickname: {
    color: colors.textSecondary,
  },
  content: {
    lineHeight: typography.body2.lineHeight,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  repliesContainer: {
    marginLeft: spacing.xl + spacing.sm,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.gray200,
    paddingLeft: spacing.md,
    gap: spacing.md,
  },
});

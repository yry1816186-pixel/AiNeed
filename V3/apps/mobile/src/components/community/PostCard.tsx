import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, shadows, typography } from '../../theme';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';
import type { CommunityPost } from '../../services/community.service';

interface PostCardProps {
  post: CommunityPost;
  onPress: () => void;
  onLike: () => void;
  style?: StyleProp<ViewStyle>;
}

const HeartIcon: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 16 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.6,
      height: size * 0.55,
      backgroundColor: filled ? colors.accent : 'transparent',
      borderWidth: filled ? 0 : 1.5,
      borderColor: filled ? colors.accent : colors.textTertiary,
      borderTopLeftRadius: size * 0.6,
      borderTopRightRadius: size * 0.6,
      position: 'absolute',
      bottom: size * 0.35,
    }} />
    <View style={{
      width: size * 0.6,
      height: size * 0.55,
      backgroundColor: filled ? colors.accent : 'transparent',
      borderWidth: filled ? 0 : 1.5,
      borderColor: filled ? colors.accent : colors.textTertiary,
      borderTopLeftRadius: size * 0.6,
      borderTopRightRadius: size * 0.6,
      position: 'absolute',
      bottom: size * 0.35,
      transform: [{ rotate: '-45deg' }, { translateX: -size * 0.22 }],
    }} />
    <View style={{
      width: size * 0.6,
      height: size * 0.55,
      backgroundColor: filled ? colors.accent : 'transparent',
      borderWidth: filled ? 0 : 1.5,
      borderColor: filled ? colors.accent : colors.textTertiary,
      borderTopLeftRadius: size * 0.6,
      borderTopRightRadius: size * 0.6,
      position: 'absolute',
      bottom: size * 0.35,
      transform: [{ rotate: '45deg' }, { translateX: size * 0.22 }],
    }} />
  </View>
);

export const PostCard: React.FC<PostCardProps> = ({ post, onPress, onLike, style }) => {
  const coverImage = post.imageUrls.length > 0 ? post.imageUrls[0] : null;
  const aspectRatio = coverImage ? 1 : 0.6;

  return (
    <TouchableOpacity
      style={[styles.container, shadows.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={post.title ?? '帖子'}
    >
      {coverImage && (
        <Image
          source={{ uri: coverImage }}
          style={[styles.coverImage, { aspectRatio }]}
          resizeMode="cover"
          accessibilityRole="image"
        />
      )}
      <View style={styles.content}>
        {post.title && (
          <Text variant="body2" weight="600" numberOfLines={2} style={styles.title}>
            {post.title}
          </Text>
        )}
        {!post.title && (
          <Text variant="body2" weight="400" numberOfLines={2} style={styles.title}>
            {post.content}
          </Text>
        )}
        {post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text variant="caption" color={colors.accent}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.footer}>
          <View style={styles.authorRow}>
            <Avatar
              size="xs"
              source={post.user?.avatarUrl ? { uri: post.user.avatarUrl } : undefined}
              placeholder={post.user?.nickname ?? ''}
            />
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={styles.authorName}>
              {post.user?.nickname ?? '匿名用户'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onLike}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={post.isLiked ? '取消点赞' : '点赞'}
          >
            <View style={styles.likeRow}>
              <HeartIcon filled={post.isLiked} />
              <Text variant="caption" color={post.isLiked ? colors.accent : colors.textTertiary}>
                {post.likesCount > 0 ? post.likesCount : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    backgroundColor: colors.gray100,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    lineHeight: typography.body2.lineHeight,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    backgroundColor: colors.gray50,
    borderRadius: radius.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  authorName: {
    maxWidth: 80,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});

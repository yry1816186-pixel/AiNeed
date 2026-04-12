import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, radius, shadows } from '../../../src/theme';
import { Text } from '../../../src/components/ui/Text';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Loading } from '../../../src/components/ui/Loading';
import { Empty } from '../../../src/components/ui/Empty';
import { socialService } from '../../../src/services/social.service';
import { useAuth } from '../../../src/hooks/useAuth';
import type { CommunityPost, FollowCounts } from '../../../src/types';

type ProfileTab = 'posts' | 'outfits' | 'favorites';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: '帖子' },
  { key: 'outfits', label: '搭配' },
  { key: 'favorites', label: '收藏' },
];

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  const isSelf = currentUser?.id === userId;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => socialService.getUserProfile(userId),
    enabled: !!userId,
  });

  const { data: followStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['followStatus', userId],
    queryFn: () => socialService.getFollowStatus(userId),
    enabled: !!userId && !isSelf,
  });

  const { data: followCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['followCounts', userId],
    queryFn: () => socialService.getFollowCounts(userId),
    enabled: !!userId,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['userPosts', userId],
    queryFn: () => socialService.getUserPosts(userId),
    enabled: !!userId && activeTab === 'posts',
  });

  const toggleMutation = useMutation({
    mutationFn: () => socialService.toggleFollow(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] });
      queryClient.invalidateQueries({ queryKey: ['followCounts', userId] });
    },
  });

  const handleToggleFollow = useCallback(() => {
    toggleMutation.mutate();
  }, [toggleMutation]);

  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/community/${postId}` as `${string}`);
    },
    [router],
  );

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
    queryClient.invalidateQueries({ queryKey: ['followStatus', userId] });
    queryClient.invalidateQueries({ queryKey: ['followCounts', userId] });
    queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
  }, [queryClient, userId]);

  if (profileLoading) {
    return <Loading variant="fullscreen" message="加载中..." />;
  }

  const isFollowing = followStatus?.isFollowing ?? false;
  const counts: FollowCounts = followCounts ?? {
    followersCount: 0,
    followingCount: 0,
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Text variant="h3" color={colors.textPrimary}>
            ←
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <Avatar
          size="xl"
          source={
            profile?.avatarUrl
              ? { uri: profile.avatarUrl }
              : undefined
          }
          placeholder={profile?.nickname ?? '用户'}
        />

        <Text variant="h2" style={styles.nickname}>
          {profile?.nickname ?? '未知用户'}
        </Text>

        {profile?.gender ? (
          <Text variant="caption" color={colors.textTertiary}>
            {profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : ''}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            accessibilityRole="button"
            accessibilityLabel={`${counts.followersCount} 粉丝`}
          >
            <Text variant="h3" weight="700">
              {counts.followersCount}
            </Text>
            <Text variant="caption" color={colors.textTertiary}>
              粉丝
            </Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            accessibilityRole="button"
            accessibilityLabel={`${counts.followingCount} 关注`}
          >
            <Text variant="h3" weight="700">
              {counts.followingCount}
            </Text>
            <Text variant="caption" color={colors.textTertiary}>
              关注
            </Text>
          </TouchableOpacity>
        </View>

        {!isSelf && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing ? styles.followingButton : styles.notFollowingButton,
            ]}
            onPress={handleToggleFollow}
            disabled={toggleMutation.isPending || statusLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? '取消关注' : '关注'}
          >
            <Text
              variant="buttonSmall"
              color={isFollowing ? colors.textSecondary : colors.white}
            >
              {isFollowing ? '已关注' : '关注'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive,
            ]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            <Text
              variant="body2"
              weight={activeTab === tab.key ? '600' : '400'}
              color={
                activeTab === tab.key ? colors.textPrimary : colors.textTertiary
              }
            >
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'posts' && (
          <PostsList
            posts={postsData?.items ?? []}
            isLoading={postsLoading}
            onPostPress={handlePostPress}
          />
        )}
        {activeTab === 'outfits' && (
          <Empty title="暂无搭配" description="该用户还没有公开的搭配" />
        )}
        {activeTab === 'favorites' && (
          <Empty title="暂无收藏" description="该用户还没有公开的收藏" />
        )}
      </View>
    </ScrollView>
  );
}

interface PostsListProps {
  posts: CommunityPost[];
  isLoading: boolean;
  onPostPress: (postId: string) => void;
}

function PostsList({ posts, isLoading, onPostPress }: PostsListProps) {
  if (isLoading) {
    return <Loading variant="inline" message="加载帖子中..." />;
  }

  if (posts.length === 0) {
    return <Empty title="暂无帖子" description="该用户还没有发布帖子" />;
  }

  const renderPostItem = ({ item }: { item: CommunityPost }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => onPostPress(item.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.title ?? '帖子'}
    >
      {item.imageUrls.length > 0 && (
        <Image
          source={{ uri: item.imageUrls[0] }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.postContent}>
        {item.title ? (
          <Text variant="body2" weight="600" numberOfLines={1}>
            {item.title}
          </Text>
        ) : null}
        <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.postStats}>
          <Text variant="caption" color={colors.textTertiary}>
            ❤ {item.likesCount}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            💬 {item.commentsCount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderPostItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      contentContainerStyle={styles.postsList}
      ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  nickname: {
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  followButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    minWidth: 120,
    alignItems: 'center',
  },
  notFollowingButton: {
    backgroundColor: colors.accent,
    ...shadows.sm,
  },
  followingButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: spacing.lg,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tabItemActive: {},
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  tabContent: {
    minHeight: 300,
  },
  postsList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  postCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  postImage: {
    width: 100,
    height: 100,
  },
  postContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  postStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  postSeparator: {
    height: spacing.md,
  },
});

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  type ListRenderItemInfo,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import { PostCard } from '../../src/components/community/PostCard';
import {
  usePostList,
  useTogglePostLike,
  SORT_LABELS,
  type PostSortOption,
} from '../../src/hooks/useCommunity';
import type { CommunityPost } from '../../src/services/community.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - COLUMN_GAP) / 2;

type SortTab = PostSortOption;

export default function CommunityFeedScreen() {
  const router = useRouter();
  const [activeSort, setActiveSort] = useState<SortTab>('newest');
  const toggleLike = useTogglePostLike();

  const { data, isLoading, isError, refetch, isFetching } =
    usePostList({ sort: activeSort, limit: 20 });

  const posts = data?.items ?? [];
  const sortTabs: SortTab[] = ['newest', 'popular', 'featured'];

  const leftColumn = useRef<CommunityPost[]>([]);
  const rightColumn = useRef<CommunityPost[]>([]);

  const splitColumns = useCallback((items: CommunityPost[]) => {
    const left: CommunityPost[] = [];
    const right: CommunityPost[] = [];
    items.forEach((post, i) => {
      if (i % 2 === 0) left.push(post);
      else right.push(post);
    });
    leftColumn.current = left;
    rightColumn.current = right;
    return { left, right };
  }, []);

  const columns = splitColumns(posts);

  const handlePostPress = (postId: string) => {
    router.push(`/community/${postId}`);
  };

  const handleLike = (postId: string) => {
    toggleLike.mutate(postId);
  };

  const handleCreate = () => {
    router.push('/community/create');
  };

  const renderSortTabs = () => (
    <View style={styles.sortContainer}>
      {sortTabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => setActiveSort(tab)}
          style={[
            styles.sortTab,
            activeSort === tab && styles.sortTabActive,
          ]}
          activeOpacity={0.7}
        >
          <Text
            variant="body2"
            weight={activeSort === tab ? '600' : '400'}
            color={activeSort === tab ? colors.accent : colors.textSecondary}
          >
            {SORT_LABELS[tab]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderColumn = (items: CommunityPost[]) => (
    <View style={styles.column}>
      {items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onPress={() => handlePostPress(post.id)}
          onLike={() => handleLike(post.id)}
        />
      ))}
    </View>
  );

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载社区内容..." />;
  }

  if (isError) {
    return (
      <Empty
        title="加载失败"
        description="请检查网络后重试"
        actionLabel="重试"
        onAction={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {renderSortTabs()}
      <FlatList
        data={[columns]}
        keyExtractor={() => 'columns'}
        renderItem={() => (
          <View style={styles.masonryContainer}>
            {renderColumn(columns.left)}
            {renderColumn(columns.right)}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        onEndReached={() => {
          // Pagination not yet implemented with useInfiniteQuery
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <Empty
            title="暂无帖子"
            description="成为第一个分享穿搭的人吧"
            actionLabel="发帖"
            onAction={handleCreate}
          />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
      <TouchableOpacity
        style={[styles.fab, shadows.fab]}
        onPress={handleCreate}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="发帖"
      >
        <Text variant="h2" color={colors.white}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  sortTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.gray50,
  },
  sortTabActive: {
    backgroundColor: colors.accent + '15',
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: COLUMN_GAP,
    paddingTop: spacing.md,
  },
  column: {
    flex: 1,
    gap: spacing.md,
  },
  listContainer: {
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

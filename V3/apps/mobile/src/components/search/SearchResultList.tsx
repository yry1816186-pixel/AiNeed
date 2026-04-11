import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import { Loading } from '../ui/Loading';
import { Empty } from '../ui/Empty';
import { Avatar } from '../ui/Avatar';
import type {
  SearchResult,
  ClothingItem,
  PostItem,
  UserItem,
  SearchTab,
} from '../../services/search.service';

interface SearchResultListProps {
  result: SearchResult | undefined;
  activeTab: SearchTab;
  isLoading: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  onClothingPress: (id: string) => void;
  onPostPress: (id: string) => void;
  onUserPress: (id: string) => void;
  onFollowPress: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

const ClothingCard: React.FC<{ item: ClothingItem; onPress: (id: string) => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={clothingStyles.card} onPress={() => onPress(item.id)} activeOpacity={0.7} accessibilityRole="button">
    <View style={clothingStyles.imageContainer}>
      <Image source={{ uri: item.imageUrl }} style={clothingStyles.image} resizeMode="cover" />
    </View>
    <View style={clothingStyles.info}>
      <Text variant="bodySmall" numberOfLines={2} style={clothingStyles.name}>{item.name}</Text>
      <View style={clothingStyles.priceRow}>
        <Text variant="body2" weight="700" color={colors.accent} style={clothingStyles.price}>
          ¥{item.price}
        </Text>
        {item.originalPrice && item.originalPrice > item.price && (
          <Text variant="caption" color={colors.textDisabled} style={clothingStyles.originalPrice}>
            ¥{item.originalPrice}
          </Text>
        )}
      </View>
      <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>{item.brand}</Text>
    </View>
  </TouchableOpacity>
);

const PostCard: React.FC<{ item: PostItem; onPress: (id: string) => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={postStyles.card} onPress={() => onPress(item.id)} activeOpacity={0.7} accessibilityRole="button">
    <Image source={{ uri: item.coverUrl }} style={[postStyles.image, { height: item.height }]} resizeMode="cover" />
    <View style={postStyles.info}>
      <Text variant="bodySmall" numberOfLines={2} style={postStyles.title}>{item.title}</Text>
      <View style={postStyles.authorRow}>
        <Avatar size="xs" source={{ uri: item.authorAvatar }} />
        <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={postStyles.authorName}>
          {item.authorName}
        </Text>
        <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <Path d="M6 2V10M2 6H10" stroke={colors.textDisabled} strokeWidth="1" strokeLinecap="round" />
        </Svg>
        <Text variant="caption" color={colors.textDisabled}>{item.likeCount}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const UserRow: React.FC<{
  item: UserItem;
  onUserPress: (id: string) => void;
  onFollowPress: (id: string) => void;
}> = ({ item, onUserPress, onFollowPress }) => (
  <TouchableOpacity style={userStyles.row} onPress={() => onUserPress(item.id)} activeOpacity={0.7} accessibilityRole="button">
    <Avatar size="lg" source={{ uri: item.avatarUrl }} />
    <View style={userStyles.info}>
      <Text variant="body" weight="500" numberOfLines={1}>{item.nickname}</Text>
      <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>{item.bio}</Text>
      <Text variant="caption" color={colors.textDisabled}>{item.followerCount} 粉丝</Text>
    </View>
    <TouchableOpacity
      style={[userStyles.followButton, item.isFollowing && userStyles.followingButton]}
      onPress={() => onFollowPress(item.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.isFollowing ? '取消关注' : '关注'}
    >
      <Text
        variant="buttonSmall"
        color={item.isFollowing ? colors.textTertiary : colors.white}
        weight="600"
      >
        {item.isFollowing ? '已关注' : '关注'}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

export const SearchResultList: React.FC<SearchResultListProps> = ({
  result,
  activeTab,
  isLoading,
  isFetching,
  onLoadMore,
  onClothingPress,
  onPostPress,
  onUserPress,
  onFollowPress,
  style,
}) => {
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromEnd < 200 && !isFetching) {
        onLoadMore();
      }
    },
    [isFetching, onLoadMore],
  );

  if (isLoading) {
    return <Loading variant="inline" message="搜索中..." style={style} />;
  }

  if (!result) {
    return null;
  }

  const hasClothing = result.clothing.length > 0;
  const hasPosts = result.posts.length > 0;
  const hasUsers = result.users.length > 0;

  if (activeTab !== 'all' && activeTab === 'clothing' && !hasClothing) {
    return <Empty title="未找到服装" description="换个关键词试试" style={style} />;
  }
  if (activeTab !== 'all' && activeTab === 'post' && !hasPosts) {
    return <Empty title="未找到帖子" description="换个关键词试试" style={style} />;
  }
  if (activeTab !== 'all' && activeTab === 'user' && !hasUsers) {
    return <Empty title="未找到用户" description="换个关键词试试" style={style} />;
  }
  if (!hasClothing && !hasPosts && !hasUsers) {
    return <Empty title="未找到结果" description="换个关键词试试" style={style} />;
  }

  if (activeTab === 'clothing') {
    return (
      <View style={style}>
        <View style={clothingStyles.grid}>
          {result.clothing.map((item) => (
            <ClothingCard key={item.id} item={item} onPress={onClothingPress} />
          ))}
        </View>
        {isFetching && <Loading variant="inline" />}
      </View>
    );
  }

  if (activeTab === 'post') {
    return (
      <View style={style}>
        <View style={postStyles.masonry}>
          <View style={postStyles.masonryColumn}>
            {result.posts.filter((_, i) => i % 2 === 0).map((item) => (
              <PostCard key={item.id} item={item} onPress={onPostPress} />
            ))}
          </View>
          <View style={postStyles.masonryColumn}>
            {result.posts.filter((_, i) => i % 2 === 1).map((item) => (
              <PostCard key={item.id} item={item} onPress={onPostPress} />
            ))}
          </View>
        </View>
        {isFetching && <Loading variant="inline" />}
      </View>
    );
  }

  if (activeTab === 'user') {
    return (
      <View style={style}>
        {result.users.map((item) => (
          <UserRow key={item.id} item={item} onUserPress={onUserPress} onFollowPress={onFollowPress} />
        ))}
        {isFetching && <Loading variant="inline" />}
      </View>
    );
  }

  return (
    <FlatList
      data={[]}
      keyExtractor={() => 'all'}
      renderItem={() => null}
      ListHeaderComponent={
        <View>
          {hasClothing && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="h3" style={styles.sectionTitle}>服装</Text>
                <Badge label={`${result.clothing.length}`} variant="accent" size="small" />
              </View>
              <View style={clothingStyles.grid}>
                {result.clothing.slice(0, 4).map((item) => (
                  <ClothingCard key={item.id} item={item} onPress={onClothingPress} />
                ))}
              </View>
            </View>
          )}
          {hasPosts && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="h3" style={styles.sectionTitle}>帖子</Text>
                <Badge label={`${result.posts.length}`} variant="accent" size="small" />
              </View>
              <View style={postStyles.masonry}>
                <View style={postStyles.masonryColumn}>
                  {result.posts.filter((_, i) => i % 2 === 0).slice(0, 2).map((item) => (
                    <PostCard key={item.id} item={item} onPress={onPostPress} />
                  ))}
                </View>
                <View style={postStyles.masonryColumn}>
                  {result.posts.filter((_, i) => i % 2 === 1).slice(0, 2).map((item) => (
                    <PostCard key={item.id} item={item} onPress={onPostPress} />
                  ))}
                </View>
              </View>
            </View>
          )}
          {hasUsers && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="h3" style={styles.sectionTitle}>用户</Text>
                <Badge label={`${result.users.length}`} variant="accent" size="small" />
              </View>
              {result.users.slice(0, 3).map((item) => (
                <UserRow key={item.id} item={item} onUserPress={onUserPress} onFollowPress={onFollowPress} />
              ))}
            </View>
          )}
        </View>
      }
      onScroll={handleScroll}
      scrollEventThrottle={16}
    />
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
  },
});

const clothingStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  info: {
    padding: spacing.sm,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    minHeight: 36,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
  },
});

const postStyles = StyleSheet.create({
  masonry: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  masonryColumn: {
    flex: 1,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    minHeight: 120,
    backgroundColor: colors.backgroundSecondary,
  },
  info: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    minHeight: 32,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorName: {
    flex: 1,
  },
});

const userStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  followButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

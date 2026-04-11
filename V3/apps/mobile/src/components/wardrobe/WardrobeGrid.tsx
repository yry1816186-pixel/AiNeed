import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { colors, spacing } from '../../theme';
import { Empty } from '../ui/Empty';
import { Loading } from '../ui/Loading';
import { ClothingGridItem } from './ClothingGridItem';
import type { WardrobeItem } from '../../services/wardrobe.service';

interface WardrobeGridProps {
  items: WardrobeItem[];
  isLoading: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  onItemPress: (item: WardrobeItem) => void;
  onItemRemove: (id: string) => void;
}

const ITEM_HEIGHT = 240;
const NUM_COLUMNS = 2;

export const WardrobeGrid: React.FC<WardrobeGridProps> = ({
  items,
  isLoading,
  isRefetching,
  onRefresh,
  onLoadMore,
  hasNextPage,
  onItemPress,
  onItemRemove,
}) => {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<WardrobeItem>) => (
      <View style={styles.itemWrapper}>
        <ClothingGridItem
          item={item}
          onPress={onItemPress}
          onRemove={onItemRemove}
        />
      </View>
    ),
    [onItemPress, onItemRemove],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<WardrobeItem> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * Math.ceil((index + 1) / NUM_COLUMNS),
      index,
    }),
    [],
  );

  const keyExtractor = useCallback(
    (item: WardrobeItem) => item.id,
    [],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage) {
      onLoadMore();
    }
  }, [hasNextPage, onLoadMore]);

  const ListEmptyComponent = useMemo(
    () => (
      <Empty
        title="衣橱空空如也"
        description="去添加第一件吧"
        actionLabel="添加服装"
        onAction={onRefresh}
      />
    ),
    [onRefresh],
  );

  if (isLoading && items.length === 0) {
    return <Loading variant="skeleton" />;
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      getItemLayout={getItemLayout}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.row}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={ListEmptyComponent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  itemWrapper: {
    flex: 1,
  },
});

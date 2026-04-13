import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { Colors, Spacing, Typography } from '../../theme';
import { SkeletonScreen } from './SkeletonScreen';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

export interface WaterfallItem {
  id: string;
  height?: number;
  [key: string]: any;
}

interface WaterfallFlashListProps<T extends WaterfallItem> {
  query: UseInfiniteQueryResult<InfiniteData<T[]>, Error>;
  renderItem: (item: T, index: number, column: 'left' | 'right') => React.ReactElement | null;
  estimatedItemSize: number;
  numColumns?: number;
  gap?: number;
  contentPadding?: number;
  keyExtractor?: (item: T, index: number) => string;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyOnAction?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function WaterfallFlashList<T extends WaterfallItem>({
  query,
  renderItem,
  estimatedItemSize,
  numColumns = 2,
  gap = Spacing[3],
  contentPadding = Spacing[3],
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  emptyTitle = '暂无内容',
  emptyDescription,
  emptyActionLabel,
  emptyOnAction,
  accessibilityLabel,
  style,
}: WaterfallFlashListProps<T>) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = query;

  const items = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flat() as T[];
  }, [data?.pages]);

  const leftItems = useMemo(() => items.filter((_item: T, i: number) => i % 2 === 0), [items]);
  const rightItems = useMemo(() => items.filter((_item: T, i: number) => i % 2 === 1), [items]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderColumn = useCallback(
    (columnItems: T[], column: 'left' | 'right') => (
      <View style={styles.column}>
        {columnItems.map((item, idx) => {
          const globalIndex = column === 'left' ? idx * 2 : idx * 2 + 1;
          return (
            <View key={keyExtractor ? keyExtractor(item, globalIndex) : item.id} style={{ marginBottom: gap }}>
              {renderItem(item, globalIndex, column)}
            </View>
          );
        })}
      </View>
    ),
    [renderItem, keyExtractor, gap]
  );

  if (isLoading) {
    return <SkeletonScreen variant="card" count={6} accessibilityLabel="加载瀑布流" />;
  }

  if (isError) {
    return <ErrorState type="network" onRetry={() => refetch()} description={error?.message} />;
  }

  if (items.length === 0) {
    if (ListEmptyComponent) return <>{ListEmptyComponent}</>;
    return (
      <EmptyState
        icon="images-outline"
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={emptyOnAction}
        accessibilityLabel={accessibilityLabel || '空瀑布流'}
      />
    );
  }

  const columns = [leftItems, rightItems];

  return (
    <FlashList
      data={columns}
      renderItem={({ item, index }) => renderColumn(item, index === 0 ? 'left' : 'right')}
      estimatedItemSize={estimatedItemSize * 10}
      numColumns={1}
      contentContainerStyle={{ padding: contentPadding }}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={isFetchingNextPage ? <LoadingFooter /> : null}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={Colors.primary[500]}
        />
      }
      showsVerticalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel || '瀑布流列表'}
    />
  );
}

function LoadingFooter() {
  return (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" color={Colors.primary[500]} />
      <Text style={styles.loadingText}>加载中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1 },
  loadingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[5], gap: Spacing[2] },
  loadingText: { ...Typography.caption.md, color: Colors.neutral[400] },
});

export default WaterfallFlashList;

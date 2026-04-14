import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  type FlatListProps,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { useLazyLoad } from "../../hooks/useLazyLoad";

/**
 * Generic virtualized list component wrapping FlatList with
 * FlashList-style performance optimizations.
 *
 * Uses optimized FlatList configuration for MVP - FlashList can
 * be added later as a drop-in replacement.
 */

export interface VirtualizedListProps<T> {
  /** Array of data items to render */
  data: T[];
  /** Render function for each item */
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement | null;
  /** Unique key extractor for each item */
  keyExtractor: (item: T, index: number) => string;
  /** Estimated height of each item in pixels (for virtualization) */
  estimatedItemSize?: number;
  /** Number of columns for grid layout */
  numColumns?: 1 | 2;
  /** Called when user scrolls near the end (infinite scroll) */
  onEndReached?: () => void;
  /** Header component rendered above the list */
  ListHeaderComponent?: React.ReactElement | null;
  /** Empty state component */
  ListEmptyComponent?: React.ReactElement | null;
  /** Footer component rendered below the list */
  ListFooterComponent?: React.ReactElement | null;
  /** Pull-to-refresh handler */
  onRefresh?: () => Promise<void>;
  /** Whether currently loading more data */
  loadingMore?: boolean;
}

function VirtualizedListInner<T>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize = 240,
  numColumns = 1,
  onEndReached,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  onRefresh,
  loadingMore = false,
}: VirtualizedListProps<T>) {
  const { onViewableItemsChanged, viewabilityConfig, isVisible } = useLazyLoad({
    preloadThreshold: 5,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Memoized renderItem wrapper that provides visibility info and
  // prevents unnecessary re-renders
  const memoizedRenderItem = useCallback(
    (info: ListRenderItemInfo<T>) => {
      return renderItem(info);
    },
    [renderItem],
  );

  const refreshControl = onRefresh ? (
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  ) : undefined;

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      // Performance optimizations
      windowSize={5}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      removeClippedSubviews={true}
      // Lazy loading integration
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      // Infinite scroll
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      // Pull to refresh
      refreshControl={refreshControl}
      // Estimated item size for better scroll performance
      getItemLayout={
        numColumns === 1
          ? (_, index) => ({
              length: estimatedItemSize,
              offset: estimatedItemSize * index,
              index,
            })
          : undefined
      }
      // Sub-components
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        ListFooterComponent ?? (loadingMore ? <LoadingFooter /> : null)
      }
      // Content container style for grid layout
      contentContainerStyle={
        numColumns > 1 ? styles.gridContent : undefined
      }
      columnWrapperStyle={
        numColumns > 1 ? styles.rowWrapper : undefined
      }
    />
  );
}

/**
 * Loading footer shown during infinite scroll.
 */
const LoadingFooter = memo(function LoadingFooter() {
  return <View style={styles.loadingFooter} />;
});

/**
 * Exported generic component with proper TypeScript typing.
 */
export function VirtualizedList<T>(
  props: VirtualizedListProps<T>,
): React.ReactElement {
  return <VirtualizedListInner {...props} />;
}

const styles = StyleSheet.create({
  gridContent: {
    paddingHorizontal: 8,
  },
  rowWrapper: {
    gap: 12,
    paddingHorizontal: 4,
  },
  loadingFooter: {
    height: 40,
  },
});

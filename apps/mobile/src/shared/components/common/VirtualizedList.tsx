/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unused-vars */
import React, { memo, useCallback } from "react";
import { FlatList, type ListRenderItemInfo, RefreshControl, StyleSheet, View } from "react-native";

import { useLazyLoad } from "../../hooks/useLazyLoad";
import { Spacing } from "../../../design-system/theme";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

export interface VirtualizedListProps<T> {
  data: T[];
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement | null;
  keyExtractor: (item: T, index: number) => string;
  estimatedItemSize?: number;
  numColumns?: 1 | 2;
  onEndReached?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  onRefresh?: () => Promise<void>;
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
  const { onViewableItemsChanged, viewabilityConfig } = useLazyLoad({
    preloadThreshold: 5,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) {
      return;
    }
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const refreshControl = onRefresh ? (
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  ) : undefined;

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      windowSize={5}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={refreshControl}
      getItemLayout={
        numColumns === 1
          ? (_, index) => ({
              length: estimatedItemSize,
              offset: estimatedItemSize * index,
              index,
            })
          : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent ?? (loadingMore ? <LoadingFooter /> : null)}
      contentContainerStyle={numColumns > 1 ? styles.gridContent : undefined}
      columnWrapperStyle={numColumns > 1 ? styles.rowWrapper : undefined}
    />
  );
}

const LoadingFooter = memo(function LoadingFooter() {
  return <View style={styles.loadingFooter} />;
});

export function VirtualizedList<T>(props: VirtualizedListProps<T>): React.ReactElement {
  return <VirtualizedListInner {...props} />;
}

const styles = StyleSheet.create({
  gridContent: {
    paddingHorizontal: Spacing.sm,
  },
  rowWrapper: {
    gap: DesignTokens.spacing[3],
    paddingHorizontal: Spacing.xs,
  },
  loadingFooter: {
    height: DesignTokens.spacing[10],
  },
});

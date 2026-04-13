import React from 'react';
import { FlatList, FlatListProps } from 'react-native';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';

export interface FlashListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
  estimatedItemSize: number;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

// Use the real @shopify/flash-list FlashList instead of degrading to FlatList
export function FlashList<T>({
  data,
  renderItem,
  estimatedItemSize,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  ...props
}: FlashListProps<T>): React.ReactElement {
  return (
    <ShopifyFlashList
      data={data}
      renderItem={renderItem}
      estimatedItemSize={estimatedItemSize}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      {...props}
    />
  );
}

export default FlashList;

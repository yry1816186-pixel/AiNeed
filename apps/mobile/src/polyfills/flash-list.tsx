import React from 'react';
import { FlatList, FlatListProps, View } from 'react-native';

export interface FlashListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
  estimatedItemSize: number;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

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
    <FlatList
      data={data}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      {...props}
    />
  );
}

export default FlashList;

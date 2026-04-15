import React from "react";
import { FlatListProps } from "react-native";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";

export interface FlashListProps<T> extends Omit<FlatListProps<T>, "renderItem"> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
  estimatedItemSize?: number;
  masonry?: boolean;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

export function FlashList<T>({
  data,
  renderItem,
  estimatedItemSize,
  masonry,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  ...props
}: FlashListProps<T>): React.ReactElement {
  return (
    <ShopifyFlashList
      data={data}
      renderItem={renderItem}
      estimatedItemSize={estimatedItemSize ?? 200}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      {...(masonry ? ({ masonry: true } as Record<string, unknown>) : {})}
      {...props}
    />
  );
}

export default FlashList;

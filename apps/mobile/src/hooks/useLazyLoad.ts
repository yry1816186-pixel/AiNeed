import { useCallback, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

interface UseLazyLoadOptions {
  /** How many items ahead of the viewport to preload */
  preloadThreshold?: number;
}

interface UseLazyLoadReturn {
  /** Track visibility via onViewableItemsChanged (for FlatList) */
  onViewableItemsChanged: (info: {
    viewableItems: Array<{ index: number | null; item: unknown }>;
    changed: Array<{ index: number | null; item: unknown; isViewable: boolean }>;
  }) => void;
  /** Current set of visible item indices */
  visibleIndices: Set<number>;
  /** Check if a specific index is considered visible (within threshold) */
  isVisible: (index: number) => boolean;
  /** Stable ref for FlatList viewability config */
  viewabilityConfig: {
    minimumViewTime: number;
    viewAreaCoveragePercentThreshold: number;
  };
}

/**
 * Custom hook for intersection-based lazy loading with FlatList integration.
 *
 * Tracks which items are visible in the viewport and preloads items
 * slightly ahead of the visible area for smoother scrolling.
 *
 * @param options.preloadThreshold - Number of positions before visible to preload (default: 3)
 */
export function useLazyLoad(
  options: UseLazyLoadOptions = {},
): UseLazyLoadReturn {
  const { preloadThreshold = 3 } = options;

  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set());
  const preloadThresholdRef = useRef(preloadThreshold);

  /**
   * Called by FlatList onViewableItemsChanged.
   * Updates the visible indices set including preloaded positions.
   */
  const onViewableItemsChanged = useCallback(
    (info: {
      viewableItems: Array<{ index: number | null; item: unknown }>;
      changed: Array<{ index: number | null; item: unknown; isViewable: boolean }>;
    }) => {
      const newVisible = new Set<number>();

      for (const item of info.viewableItems) {
        if (item.index !== null) {
          // Add the visible index itself
          newVisible.add(item.index);

          // Preload ahead by the threshold amount
          for (let i = 1; i <= preloadThresholdRef.current; i++) {
            newVisible.add(item.index + i);
            if (item.index - i >= 0) {
              newVisible.add(item.index - i);
            }
          }
        }
      }

      setVisibleIndices(newVisible);
    },
    [],
  );

  /**
   * Check if a specific index is within the visible + preload zone.
   */
  const isVisible = useCallback(
    (index: number): boolean => {
      return visibleIndices.has(index);
    },
    [visibleIndices],
  );

  // Stable viewabilityConfig ref for FlatList
  const viewabilityConfig = useRef({
    minimumViewTime: 300,
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  return {
    onViewableItemsChanged,
    visibleIndices,
    isVisible,
    viewabilityConfig,
  };
}

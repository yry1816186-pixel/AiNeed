/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { ShimmerSkeleton } from "../../shared/components/animations/ShimmerSkeleton";
import { DesignTokens } from "../theme/tokens/design-tokens";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdvancedSkeletonProps {
  /** Which layout template to render */
  type: "card" | "list" | "chat" | "grid";
  /** Number of skeleton items (default: 3) */
  count?: number;
  /** Specific to 'grid' type -- number of product cells (default: 4) */
  itemCount?: number;
  /** Enable / disable the shimmer animation (default: true) */
  animate?: boolean;
  /** Container style override */
  style?: ViewStyle;
}

interface CardSkeletonProps {
  animate?: boolean;
  style?: ViewStyle;
}

interface ListSkeletonProps {
  animate?: boolean;
  style?: ViewStyle;
}

interface ChatBubbleSkeletonProps {
  /** Flip to right-aligned "user" variant (default: false) */
  isUser?: boolean;
  animate?: boolean;
  style?: ViewStyle;
}

interface GridSkeletonProps {
  /** Total number of grid items to render (default: 4) */
  itemCount?: number;
  animate?: boolean;
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Design token shortcuts
// ---------------------------------------------------------------------------

const { spacing } = DesignTokens;
const GAP_12 = spacing[3]; // 12
const GAP_8 = spacing[2]; // 8
const GAP_6 = spacing[1.5]; // 6

// ---------------------------------------------------------------------------
// CardSkeleton -- product / outfit card
// ---------------------------------------------------------------------------

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ animate = true, style }) => (
  <View style={[styles.cardContainer, style]}>
    {/* Image placeholder */}
    <ShimmerSkeleton
      width="100%"
      height={200}
      borderRadius={16}
      duration={animate ? undefined : 0}
    />
    {/* Title lines */}
    <View style={styles.cardTextBlock}>
      <ShimmerSkeleton
        width="70%"
        height={14}
        borderRadius={6}
        duration={animate ? undefined : 0}
      />
      <ShimmerSkeleton
        width="45%"
        height={14}
        borderRadius={6}
        duration={animate ? undefined : 0}
      />
    </View>
    {/* Price line */}
    <ShimmerSkeleton
      width="30%"
      height={16}
      borderRadius={6}
      duration={animate ? undefined : 0}
      style={{ marginTop: GAP_8 }}
    />
  </View>
);

// ---------------------------------------------------------------------------
// ListSkeleton -- list item with avatar + text
// ---------------------------------------------------------------------------

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ animate = true, style }) => (
  <View style={[styles.listContainer, style]}>
    {/* Circle avatar */}
    <ShimmerSkeleton width={48} height={48} borderRadius={24} duration={animate ? undefined : 0} />
    {/* Text column */}
    <View style={styles.listTextColumn}>
      <ShimmerSkeleton
        width="60%"
        height={14}
        borderRadius={6}
        duration={animate ? undefined : 0}
      />
      <ShimmerSkeleton
        width="80%"
        height={12}
        borderRadius={6}
        duration={animate ? undefined : 0}
      />
    </View>
  </View>
);

// ---------------------------------------------------------------------------
// ChatBubbleSkeleton -- chat message with avatar + bubble
// ---------------------------------------------------------------------------

export const ChatBubbleSkeleton: React.FC<ChatBubbleSkeletonProps> = ({
  isUser = false,
  animate = true,
  style,
}) => (
  <View style={[styles.chatRow, isUser && styles.chatRowReverse, style]}>
    {/* Small avatar circle */}
    <ShimmerSkeleton width={32} height={32} borderRadius={16} duration={animate ? undefined : 0} />
    {/* Bubble */}
    <ShimmerSkeleton
      width="65%"
      height={48}
      borderRadius={16}
      duration={animate ? undefined : 0}
      style={[styles.chatBubble, isUser ? styles.chatBubbleUser : undefined] as ViewStyle[]}
    />
  </View>
);

// ---------------------------------------------------------------------------
// GridSkeleton -- 2-column product grid
// ---------------------------------------------------------------------------

export const GridSkeleton: React.FC<GridSkeletonProps> = ({
  itemCount = 4,
  animate = true,
  style,
}) => {
  const data = Array.from({ length: itemCount }, (_, i) => i);

  return (
    <View style={[styles.gridContainer, style]}>
      {data.map((index) => (
        <View key={index} style={styles.gridCell}>
          {/* Image placeholder with 0.8 aspect ratio wrapper */}
          <View style={styles.gridImageWrapper}>
            <ShimmerSkeleton
              width="100%"
              height={undefined as unknown as number}
              borderRadius={12}
              duration={animate ? undefined : 0}
              style={StyleSheet.absoluteFillObject as ViewStyle}
            />
          </View>
          {/* Title line */}
          <ShimmerSkeleton
            width="80%"
            height={12}
            borderRadius={6}
            duration={animate ? undefined : 0}
            style={{ marginTop: GAP_8 }}
          />
          {/* Price line */}
          <ShimmerSkeleton
            width="40%"
            height={14}
            borderRadius={6}
            duration={animate ? undefined : 0}
            style={{ marginTop: GAP_6 }}
          />
        </View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// AdvancedSkeleton -- main entry point
// ---------------------------------------------------------------------------

export const AdvancedSkeleton: React.FC<AdvancedSkeletonProps> = ({
  type,
  count = 3,
  itemCount = 4,
  animate = true,
  style,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (type) {
    case "card":
      return (
        <View style={style}>
          {items.map((i) => (
            <CardSkeleton
              key={i}
              animate={animate}
              style={i > 0 ? { marginTop: GAP_12 } : undefined}
            />
          ))}
        </View>
      );

    case "list":
      return (
        <View style={style}>
          {items.map((i) => (
            <ListSkeleton
              key={i}
              animate={animate}
              style={i > 0 ? { marginTop: GAP_12 } : undefined}
            />
          ))}
        </View>
      );

    case "chat":
      return (
        <View style={style}>
          {items.map((i) => (
            <ChatBubbleSkeleton
              key={i}
              isUser={i % 2 === 1}
              animate={animate}
              style={i > 0 ? { marginTop: GAP_8 } : undefined}
            />
          ))}
        </View>
      );

    case "grid":
      return <GridSkeleton itemCount={itemCount} animate={animate} style={style} />;

    default:
      return null;
  }
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Card template
  cardContainer: {
    width: "100%",
  },
  cardTextBlock: {
    marginTop: GAP_8,
    gap: GAP_8,
  },

  // List template
  listContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: GAP_12,
  },
  listTextColumn: {
    flex: 1,
    gap: GAP_6,
  },

  // Chat template
  chatRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: GAP_8,
  },
  chatRowReverse: {
    flexDirection: "row-reverse",
  },
  chatBubble: {
    // left-aligned by default
  },
  chatBubbleUser: {
    // right-aligned via row-reverse on parent
  },

  // Grid template
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP_12,
  },
  gridCell: {
    width: "47%",
    // Remaining 6% accounts for gap spacing between 2 columns
  },
  gridImageWrapper: {
    width: "100%",
    aspectRatio: 0.8,
    overflow: "hidden",
  },
});

export default AdvancedSkeleton;

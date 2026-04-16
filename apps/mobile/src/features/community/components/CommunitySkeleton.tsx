import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "../../design-system/ui/Skeleton";
import { Colors, Spacing, BorderRadius } from '../../../design-system/theme';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_GAP = 8;
const HORIZONTAL_PADDING = 8;
const NUM_COLUMNS = 2;
const COLUMN_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - COLUMN_GAP) / NUM_COLUMNS;

/**
 * CommunityScreen skeleton - masonry/waterfall layout matching CommunityFeed:
 * - Header tabs
 * - 2-column masonry cards with varying heights
 */
export const CommunitySkeleton: React.FC = () => {
  // Simulate masonry with alternating heights
  const heights = [220, 180, 200, 240, 190, 210, 230, 170];

  return (
    <View style={styles.container}>
      {/* Header tabs */}
      <View style={styles.headerRow}>
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>

      {/* Trending card placeholder */}
      <View style={styles.trendingRow}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            width={COLUMN_WIDTH * 0.6}
            height={28}
            borderRadius={14}
          />
        ))}
      </View>

      {/* Masonry grid */}
      <View style={styles.masonryContainer}>
        {/* Left column */}
        <View style={styles.masonryColumn}>
          {heights
            .filter((_, i) => i % 2 === 0)
            .map((h, i) => (
              <View key={`left-${i}`} style={[styles.masonryCard, { height: h }]}>
                <Skeleton width="100%" height={h - 50} borderRadius={BorderRadius.lg} />
                <View style={styles.cardTextContent}>
                  <Skeleton width="80%" height={12} borderRadius={BorderRadius.sm} />
                  <View style={styles.cardAuthorRow}>
                    <Skeleton width={16} height={16} borderRadius={8} />
                    <Skeleton width={50} height={10} borderRadius={BorderRadius.sm} />
                  </View>
                </View>
              </View>
            ))}
        </View>

        {/* Right column */}
        <View style={styles.masonryColumn}>
          {heights
            .filter((_, i) => i % 2 === 1)
            .map((h, i) => (
              <View key={`right-${i}`} style={[styles.masonryCard, { height: h }]}>
                <Skeleton width="100%" height={h - 50} borderRadius={BorderRadius.lg} />
                <View style={styles.cardTextContent}>
                  <Skeleton width="80%" height={12} borderRadius={BorderRadius.sm} />
                  <View style={styles.cardAuthorRow}>
                    <Skeleton width={16} height={16} borderRadius={8} />
                    <Skeleton width={50} height={10} borderRadius={BorderRadius.sm} />
                  </View>
                </View>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  headerRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
  },
  trendingRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: DesignTokens.spacing[3],
  },
  masonryContainer: {
    flexDirection: "row",
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: COLUMN_GAP,
  },
  masonryColumn: {
    flex: 1,
    gap: COLUMN_GAP,
  },
  masonryCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardTextContent: {
    padding: Spacing.sm,
  },
  cardAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: DesignTokens.spacing['1.5'],
  },
});

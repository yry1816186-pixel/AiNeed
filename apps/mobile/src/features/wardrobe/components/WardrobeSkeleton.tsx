import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "../../design-system/ui/Skeleton";
import { Colors, Spacing, BorderRadius } from '../../../design-system/theme';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / NUM_COLUMNS;

/**
 * WardrobeScreen skeleton - 2-column clothing grid matching WardrobeScreen layout:
 * - Header with stats
 * - Search bar
 * - Category tabs
 * - 2-column grid of clothing items
 */
export const WardrobeSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={100} height={24} borderRadius={BorderRadius.sm} />
        <View style={styles.headerActions}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <Skeleton width={40} height={40} borderRadius={20} />
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Skeleton width={50} height={28} borderRadius={BorderRadius.sm} />
          <Skeleton width={40} height={12} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.xs}} />
        </View>
        <View style={styles.statCard}>
          <Skeleton width={50} height={28} borderRadius={BorderRadius.sm} />
          <Skeleton width={40} height={12} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.xs}} />
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width="80%" height={16} borderRadius={BorderRadius.sm} style={{ marginLeft: Spacing.sm}} />
      </View>

      {/* Category tabs */}
      <View style={styles.categoryRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            width={60 + (i % 2) * 20}
            height={32}
            borderRadius={16}
          />
        ))}
      </View>

      {/* 2-column grid */}
      <View style={styles.gridContainer}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={styles.gridItem}>
            <Skeleton width={CARD_WIDTH} height={CARD_WIDTH} borderRadius={BorderRadius.lg} />
            <Skeleton width="70%" height={13} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.sm, paddingHorizontal: Spacing.sm}} />
            <Skeleton width="50%" height={11} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.xs, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm}} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: DesignTokens.spacing[5],
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: DesignTokens.spacing[3],
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral.white,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: 12,
    paddingHorizontal: DesignTokens.spacing[3],
    height: DesignTokens.spacing[10],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  categoryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.sm,
    gap: CARD_GAP,
  },
  gridItem: {
    width: CARD_WIDTH,
    backgroundColor: Colors.neutral.white,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: CARD_GAP,
  },
});

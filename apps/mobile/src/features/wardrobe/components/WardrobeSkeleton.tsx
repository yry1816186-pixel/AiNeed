import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "../../design-system/ui/Skeleton";
import { Colors, Spacing, BorderRadius } from '../../../design-system/theme';

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
          <Skeleton width={40} height={12} borderRadius={BorderRadius.sm} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statCard}>
          <Skeleton width={50} height={28} borderRadius={BorderRadius.sm} />
          <Skeleton width={40} height={12} borderRadius={BorderRadius.sm} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Skeleton width={18} height={18} borderRadius={9} />
        <Skeleton width="80%" height={16} borderRadius={BorderRadius.sm} style={{ marginLeft: 8 }} />
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
            <Skeleton width="70%" height={13} borderRadius={BorderRadius.sm} style={{ marginTop: 8, paddingHorizontal: 8 }} />
            <Skeleton width="50%" height={11} borderRadius={BorderRadius.sm} style={{ marginTop: 4, paddingHorizontal: 8, paddingBottom: 8 }} />
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
    padding: 20,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral.white,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
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

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from '../../../design-system/ui/Skeleton';
import { Colors, Spacing, BorderRadius } from '../../../design-system/theme';
import { LoadingAnimations } from '../../../design-system/theme/tokens/animations';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';


const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;
const CONTENT_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

/**
 * HomeScreen skeleton - matches the actual HomeScreen layout:
 * - Weather greeting card skeleton
 * - Quick actions row skeleton
 * - Search bar skeleton
 * - Recommendation card skeletons
 */
export const HomeSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Weather greeting card */}
      <View style={styles.greetingCard}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextCol}>
            <Skeleton width="60%" height={20} borderRadius={BorderRadius.sm} />
            <Skeleton width="80%" height={14} borderRadius={BorderRadius.sm} style={{ marginTop: Spacing.sm}} />
            <Skeleton width="40%" height={12} borderRadius={BorderRadius.sm} style={{ marginTop: DesignTokens.spacing['1.5']}} />
          </View>
          <Skeleton width={64} height={64} borderRadius={BorderRadius.xl} />
        </View>
      </View>

      {/* Quick actions row */}
      <View style={styles.quickActionsRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.quickActionItem}>
            <Skeleton width={48} height={48} borderRadius={BorderRadius.xl} />
            <Skeleton width={40} height={10} borderRadius={BorderRadius.sm} style={{ marginTop: DesignTokens.spacing['1.5']}} />
          </View>
        ))}
      </View>

      {/* Search bar */}
      <Skeleton
        width={CONTENT_WIDTH}
        height={48}
        borderRadius={BorderRadius.xl}
        style={{ marginVertical: Spacing.md}}
      />

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Skeleton width="30%" height={18} borderRadius={BorderRadius.sm} />
        <Skeleton width={60} height={14} borderRadius={BorderRadius.sm} />
      </View>

      {/* Recommendation cards */}
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.recommendationCard}>
          <Skeleton width={CONTENT_WIDTH} height={180} borderRadius={BorderRadius.lg} />
          <View style={styles.cardContent}>
            <Skeleton width="70%" height={14} borderRadius={BorderRadius.sm} />
            <Skeleton width="50%" height={12} borderRadius={BorderRadius.sm} style={{ marginTop: DesignTokens.spacing['1.5']}} />
            <View style={styles.cardFooter}>
              <Skeleton width={80} height={20} borderRadius={BorderRadius.md} />
              <Skeleton width={60} height={14} borderRadius={BorderRadius.sm} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Spacing.md,
  },
  greetingCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingTextCol: {
    flex: 1,
    marginRight: DesignTokens.spacing[3],
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickActionItem: {
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: DesignTokens.spacing[5],
    marginBottom: DesignTokens.spacing[3],
  },
  recommendationCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
});

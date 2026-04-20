import React from "react";
import { View } from "react-native";
import { Skeleton } from "../../../design-system/ui/Skeleton";
import { Spacing, BorderRadius } from "../../../design-system/theme";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

/**
 * OrdersSkeleton - matches OrdersScreen layout:
 * - Tab bar placeholder
 * - Order card placeholders with header, items row, and footer
 */
export const OrdersSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={48} height={28} borderRadius={BorderRadius.lg} />
        ))}
      </View>

      {/* Order cards */}
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.orderCard}>
          {/* Order header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderHeaderLeft}>
              <Skeleton width={32} height={12} borderRadius={BorderRadius.sm} />
              <Skeleton
                width={80}
                height={14}
                borderRadius={BorderRadius.sm}
                style={{ marginTop: Spacing.xs }}
              />
            </View>
            <Skeleton width={56} height={24} borderRadius={12} />
          </View>

          {/* Items row */}
          <View style={styles.itemsRow}>
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} width={54} height={54} borderRadius={BorderRadius.lg} />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.orderFooter}>
            <Skeleton width={60} height={12} borderRadius={BorderRadius.sm} />
            <View style={styles.orderSummary}>
              <Skeleton width={50} height={12} borderRadius={BorderRadius.sm} />
              <Skeleton width={70} height={18} borderRadius={BorderRadius.sm} />
            </View>
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            <Skeleton width={72} height={32} borderRadius={BorderRadius.lg} />
            <Skeleton width={72} height={32} borderRadius={BorderRadius.lg} />
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * CartSkeleton - matches CartScreen layout:
 * - Header
 * - Select all row
 * - Cart item cards
 */
export const CartSkeleton: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.cartHeader}>
        <Skeleton width={80} height={24} borderRadius={BorderRadius.sm} />
        <View style={styles.cartHeaderRight}>
          <Skeleton width={24} height={16} borderRadius={BorderRadius.sm} />
          <Skeleton width={32} height={16} borderRadius={BorderRadius.sm} />
        </View>
      </View>

      {/* Select all row */}
      <View style={styles.selectAllRow}>
        <Skeleton width={20} height={20} borderRadius={10} />
        <Skeleton width={60} height={14} borderRadius={BorderRadius.sm} />
      </View>

      {/* Cart items */}
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.cartItem}>
          <Skeleton width={20} height={20} borderRadius={10} />
          <Skeleton width={64} height={64} borderRadius={BorderRadius.lg} />
          <View style={styles.cartItemInfo}>
            <Skeleton width="80%" height={14} borderRadius={BorderRadius.sm} />
            <View style={styles.cartItemSpecs}>
              <Skeleton width={40} height={20} borderRadius={BorderRadius.xs} />
              <Skeleton width={40} height={20} borderRadius={BorderRadius.xs} />
            </View>
            <View style={styles.cartItemBottom}>
              <Skeleton width={60} height={16} borderRadius={BorderRadius.sm} />
              <View style={styles.quantityControls}>
                <Skeleton width={28} height={28} borderRadius={BorderRadius.xs} />
                <Skeleton width={28} height={20} borderRadius={BorderRadius.xs} />
                <Skeleton width={28} height={28} borderRadius={BorderRadius.xs} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing["3.5"],
    backgroundColor: colors.surface,
  },
  orderCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: colors.surface,
    marginHorizontal: DesignTokens.spacing[5],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderHeaderLeft: {
    gap: Spacing.xs,
  },
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing["2.5"],
    marginTop: Spacing.md,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: DesignTokens.spacing["3.5"],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orderSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: DesignTokens.spacing["2.5"],
    marginTop: Spacing.md,
  },
  cartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.placeholderBg,
  },
  cartHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
    gap: Spacing.sm,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing["3.5"],
    gap: Spacing.sm,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: DesignTokens.spacing[3],
    gap: DesignTokens.spacing["1.5"],
  },
  cartItemSpecs: {
    flexDirection: "row",
    gap: DesignTokens.spacing["1.5"],
  },
  cartItemBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    gap: 0,
    alignItems: "center",
  },
}));

import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { DesignTokens, Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface CaseCardProps {
  serviceType: string;
  beforeImages: string[];
  afterImages: string[];
  rating: number;
  reviewExcerpt: string | null;
  clientName: string;
  price: number;
}

export const CaseCard: React.FC<CaseCardProps> = ({
  serviceType,
  beforeImages,
  afterImages,
  rating,
  reviewExcerpt,
  clientName,
  price,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const beforeArr = Array.isArray(beforeImages) ? beforeImages : [];
  const afterArr = Array.isArray(afterImages) ? afterImages : [];
  const beforeUrl = beforeArr[0] as string | undefined;
  const afterUrl = afterArr[0] as string | undefined;

  return (
    <View style={styles.card}>
      <View style={styles.imageRow}>
        {beforeUrl ? (
          <Image source={{ uri: beforeUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>Before</Text>
          </View>
        )}
        {afterUrl ? (
          <Image source={{ uri: afterUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>After</Text>
          </View>
        )}
      </View>

      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{serviceType}</Text>
        </View>
        <Text style={styles.ratingText}>{rating} 星</Text>
      </View>

      {reviewExcerpt && (
        <Text style={styles.excerpt} numberOfLines={2}>
          {reviewExcerpt}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.price}>{price} 元</Text>
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
    borderWidth: 1,
    borderColor: "colors.backgroundTertiary",
    width: 240,
  },
  imageRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  image: {
    flex: 1,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  typeBadge: {
    backgroundColor: DesignTokens.colors.neutral[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: DesignTokens.spacing['0.5'],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.brand.terracottaLight,
  },
  typeBadgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.brand.terracotta,
  },
  ratingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  excerpt: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.secondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "500",
  },
}))

export default CaseCard;

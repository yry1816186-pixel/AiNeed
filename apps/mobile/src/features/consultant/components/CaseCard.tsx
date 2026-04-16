import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { DesignTokens } from "../../../design-system/theme";

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    width: 240,
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  image: {
    flex: 1,
    height: 100,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F0D5C8",
  },
  typeBadgeText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: "#C67B5C",
  },
  ratingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.secondary,
  },
  excerpt: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "#444",
    lineHeight: 18,
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "#C67B5C",
    fontWeight: "500",
  },
});

export default CaseCard;

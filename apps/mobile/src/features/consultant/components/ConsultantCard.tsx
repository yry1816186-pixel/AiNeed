import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { RatingBadge } from "../../design-system/ui/Rating";
import { MatchBadge } from "./MatchBadge";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface ConsultantCardProps {
  id: string;
  studioName: string;
  avatar: string | null;
  specialties: string[];
  rating: number;
  reviewCount: number;
  matchPercentage?: number;
  matchReasons?: string[];
  price?: number;
  onPress: () => void;
  index?: number;
}

export const ConsultantCard: React.FC<ConsultantCardProps> = ({
  studioName,
  avatar,
  specialties,
  rating,
  reviewCount,
  matchPercentage,
  matchReasons,
  price,
  onPress,
  index = 0,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Animated.View entering={FadeInUp.duration(300).delay(index * 50)}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.header}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>{studioName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.studioName} numberOfLines={1}>
              {studioName}
            </Text>
            <View style={styles.specialtyRow}>
              {specialties.slice(0, 3).map((s) => (
                <View key={s} style={styles.specialtyBadge}>
                  <Text style={styles.specialtyText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
          {matchPercentage !== undefined && <MatchBadge percentage={matchPercentage} />}
        </View>

        <View style={styles.footer}>
          <View style={styles.ratingRow}>
            <RatingBadge value={rating} />
            <Text style={styles.reviewCount}>{reviewCount} 条评价</Text>
          </View>
          {matchReasons && matchReasons.length > 0 && (
            <Text style={styles.matchReasons} numberOfLines={2}>
              {matchReasons.join(" / ")}
            </Text>
          )}
          {price !== undefined && <Text style={styles.price}>参考价: {price} 元</Text>}
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>查看详情</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: DesignTokens.spacing[3],
    borderWidth: 1,
    borderColor: "colors.backgroundTertiary",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  avatar: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 24,
    marginRight: DesignTokens.spacing[3],
  },
  avatarPlaceholder: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 24,
    backgroundColor: "colors.primary",
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing[3],
  },
  avatarPlaceholderText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
  },
  headerInfo: {
    flex: 1,
  },
  studioName: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: "colors.textPrimary",
    marginBottom: Spacing.xs,
  },
  specialtyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  specialtyBadge: {
    backgroundColor: DesignTokens.colors.neutral[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: DesignTokens.spacing['0.5'],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "colors.primaryLight",
  },
  specialtyText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.primary",
  },
  footer: {
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  reviewCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  matchReasons: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  price: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.primary",
    marginTop: Spacing.xs,
  },
  cta: {
    alignSelf: "flex-end",
  },
  ctaText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: "colors.primary",
    fontWeight: "500",
  },
}))

export default ConsultantCard;

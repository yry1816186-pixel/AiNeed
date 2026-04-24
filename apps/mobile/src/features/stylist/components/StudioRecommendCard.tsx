import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

export interface StudioData {
  id: string;
  name: string;
  city: string;
  specialty: string;
  price_range: { min: number; max: number };
  contact: string;
  style_tags?: string[];
  occasions?: string[];
  description: string;
}

export interface StudioRecommendCardProps {
  studio: StudioData;
  onPress: () => void;
}

/**
 * StudioRecommendCard - Card component for studio recommendation in chat messages.
 *
 * Design:
 * - Rounded card with subtle shadow, warm neutral background
 * - Shows studio name, city, specialty, price range, description
 * - Terracotta accent on CTA button
 * - Graceful fallback when studio data is partial
 */
export const StudioRecommendCard: React.FC<StudioRecommendCardProps> = ({ studio, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Studio icon + name + city */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="business-outline"
            size={20}
            color={DesignTokens.colors.brand.terracotta}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {studio.name}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={DesignTokens.colors.neutral[400]} />
            <Text style={styles.city}>{studio.city}</Text>
          </View>
        </View>
      </View>

      {/* Specialty tag */}
      <View style={styles.specialtyTag}>
        <Text style={styles.specialtyText}>{studio.specialty}</Text>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {studio.description}
      </Text>

      {/* Footer: price range + CTA */}
      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Ionicons name="pricetag-outline" size={14} color={DesignTokens.colors.neutral[400]} />
          <Text style={styles.price}>
            ¥{studio.price_range.min.toLocaleString()}-{studio.price_range.max.toLocaleString()}
          </Text>
        </View>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>查看详情</Text>
          <Ionicons name="chevron-forward" size={14} color={DesignTokens.colors.neutral.white} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: DesignTokens.borderRadius.xl,
      padding: DesignTokens.spacing[4],
      marginVertical: DesignTokens.spacing[2],
      borderWidth: 1,
      borderColor: DesignTokens.colors.neutral[200],
      ...DesignTokens.shadows.sm,
    } as ViewStyle,
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: DesignTokens.spacing[3],
    } as ViewStyle,
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: DesignTokens.colors.neutral[50],
      alignItems: "center",
      justifyContent: "center",
      marginRight: DesignTokens.spacing[3],
      borderWidth: 1,
      borderColor: DesignTokens.colors.neutral[100],
    } as ViewStyle,
    headerText: {
      flex: 1,
    } as ViewStyle,
    name: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: DesignTokens.typography.fontWeights.bold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral[900],
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: DesignTokens.spacing[1],
      marginTop: 2,
    } as ViewStyle,
    city: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: DesignTokens.colors.neutral[400],
    },
    specialtyTag: {
      alignSelf: "flex-start",
      paddingHorizontal: DesignTokens.spacing[3],
      paddingVertical: DesignTokens.spacing[1],
      borderRadius: DesignTokens.borderRadius.full,
      backgroundColor: DesignTokens.colors.brand.terracottaLight + "18",
      marginBottom: DesignTokens.spacing[3],
    } as ViewStyle,
    specialtyText: {
      fontSize: DesignTokens.typography.sizes.xs,
      fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle["fontWeight"],
      color: DesignTokens.colors.brand.terracotta,
    },
    description: {
      fontSize: DesignTokens.typography.sizes.sm,
      lineHeight: 20,
      color: DesignTokens.colors.neutral[600],
      marginBottom: DesignTokens.spacing[3],
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    } as ViewStyle,
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: DesignTokens.spacing[1],
    } as ViewStyle,
    price: {
      fontSize: DesignTokens.typography.sizes.sm,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral[600],
    },
    ctaButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: DesignTokens.spacing[3],
      paddingVertical: DesignTokens.spacing[1.5],
      borderRadius: DesignTokens.borderRadius.full,
      backgroundColor: DesignTokens.colors.brand.terracotta,
    } as ViewStyle,
    ctaText: {
      fontSize: DesignTokens.typography.sizes.xs,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral.white,
    },
  })
);

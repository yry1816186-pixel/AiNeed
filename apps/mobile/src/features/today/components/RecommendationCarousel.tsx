import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import type { RecommendedItem } from "../../../services/api/tryon.api";

interface RecommendationCarouselProps {
  items?: RecommendedItem[];
}

export function RecommendationCarousel({ items }: RecommendationCarouselProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>伊伊推荐</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {items.map((outfit) => (
          <TouchableOpacity key={outfit.id} style={styles.outfitCard} activeOpacity={0.7}>
            <View style={styles.outfitImage}>
              <Text style={styles.outfitImagePlaceholder}>{outfit.name[0]}</Text>
            </View>
            <Text style={styles.outfitName} numberOfLines={1}>
              {outfit.name}
            </Text>
            <Text style={styles.outfitScene} numberOfLines={1}>
              {outfit.category}
            </Text>
            {outfit.matchReasons && outfit.matchReasons.length > 0 && (
              <Text style={styles.outfitReason} numberOfLines={1}>
                {outfit.matchReasons[0]}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  carousel: {
    paddingHorizontal: 12,
  },
  outfitCard: {
    width: 140,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden" as const,
  },
  outfitImage: {
    width: 140,
    height: 140,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  outfitImagePlaceholder: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  outfitName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 8,
    marginHorizontal: 8,
  },
  outfitScene: {
    fontSize: 12,
    color: colors.textTertiary,
    marginHorizontal: 8,
  },
  outfitReason: {
    fontSize: 11,
    color: colors.textSecondary,
    marginHorizontal: 8,
    marginBottom: 8,
    marginTop: 2,
  },
}));

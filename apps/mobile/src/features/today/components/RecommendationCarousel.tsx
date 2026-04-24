import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { recommendationsApi, type RecommendedItem } from "../../../services/api/tryon.api";

/** @mock fallback when API is unavailable */
const MOCK_OUTFITS: RecommendedItem[] = [
  {
    id: "1",
    name: "商务精英",
    category: "商务",
    mainImage: "",
    price: 0,
    matchReasons: ["适合你的体型和面试场景"],
  },
  {
    id: "2",
    name: "休闲时尚",
    category: "日常",
    mainImage: "",
    price: 0,
    matchReasons: ["日常百搭单品"],
  },
  {
    id: "3",
    name: "运动活力",
    category: "运动",
    mainImage: "",
    price: 0,
    matchReasons: ["适合运动场景"],
  },
];

export function RecommendationCarousel() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [outfits, setOutfits] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromApi, setIsFromApi] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await recommendationsApi.getPersonalized({ limit: 6 });
      if (response.success && response.data && response.data.length > 0) {
        setOutfits(response.data);
        setIsFromApi(true);
      } else {
        setOutfits(MOCK_OUTFITS);
        setIsFromApi(false);
      }
    } catch {
      setOutfits(MOCK_OUTFITS);
      setIsFromApi(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>伊伊推荐</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>伊伊推荐{!isFromApi ? "（预览）" : ""}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {outfits.map((outfit) => (
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

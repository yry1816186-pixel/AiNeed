import { logger } from "../../../shared/utils/logger";
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { communityApi } from "../../../services/api/community.api";
import { DesignTokens, flatColors as colors } from "../../../design-system/theme";
import { createStyles } from "../../../shared/contexts/ThemeContext";

interface TrendingTag {
  name: string;
  direction: "up" | "down" | "stable";
  count?: number;
}

interface TrendingCardProps {
  onPressTag?: (tag: string) => void;
}

const DIRECTION_CONFIG = {
  up: { icon: "arrow-up" as const, color: DesignTokens.colors.semantic.success },
  down: { icon: "arrow-down" as const, color: DesignTokens.colors.semantic.error },
  stable: { icon: "arrow-forward" as const, color: colors.textTertiary },
} as const;

export const TrendingCard: React.FC<TrendingCardProps> = ({ onPressTag }) => {
  const styles = useStyles(colors);
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      const response = await communityApi.getTrending({ type: "tags" });
      if (response.success && response.data) {
        const rawData = response.data as { name?: string; direction?: string; count?: number }[];
        const trendingTags: TrendingTag[] = rawData.map((item) => ({
          name: item.name ?? "",
          direction: item.direction === "up" ? "up" : item.direction === "down" ? "down" : "stable",
          count: item.count,
        }));
        setTags(trendingTags);
      }
    } catch (err) {
      // Trending is supplementary content
      logger.error("Failed to load trending:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrending();
  }, [fetchTrending]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tags.map((tag) => {
          const dirConfig = DIRECTION_CONFIG[tag.direction] ?? DIRECTION_CONFIG.stable;
          return (
            <TouchableOpacity
              key={tag.name}
              style={styles.tagChip}
              onPress={() => onPressTag?.(tag.name)}
              activeOpacity={0.7}
              accessibilityLabel={`Trending tag: ${tag.name}`}
              accessibilityRole="button"
            >
              <Text style={styles.tagText}>#{tag.name}</Text>
              <Ionicons name={dirConfig.icon} size={12} color={dirConfig.color} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  loadingContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
}));

export default TrendingCard;

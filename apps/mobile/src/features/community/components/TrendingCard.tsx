import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { communityApi } from "../../services/api/community.api";
import { DesignTokens } from "../../../design-system/theme";

interface TrendingTag {
  name: string;
  direction: "up" | "down" | "stable";
  count?: number;
}

interface TrendingCardProps {
  onPressTag?: (tag: string) => void;
}

const DIRECTION_CONFIG = {
  up: { icon: "arrow-up", color: "#27AE60" },
  down: { icon: "arrow-down", color: "#E74C3C" },
  stable: { icon: "arrow-forward", color: DesignTokens.colors.text.tertiary },
} as const;

export const TrendingCard: React.FC<TrendingCardProps> = ({ onPressTag }) => {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      const response = await communityApi.getTrending({ type: "tags" });
      if (response.success && response.data) {
        const trendingTags: TrendingTag[] = (
          response.data as { name?: string; direction?: string; count?: number }[]
        ).map((item) => ({
          name: item.name ?? "",
          direction: (item.direction === "up"
            ? "up"
            : item.direction === "down"
            ? "down"
            : "stable") as TrendingTag["direction"],
          count: item.count,
        }));
        setTags(trendingTags);
      }
    } catch (error) {
      // Trending is supplementary content
      console.error('Failed to load trending:', error);
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
        <ActivityIndicator size="small" color={DesignTokens.colors.brand.terracotta} />
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
              <Ionicons name={dirConfig.icon as "arrow-up"} size={12} color={dirConfig.color} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F0EDFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "500",
  },
  loadingContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
});

export default TrendingCard;

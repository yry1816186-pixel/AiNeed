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
import { communityApi } from '../../../services/api/community.api';
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface TrendingTag {
  name: string;
  direction: "up" | "down" | "stable";
  count?: number;
}

interface TrendingCardProps {
  onPressTag?: (tag: string) => void;
}

const DIRECTION_CONFIG = {
  up: { icon: "arrow-up", color: DesignTokens.colors.semantic.success },
  down: { icon: "arrow-down", color: DesignTokens.colors.semantic.error },
  stable: { icon: "arrow-forward", color: DesignTokens.colors.text.tertiary },
} as const;

export const TrendingCard: React.FC<TrendingCardProps> = ({ onPressTag }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
              <Ionicons name={dirConfig.icon as "arrow-up"} size={12} color={dirConfig.color} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: DesignTokens.spacing[3],
    gap: Spacing.sm,
    alignItems: "center",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 16,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  loadingContainer: {
    paddingVertical: DesignTokens.spacing[3],
    alignItems: "center",
  },
}))

export default TrendingCard;

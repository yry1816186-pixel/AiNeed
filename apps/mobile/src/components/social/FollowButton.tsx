import React, { useState, useCallback } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { communityApi } from "../../services/api/community.api";
import { theme } from '../../design-system/theme';
import { DesignTokens } from "../../design-system/theme";

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  size?: "small" | "medium";
  onFollowChange?: (following: boolean) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  initialFollowing = false,
  size = "medium",
  onFollowChange,
}) => {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(async () => {
    if (loading) {
      return;
    }
    try {
      setLoading(true);
      const response = await communityApi.toggleFollow(userId);
      if (response.success && response.data) {
        const newFollowing = response.data.following;
        setFollowing(newFollowing);
        onFollowChange?.(newFollowing);
      }
    } catch {
      // Silently fail - follow state unchanged
    } finally {
      setLoading(false);
    }
  }, [userId, loading, onFollowChange]);

  const isSmall = size === "small";

  if (following) {
    return (
      <TouchableOpacity
        style={[styles.followingBtn, isSmall && styles.followingBtnSmall]}
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.7}
        accessibilityLabel="Unfollow"
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        ) : (
          <Text style={[styles.followingText, isSmall && styles.followingTextSmall]}>已关注</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.followBtn, isSmall && styles.followBtnSmall]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}
      accessibilityLabel="Follow"
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={DesignTokens.colors.backgrounds.primary} />
      ) : (
        <Text style={[styles.followText, isSmall && styles.followTextSmall]}>关注</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  followBtn: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  followTextSmall: {
    fontSize: 12,
  },
  followingBtn: {
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  followingBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  followingTextSmall: {
    fontSize: 12,
  },
});

export default FollowButton;

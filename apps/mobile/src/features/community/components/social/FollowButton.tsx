import React, { useState, useCallback } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { communityApi } from '../../../../services/api/community.api';
import { theme, Spacing, DesignTokens, flatColors as colors } from '../../../../design-system/theme';
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
    } catch (error) {
      console.error('Follow operation failed:', error);
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
        <ActivityIndicator size="small" color={colors.textInverse} />
      ) : (
        <Text style={[styles.followText, isSmall && styles.followTextSmall]}>关注</Text>
      )}
    </TouchableOpacity>
  );
};

const useStyles = createStyles((colors) => ({
  followBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnSmall: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followText: {
    color: colors.textInverse,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
  followTextSmall: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
  followingBtn: {
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  followingBtnSmall: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followingText: {
    color: theme.colors.textSecondary,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
  },
  followingTextSmall: {
    fontSize: DesignTokens.typography.sizes.sm,
  },
}))

export default FollowButton;

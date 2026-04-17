import React from "react";
import { View } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface BloggerBadgeProps {
  level: "blogger" | "big_v";
}

function BloggerBadgeInner({ level }: BloggerBadgeProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  if (level === "big_v") {
    return (
      <View style={styles.bigVBadge}>
        <Ionicons name="shield-checkmark" size={10} color={colors.surface} />
      </View>
    );
  }
  return (
    <View style={styles.bloggerBadge}>
      <Ionicons name="checkmark" size={8} color={colors.surface} />
    </View>
  );
}

export const BloggerBadge = React.memo(BloggerBadgeInner);

const useStyles = createStyles((colors) => ({
  bloggerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: DesignTokens.spacing[3],
    height: DesignTokens.spacing[3],
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surface,
  },
  bigVBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: DesignTokens.spacing['3.5'],
    height: DesignTokens.spacing['3.5'],
    borderRadius: 7,
    backgroundColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.surface,
  },
}))

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../design-system/theme";

interface BloggerBadgeProps {
  level: "blogger" | "big_v";
}

function BloggerBadgeInner({ level }: BloggerBadgeProps) {
  if (level === "big_v") {
    return (
      <View style={s.bigVBadge}>
        <Ionicons name="shield-checkmark" size={10} color={DesignTokens.colors.backgrounds.primary} />
      </View>
    );
  }
  return (
    <View style={s.bloggerBadge}>
      <Ionicons name="checkmark" size={8} color={DesignTokens.colors.backgrounds.primary} />
    </View>
  );
}

export const BloggerBadge = React.memo(BloggerBadgeInner);

const s = StyleSheet.create({
  bloggerBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DesignTokens.colors.brand.terracotta,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DesignTokens.colors.backgrounds.primary,
  },
  bigVBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "DesignTokens.colors.semantic.warning",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DesignTokens.colors.backgrounds.primary,
  },
});

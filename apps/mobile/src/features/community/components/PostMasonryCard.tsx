import React, { useEffect, useCallback, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SharedElement } from "react-navigation-shared-element";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../../../design-system/theme';
import { BloggerBadge } from "./BloggerBadge";
import { DesignTokens } from "../../../design-system/theme";

export interface PostCardData {
  id: string;
  title: string;
  image: string;
  authorName: string;
  authorAvatar: string;
  likesCount: number;
  isFeatured: boolean;
  imageHeight: number;
  bloggerLevel?: "blogger" | "big_v" | null;
  feedType?: "post" | "like" | "tryon";
  feedMeta?: string;
}

const SPRING_CFG = { damping: 15, stiffness: 150, mass: 0.5 };

interface PostMasonryCardProps {
  item: PostCardData;
  index: number;
  onPress: () => void;
  visible?: boolean;
  onHeightMeasured?: (height: number) => void;
}

function PostMasonryCardInner({
  item,
  index,
  onPress,
  visible = false,
  onHeightMeasured,
}: PostMasonryCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 350 });
      scale.value = withSpring(1, SPRING_CFG);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleLayout = useCallback(
    (e: any) => {
      const h = e.nativeEvent.layout.height;
      if (onHeightMeasured && (measuredHeight === null || Math.abs(measuredHeight - h) > 5)) {
        setMeasuredHeight(h);
        onHeightMeasured(h);
      }
    },
    [onHeightMeasured, measuredHeight]
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[s.masonryCard, animatedStyle]} onLayout={handleLayout}>
        <View style={[s.masonryImageContainer, { height: item.imageHeight }]}>
          {item.image ? (
            <SharedElement id={`post.${item.id}.image`}>
              <Image source={{ uri: item.image }} style={s.masonryImage} resizeMode="cover" />
            </SharedElement>
          ) : (
            <View style={s.masonryImagePlaceholder}>
              <Ionicons name="image-outline" size={28} color={theme.colors.placeholderBg} />
            </View>
          )}
          {item.isFeatured && (
            <View style={s.featuredBadge}>
              <Ionicons name="star" size={10} color={theme.colors.gold} />
              <Text style={s.featuredText}>精华</Text>
            </View>
          )}
        </View>
        <View style={s.masonryInfo}>
          <Text style={s.masonryTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={s.masonryFooter}>
            <View style={s.masonryAuthor}>
              {item.authorAvatar ? (
                <View style={s.avatarWrapper}>
                  <Image source={{ uri: item.authorAvatar }} style={s.masonryAvatar} />
                  {item.bloggerLevel && <BloggerBadge level={item.bloggerLevel} />}
                </View>
              ) : (
                <View style={s.avatarWrapper}>
                  <View style={s.masonryAvatarPlaceholder}>
                    <Ionicons name="person" size={10} color={theme.colors.surface} />
                  </View>
                  {item.bloggerLevel && <BloggerBadge level={item.bloggerLevel} />}
                </View>
              )}
              <Text style={s.masonryAuthorName} numberOfLines={1}>
                {item.authorName}
              </Text>
            </View>
            <View style={s.masonryLikes}>
              <Ionicons name="heart-outline" size={12} color={theme.colors.textTertiary} />
              <Text style={s.masonryLikesCount}>
                {item.likesCount >= 1000
                  ? `${(item.likesCount / 1000).toFixed(1)}k`
                  : String(item.likesCount)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export const PostMasonryCard = React.memo(PostMasonryCardInner);

const s = StyleSheet.create({
  masonryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  masonryImageContainer: {
    width: "100%",
    backgroundColor: theme.colors.subtleBg,
    overflow: "hidden",
  },
  masonryImage: { width: "100%", height: "100%" },
  masonryImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.subtleBg,
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,184,0,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featuredText: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "700", color: theme.colors.surface },
  masonryInfo: { padding: 10 },
  masonryTitle: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "600", color: theme.colors.textPrimary, lineHeight: 18 },
  masonryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  masonryAuthor: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  avatarWrapper: { position: "relative" },
  masonryAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.subtleBg,
  },
  masonryAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  masonryAuthorName: { fontSize: DesignTokens.typography.sizes.xs, color: theme.colors.textTertiary, flex: 1 },
  masonryLikes: { flexDirection: "row", alignItems: "center", gap: 3 },
  masonryLikesCount: { fontSize: DesignTokens.typography.sizes.xs, color: theme.colors.textTertiary, fontWeight: "500" },
});

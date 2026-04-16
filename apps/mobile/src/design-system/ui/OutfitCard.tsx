import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";

// 引入主题令牌
import {
  Colors,
  Typography as ThemeTypography,
  Spacing as ThemeSpacing,
  BorderRadius as ThemeBorderRadius,
  Shadows as ThemeShadows,
} from '../../design-system/theme';
import { useTheme } from "../../contexts/ThemeContext";
import { DesignTokens } from "../theme/tokens/design-tokens";

interface OutfitCardProps {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
  price?: number;
  onPress: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

/**
 * OutfitCard - 穿搭推荐卡片
 *
 * 设计特点：
 * - 大图展示 + 圆角设计
 * - 彩色标签系统（热门/推荐/新品）
 * - 收藏按钮（心形图标）
 * - 价格展示（可选）
 * - 入场动画 (FadeInUp)
 * - 季节色彩自适应：标签和高亮使用季节强调色
 */
export const OutfitCard: React.FC<OutfitCardProps> = ({
  id,
  image,
  title,
  subtitle,
  tag,
  tagColor,
  price,
  onPress,
  onFavorite,
  isFavorite = false,
}) => {
  const { seasonAccent } = useTheme();

  // 季节强调色优先，回退到品牌色
  const accentColor = seasonAccent?.accent ?? Colors.primary[500];
  const resolvedTagColor = tagColor ?? accentColor;

  return (
    <Animated.View entering={FadeInUp.duration(400).springify()}>
      <TouchableOpacity style={styles.card} onPress={() => onPress(id)} activeOpacity={0.8}>
        {/* 图片容器 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />

          {/* 标签 - 使用季节强调色 */}
          {tag && (
            <LinearGradient
              colors={[resolvedTagColor, resolvedTagColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.tag]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </LinearGradient>
          )}

          {/* 收藏按钮 */}
          {onFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => onFavorite(id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={20}
                color={isFavorite ? accentColor : DesignTokens.colors.backgrounds.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* 信息区域 */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {/* 价格 - 使用季节强调色 */}
          {price !== undefined && (
            <Text style={[styles.price, { color: accentColor }]}>¥{price.toFixed(2)}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
    backgroundColor: Colors.neutral.white,
    borderRadius: ThemeBorderRadius["2xl"],
    overflow: "hidden",
    ...ThemeShadows.md,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: 140,
    height: 180,
    resizeMode: "cover",
    backgroundColor: Colors.neutral[200],
  },
  tag: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: ThemeBorderRadius.xl,
  },
  tagText: {
    fontSize: ThemeTypography.sizes.xs,
    fontWeight: ThemeTypography.fontWeights.bold,
    color: DesignTokens.colors.backgrounds.primary,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontSize: ThemeTypography.sizes.base,
    fontWeight: ThemeTypography.fontWeights.semibold,
    color: Colors.neutral[900],
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: ThemeTypography.sizes.xs,
    color: Colors.neutral[500],
    textAlign: "center",
    marginBottom: 6,
  },
  price: {
    fontSize: ThemeTypography.sizes.sm,
    fontWeight: ThemeTypography.fontWeights.bold,
    textAlign: "center",
  },
});

export default OutfitCard;

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ViewStyle,
  TextStyle,
  DimensionValue,
} from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { Colors, Typography, Spacing, BorderRadius, Shadows, SpringConfigs } from '../../design-system/theme';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { Skeleton as SkeletonBase } from "../skeleton/Skeleton";
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type GradientColors = readonly [string, string, ...string[]];

/**
 * @deprecated 使用 primitives/Card 中的 Card 组件替代。此组件将在未来版本中移除。
 */
export interface GradientCardProps {
  children: React.ReactNode;
  gradient?: keyof typeof Colors.gradient;
  style?: ViewStyle;
  borderRadius?: number;
  padding?: number;
}

/** @deprecated 使用 primitives/Card 中的 Card 组件替代 */
export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  gradient = "primary",
  style,
  borderRadius = BorderRadius["2xl"],
  padding = Spacing[6],
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const gradientColors = Colors.gradient[gradient] as unknown as GradientColors;

  return (
    <LinearGradient
      colors={[...gradientColors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientCard, { borderRadius, padding }, style]}
    >
      {children}
    </LinearGradient>
  );
};

/** @deprecated 使用 primitives/Card 中的 Card (variant="glass") 替代 */
export interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: "light" | "dark";
}

/** @deprecated 使用 primitives/Card 中的 Card (variant="glass") 替代 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 80,
  tint = "light",
}) => {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={StyleSheet.flatten([styles.glassCard, style])}
    >
      <View style={styles.glassContent}>{children}</View>
    </BlurView>
  );
};

/** @deprecated 使用 ui/Button 替代 */
export interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  style?: ViewStyle;
}

/** @deprecated 使用 ui/Button 替代 */
export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  style,
}) => {
  const scaleAnim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.96, SpringConfigs.snappy);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, SpringConfigs.bouncy);
  };

  const sizeStyles = {
    sm: { height: DesignTokens.spacing[9], paddingHorizontal: Spacing[4] },
    md: { height: DesignTokens.spacing[11], paddingHorizontal: Spacing[5] },
    lg: { height: 52, paddingHorizontal: Spacing[6] },
    xl: { height: 60, paddingHorizontal: Spacing[8] },
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: Colors.primary[600],
    },
    secondary: {
      backgroundColor: Colors.neutral[100],
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: Colors.primary[500],
    },
    ghost: {
      backgroundColor: "transparent",
    },
    gradient: {
      backgroundColor: "transparent",
    },
  };

  const textStyles: Record<string, TextStyle> = {
    primary: { color: Colors.white },
    secondary: { color: Colors.neutral[800] },
    outline: { color: Colors.primary[600] },
    ghost: { color: Colors.primary[600] },
    gradient: { color: Colors.white },
  };

  const buttonContent = (
    <View style={styles.buttonContent}>
      {icon && iconPosition === "left" && <View style={styles.buttonIcon}>{icon}</View>}
      <Text style={[Typography.styles.button, textStyles[variant]]}>
        {loading ? "加载中..." : title}
      </Text>
      {icon && iconPosition === "right" && <View style={styles.buttonIcon}>{icon}</View>}
    </View>
  );

  if (variant === "gradient") {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <Animated.View style={animatedStyle}>
          <LinearGradient
            colors={[...Colors.gradient.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, sizeStyles[size], { borderRadius: BorderRadius.xl }]}
          >
            {buttonContent}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        sizeStyles[size],
        variantStyles[variant],
        { borderRadius: BorderRadius.xl },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Animated.View style={animatedStyle}>{buttonContent}</Animated.View>
    </TouchableOpacity>
  );
};

/** @deprecated 使用 ui/ProductGrid 中的 ProductCard 替代 */
export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

/** @deprecated 使用 ui/ProductGrid 中的 ProductCard 替代 */
export const ProductCard: React.FC<ProductCardProps> = ({
  name,
  price,
  originalPrice,
  image,
  brand,
  rating,
  reviewCount,
  tags,
  onPress,
  onFavorite,
  isFavorite = false,
}) => {
  const scaleAnim = useSharedValue(1);
  const favoriteAnim = useSharedValue(1);

  const scaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const favoriteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteAnim.value }],
  }));

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.97, SpringConfigs.snappy);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, SpringConfigs.bouncy);
  };

  const handleFavorite = () => {
    favoriteAnim.value = withSequence(
      withSpring(1.3, SpringConfigs.bouncy),
      withSpring(1, SpringConfigs.bouncy)
    );
    onFavorite?.();
  };

  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.95}
      style={styles.productCardContainer}
    >
      <Animated.View style={[styles.productCard, scaleAnimatedStyle]}>
        <View style={styles.productImageContainer}>
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productImageEmoji}>👗</Text>
          </View>
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          {onFavorite && (
            <TouchableOpacity
              onPress={handleFavorite}
              style={styles.favoriteButton}
              activeOpacity={0.7}
            >
              <Animated.View style={favoriteAnimatedStyle}>
                <Text style={styles.favoriteIcon}>{isFavorite ? "❤️" : "🤍"}</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.productInfo}>
          {brand && (
            <Text style={styles.productBrand} numberOfLines={1}>
              {brand}
            </Text>
          )}
          <Text style={styles.productName} numberOfLines={2}>
            {name}
          </Text>

          {rating !== undefined && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              {reviewCount !== undefined && <Text style={styles.reviewCount}>({reviewCount})</Text>}
            </View>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>¥{price}</Text>
            {originalPrice && <Text style={styles.originalPrice}>¥{originalPrice}</Text>}
          </View>

          {tags && tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

/** @deprecated 使用 primitives/Card 中的 Card (variant="gradient") 替代 */
export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  gradient?: keyof typeof Colors.gradient;
  onPress: () => void;
}

/** @deprecated 使用 primitives/Card 中的 Card (variant="gradient") 替代 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  gradient = "primary",
  onPress,
}) => {
  const scaleAnim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.95, SpringConfigs.snappy);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1, SpringConfigs.bouncy);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.featureCard, animatedStyle]}>
        <LinearGradient
          colors={[...Colors.gradient[gradient]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featureCardGradient}
        >
          <View style={styles.featureIconContainer}>
            <Text style={styles.featureIcon}>{icon}</Text>
          </View>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription} numberOfLines={2}>
            {description}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

/** @deprecated 在业务页面中直接实现 SectionHeader */
export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}

/** @deprecated 在业务页面中直接实现 SectionHeader */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>{action.text}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** @deprecated 使用 skeleton/Skeleton 替代 */
export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton - 委托至 skeleton/Skeleton.tsx 的统一实现
 * 保留此导出以维持向后兼容
 *
 * @deprecated 使用 skeleton/Skeleton 替代
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.md,
  style,
}) => {
  return <SkeletonBase width={width} height={height} borderRadius={borderRadius} style={style} />;
};

/** @deprecated 使用 ui/Badge 替代 */
export interface BadgeProps {
  text: string;
  variant?: "primary" | "success" | "warning" | "error" | "neutral";
  size?: "sm" | "md" | "lg";
}

/** @deprecated 使用 ui/Badge 替代 */
export const Badge: React.FC<BadgeProps> = ({ text, variant = "primary", size = "md" }) => {
  const variantStyles: Record<string, { bg: string; text: string }> = {
    primary: { bg: Colors.primary[100], text: Colors.primary[700] },
    success: { bg: colors.successLight, text: colors.success },
    warning: { bg: colors.warningLight, text: colors.warning },
    error: { bg: colors.errorLight, text: colors.error },
    neutral: { bg: Colors.neutral[100], text: Colors.neutral[700] },
  };

  const sizeStyles = {
    sm: {
      paddingHorizontal: Spacing[2],
      paddingVertical: Spacing[1],
      fontSize: DesignTokens.typography.sizes.xs,
    },
    md: {
      paddingHorizontal: Spacing[3],
      paddingVertical: Spacing[1.5],
      fontSize: DesignTokens.typography.sizes.sm,
    },
    lg: {
      paddingHorizontal: Spacing[4],
      paddingVertical: Spacing[2],
      fontSize: DesignTokens.typography.sizes.base,
    },
  };

  const { bg, text: textColor } = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: textColor, fontSize: sizeStyle.fontSize }]}>
        {text}
      </Text>
    </View>
  );
};

/** @deprecated 使用业务页面中的头像组件替代 */
export interface AvatarProps {
  source?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
}

/** @deprecated 使用业务页面中的头像组件替代 */
export const Avatar: React.FC<AvatarProps> = ({ name, size = "md", online }) => {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
  };

  const avatarSize = sizeMap[size];
  const initial = name?.charAt(0)?.toUpperCase() || "?";

  return (
    <View style={[styles.avatar, { width: avatarSize, height: avatarSize }]}>
      <LinearGradient colors={[...Colors.gradient.primary]} style={styles.avatarGradient}>
        <Text style={[styles.avatarText, { fontSize: avatarSize * 0.4 }]}>{initial}</Text>
      </LinearGradient>
      {online !== undefined && (
        <View
          style={[
            styles.onlineIndicator,
            {
              backgroundColor: online ? colors.success : Colors.neutral[400],
              width: avatarSize * 0.25,
              height: avatarSize * 0.25,
              borderRadius: avatarSize * 0.125,
            },
          ]}
        />
      )}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  gradientCard: {
    overflow: "hidden",
  },
  glassCard: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  glassContent: {
    padding: Spacing[4],
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginHorizontal: Spacing[2],
  },
  fullWidth: {
    width: "100%",
  },
  productCardContainer: {
    width: (SCREEN_WIDTH - Spacing[5] * 2 - Spacing[4]) / 2,
    marginBottom: Spacing[4],
  },
  productCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.md,
  },
  productImageContainer: {
    aspectRatio: 1,
    backgroundColor: Colors.neutral[50],
    position: "relative",
  },
  productImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  productImageEmoji: {
    fontSize: DesignTokens.typography.sizes['5xl'],
  },
  discountBadge: {
    position: "absolute",
    top: Spacing[2],
    left: Spacing[2],
    backgroundColor: colors.error,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: Colors.white,
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "700",
  },
  favoriteButton: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: DesignTokens.typography.sizes.md,
  },
  productInfo: {
    padding: Spacing[3],
  },
  productBrand: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[500],
    fontWeight: "500",
    marginBottom: Spacing[1],
  },
  productName: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[900],
    fontWeight: "600",
    marginBottom: Spacing[2],
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  ratingStar: {
    fontSize: DesignTokens.typography.sizes.sm,
    marginRight: Spacing[1],
  },
  ratingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[700],
    fontWeight: "600",
  },
  reviewCount: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[500],
    marginLeft: Spacing[1],
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  productPrice: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.primary,
    fontWeight: "700",
  },
  originalPrice: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[400],
    textDecorationLine: "line-through",
    marginLeft: Spacing[2],
  },
  tagsContainer: {
    flexDirection: "row",
    marginTop: Spacing[2],
    gap: Spacing[1],
  },
  tag: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[0.5],
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.primary[600],
    fontWeight: "500",
  },
  featureCard: {
    width: (SCREEN_WIDTH - Spacing[5] * 2 - Spacing[4]) / 2,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    ...Shadows.lg,
  },
  featureCardGradient: {
    padding: Spacing[4],
    alignItems: "center",
  },
  featureIconContainer: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[3],
  },
  featureIcon: {
    fontSize: DesignTokens.typography.sizes['2xl'],
  },
  featureTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.white,
    fontWeight: "700",
    marginBottom: Spacing[1],
    textAlign: "center",
  },
  featureDescription: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[4],
    marginTop: Spacing[6],
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    color: Colors.neutral[900],
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
    marginTop: Spacing[1],
  },
  sectionAction: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.primary[600],
    fontWeight: "600",
  },
  badge: {
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontWeight: "600",
  },
  avatar: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    position: "relative",
  },
  avatarGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "700",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: Colors.white,
  },
}))

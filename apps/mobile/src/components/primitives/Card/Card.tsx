import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  ViewStyle,
  Platform,
} from "react-native";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { BlurView } from "expo-blur";
import * as Haptics from '@/src/polyfills/expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows } from "../../../theme";
import { SpringConfigs, Duration } from "../../../theme/tokens/animations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type CardVariant =
  | "elevated"
  | "outlined"
  | "filled"
  | "glass"
  | "gradient";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  gradientColors?: string[];
  glassIntensity?: number;
  hapticFeedback?: boolean;
  enable3DEffect?: boolean;
}

const paddingConfig: Record<CardPadding, number> = {
  none: 0,
  sm: Spacing[3],
  md: Spacing[4],
  lg: Spacing[6],
};

export const Card: React.FC<CardProps> = ({
  variant = "elevated",
  padding = "md",
  interactive = false,
  onPress,
  onLongPress,
  children,
  style,
  gradientColors,
  glassIntensity = 80,
  hapticFeedback = true,
  enable3DEffect = false,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateXAnim = React.useRef(new Animated.Value(0)).current;
  const rotateYAnim = React.useRef(new Animated.Value(0)).current;
  const shadowAnim = React.useRef(
    new Animated.Value(variant === "elevated" ? 1 : 0),
  ).current;

  const handlePressIn = React.useCallback(
    (event: any) => {
      if (!interactive) return;

      if (hapticFeedback && Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          useNativeDriver: true,
          ...SpringConfigs.snappy,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0.5,
          duration: Duration.fast,
          useNativeDriver: true,
        }),
      ]).start();

      if (enable3DEffect) {
        const { locationX, locationY } = event.nativeEvent;
        const cardWidth = SCREEN_WIDTH - Spacing[10];
        const cardHeight = 200;

        const rotateY = (locationX / cardWidth - 0.5) * 10;
        const rotateX = (locationY / cardHeight - 0.5) * -10;

        Animated.parallel([
          Animated.spring(rotateXAnim, {
            toValue: rotateX,
            useNativeDriver: true,
            ...SpringConfigs.gentle,
          }),
          Animated.spring(rotateYAnim, {
            toValue: rotateY,
            useNativeDriver: true,
            ...SpringConfigs.gentle,
          }),
        ]).start();
      }
    },
    [
      interactive,
      hapticFeedback,
      scaleAnim,
      shadowAnim,
      rotateXAnim,
      rotateYAnim,
      enable3DEffect,
    ],
  );

  const handlePressOut = React.useCallback(() => {
    if (!interactive) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...SpringConfigs.bouncy,
      }),
      Animated.timing(shadowAnim, {
        toValue: variant === "elevated" ? 1 : 0,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
      Animated.spring(rotateXAnim, {
        toValue: 0,
        useNativeDriver: true,
        ...SpringConfigs.gentle,
      }),
      Animated.spring(rotateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        ...SpringConfigs.gentle,
      }),
    ]).start();
  }, [interactive, scaleAnim, shadowAnim, rotateXAnim, rotateYAnim, variant]);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: Colors.white,
          ...Shadows.md,
        };
      case "outlined":
        return {
          backgroundColor: Colors.white,
          borderWidth: 1,
          borderColor: Colors.neutral[200],
        };
      case "filled":
        return {
          backgroundColor: Colors.neutral[50],
        };
      case "glass":
        return {
          backgroundColor: `rgba(255, 255, 255, ${glassIntensity / 100})`,
        };
      case "gradient":
        return {};
      default:
        return {};
    }
  };

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.xl,
    padding: paddingConfig[padding],
    overflow: "hidden",
    ...getVariantStyle(),
  };

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      { perspective: 1000 },
      {
        rotateX: rotateXAnim.interpolate({
          inputRange: [-10, 10],
          outputRange: ["-10deg", "10deg"],
        }),
      },
      {
        rotateY: rotateYAnim.interpolate({
          inputRange: [-10, 10],
          outputRange: ["-10deg", "10deg"],
        }),
      },
    ],
  };

  const renderContent = () => {
    if (variant === "gradient") {
      const colors = gradientColors || Colors.gradient.hero;
      return (
        <LinearGradient
          colors={colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={containerStyle}
        >
          {children}
        </LinearGradient>
      );
    }

    if (variant === "glass") {
      return (
        <BlurView
          intensity={glassIntensity}
          tint="light"
          style={containerStyle}
        >
          {children}
        </BlurView>
      );
    }

    return <View style={containerStyle}>{children}</View>;
  };

  if (!interactive || !onPress) {
    return <View style={[containerStyle, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      style={{ overflow: "visible" }}
    >
      <Animated.View style={[animatedStyle, style]}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
};

export interface ProductCardProps {
  image: string;
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  style?: ViewStyle;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  image,
  title,
  brand,
  price,
  originalPrice,
  rating,
  onPress,
  onFavoritePress,
  isFavorite = false,
  style,
}) => {
  const favoriteScale = React.useRef(new Animated.Value(1)).current;

  const handleFavoritePress = () => {
    Animated.sequence([
      Animated.spring(favoriteScale, {
        toValue: 1.3,
        useNativeDriver: true,
        ...SpringConfigs.bouncy,
      }),
      Animated.spring(favoriteScale, {
        toValue: 1,
        useNativeDriver: true,
        ...SpringConfigs.bouncy,
      }),
    ]).start();

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(
        isFavorite
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
    }

    onFavoritePress?.();
  };

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <Card
      interactive
      onPress={onPress}
      padding="none"
      style={StyleSheet.flatten([{ width: (SCREEN_WIDTH - 48) / 2 }, style])}
    >
      <View style={styles.productImageContainer}>
        <Animated.Image
          source={{ uri: image }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
        <Pressable onPress={handleFavoritePress} style={styles.favoriteButton}>
          <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
            <Text style={styles.favoriteIcon}>{isFavorite ? "♥" : "♡"}</Text>
          </Animated.View>
        </Pressable>
      </View>
      <View style={styles.productInfo}>
        {brand && <Text style={styles.brandText}>{brand}</Text>}
        <Text style={styles.titleText} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>¥{price}</Text>
          {originalPrice && (
            <Text style={styles.originalPriceText}>¥{originalPrice}</Text>
          )}
        </View>
        {rating !== undefined && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingIcon}>★</Text>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  productImageContainer: {
    aspectRatio: 3 / 4,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: Spacing[2],
    left: Spacing[2],
    backgroundColor: Colors.error[500],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  favoriteButton: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: {
    fontSize: 18,
    color: Colors.error[500],
  },
  productInfo: {
    padding: Spacing[3],
    overflow: "hidden",
  },
  brandText: {
    fontSize: 11,
    color: Colors.neutral[500],
    marginBottom: Spacing[1],
  },
  titleText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.neutral[900],
    marginBottom: Spacing[2],
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.neutral[900],
  },
  originalPriceText: {
    fontSize: 12,
    color: Colors.neutral[400],
    textDecorationLine: "line-through",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing[1],
    gap: Spacing[1],
  },
  ratingIcon: {
    fontSize: 12,
    color: Colors.amber[500],
  },
  ratingText: {
    fontSize: 12,
    color: Colors.neutral[600],
  },
});

export default Card;

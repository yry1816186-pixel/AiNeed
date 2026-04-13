import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  Animation,
} from "../../theme";

export { ThemeProvider, lightTheme, darkTheme } from "./PaperThemeProvider";

export { Button as XunOButton } from "./Button";
export type { ButtonProps as XunOButtonProps, ButtonVariant, ButtonSize } from "./Button";
export { Input as XunOInput, SearchInput as XunOSearchInput } from "./Input";
export type { InputProps as XunOInputProps, SearchInputProps, InputVariant, InputSize } from "./Input";
export { Card as XunOCard } from "./Card";
export type { CardProps as XunOCardProps, CardVariant, CardPadding } from "./Card";
export { Badge as XunOBadge, SeasonBadge } from "./Badge";
export type { BadgeProps as XunOBadgeProps, SeasonBadgeProps, BadgeVariant, BadgeSize, ColorSeasonKey } from "./Badge";
export { Avatar, AvatarGroup } from "./Avatar";
export type { AvatarProps, AvatarSize } from "./Avatar";
export { LoadingSpinner, InlineSpinner } from "./LoadingSpinner";
export type { LoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner";
export { Rating, RatingBadge } from "./Rating";
export type { RatingProps, RatingBadgeProps } from "./Rating";
export { ProductGrid, HorizontalProductList, ProductCard } from "./ProductGrid";
export type { Product } from "./ProductGrid";
export {
  ProductBottomSheet,
  FilterBottomSheet,
  ShareBottomSheet,
  BottomSheetModalProvider,
} from "./BottomSheets";
export { ShareButton, ShareProduct, ShareToSocial } from "./Share";
export {
  Skeleton,
  CircleSkeleton,
  TextSkeleton,
  CardSkeleton,
} from "./Skeleton";
export type { SkeletonProps, CircleSkeletonProps, TextSkeletonProps, CardSkeletonProps } from "./Skeleton";

export {
  GradientCard,
  GlassCard,
  ModernButton,
  ProductCard as ModernProductCard,
  FeatureCard,
  SectionHeader,
  Skeleton as AnimatedSkeleton,
  Badge as ModernBadge,
  Avatar as ModernAvatar,
} from "./ModernComponents";
export type {
  GradientCardProps,
  GlassCardProps,
  ModernButtonProps,
  ProductCardProps,
  FeatureCardProps,
  SectionHeaderProps,
  SkeletonProps as AnimatedSkeletonProps,
  BadgeProps as ModernBadgeProps,
  AvatarProps as ModernAvatarProps,
} from "./ModernComponents";

export {
  LiquidGlassCard,
  MagneticButton as FluidMagneticButton,
  ParallaxScrollView,
  FloatingElement,
  GlowText,
  ParticleEffect,
  RippleEffect as FluidRippleEffect,
  SkeletonLoader,
  StaggeredList,
} from "./FluidAnimations";
export type {
  LiquidGlassCardProps,
  MagneticButtonProps as FluidMagneticButtonProps,
  ParallaxScrollViewProps,
  FloatingElementProps,
  GlowTextProps,
  ParticleEffectProps,
  RippleEffectProps as FluidRippleEffectProps,
  SkeletonLoaderProps,
  StaggeredListProps,
} from "./FluidAnimations";

export {
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  FlipTransition,
  ModalTransition,
  BottomSheetTransition,
  PageTransition,
  StaggerTransition,
  CrossFadeTransition,
  HeroTransition,
  TransitionProvider,
  useTransition,
} from "../transitions/PageTransitions";

export {
  RippleEffect,
  MagneticButton,
  BounceCard,
  SwipeAction,
  PullToRefresh,
  LongPressDrag,
  PinchZoom,
} from "../interactions/MicroInteractions";

export {
  Skeleton as LoadingSkeleton,
  SkeletonCard,
  SkeletonList,
  ProgressIndicator,
  CircularProgress,
  LoadingDots,
  BrandLoader,
  WaveLoader,
  PulseLoader,
  OrbitLoader,
} from "../loading/LoadingStates";
export type {
  SkeletonProps as LoadingSkeletonProps,
  SkeletonCardProps,
  SkeletonListProps,
  ProgressIndicatorProps,
  CircularProgressProps,
  LoadingDotsProps,
  BrandLoaderProps,
  WaveLoaderProps,
  PulseLoaderProps,
  OrbitLoaderProps,
} from "../loading/LoadingStates";

export {
  ThemeProvider as AdvancedThemeProvider,
  useTheme,
  ThemedView,
  ThemedText,
  ThemeSwitch,
  ThemeSettingsSheet,
} from "../theme/ThemeSystem";

export {
  useParallax,
  useLiquidGlass,
  use3DCard,
  useMagneticButton as useMagneticButtonAnimation,
  useShimmer,
  usePulse,
  useFloating,
  useGlow,
  useRipple,
  useStaggeredAnimation,
  useScrollProgress,
  useHapticFeedback,
  useSkeletonAnimation,
  useBounce,
  useFlip,
  useTypewriter,
  useCountUp,
} from "../../hooks/useAdvancedAnimations";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "soft";
  size?: "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
    md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
    lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing["2xl"] },
    xl: { paddingVertical: Spacing.xl, paddingHorizontal: Spacing["3xl"] },
  };

  const textSizeStyles: Record<string, TextStyle> = {
    sm: Typography.body.sm,
    md: Typography.body.md,
    lg: Typography.body.lg,
    xl: Typography.body.lg,
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: Colors.primary[500],
      ...Shadows.md,
    },
    secondary: {
      backgroundColor: Colors.neutral[800],
      ...Shadows.md,
    },
    accent: {
      backgroundColor: Colors.accent[500],
      ...Shadows.md,
    },
    outline: {
      backgroundColor: Colors.neutral[0],
      borderWidth: 2,
      borderColor: Colors.primary[500],
    },
    ghost: {
      backgroundColor: "transparent",
    },
    soft: {
      backgroundColor: Colors.primary[50],
    },
  };

  const textColorStyles: Record<string, TextStyle> = {
    primary: { color: Colors.neutral[0], fontWeight: "700" },
    secondary: { color: Colors.neutral[0], fontWeight: "700" },
    accent: { color: Colors.neutral[0], fontWeight: "700" },
    outline: { color: Colors.primary[600], fontWeight: "600" },
    ghost: { color: Colors.primary[600], fontWeight: "600" },
    soft: { color: Colors.primary[700], fontWeight: "600" },
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.buttonBase,
          sizeStyles[size],
          variantStyles[variant],
          disabled && { opacity: 0.5 },
          fullWidth && { width: "100%" },
          style,
        ]}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator
            color={
              variant === "outline" || variant === "ghost" || variant === "soft"
                ? Colors.primary[500]
                : Colors.neutral[0]
            }
          />
        ) : (
          <>
            {icon}
            <Text
              style={[
                textSizeStyles[size],
                textColorStyles[variant],
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: "elevated" | "outlined" | "flat" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  style,
  onPress,
  variant = "elevated",
  padding = "md",
}: CardProps) {
  const cardStyles: Record<string, ViewStyle> = {
    elevated: {
      backgroundColor: Colors.neutral[0],
      borderRadius: BorderRadius.xl,
      ...Shadows.lg,
    },
    outlined: {
      backgroundColor: Colors.neutral[0],
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: Colors.neutral[200],
    },
    flat: {
      backgroundColor: Colors.neutral[0],
      borderRadius: BorderRadius.xl,
    },
    filled: {
      backgroundColor: Colors.neutral[50],
      borderRadius: BorderRadius.xl,
    },
  };

  const paddingStyles: Record<string, ViewStyle> = {
    none: { padding: 0 },
    sm: { padding: Spacing.sm },
    md: { padding: Spacing.lg },
    lg: { padding: Spacing.xl },
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyles[variant], paddingStyles[padding], style]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyles[variant], paddingStyles[padding], style]}>
      {children}
    </View>
  );
}

interface BadgeProps {
  text: string;
  variant?: "primary" | "accent" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
}

export function Badge({ text, variant = "primary", size = "sm" }: BadgeProps) {
  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: Colors.primary[100] },
    accent: { backgroundColor: Colors.accent[100] },
    success: { backgroundColor: Colors.success[100] },
    warning: { backgroundColor: Colors.warning[100] },
    error: { backgroundColor: Colors.error[100] },
  };

  const textColors: Record<string, TextStyle> = {
    primary: { color: Colors.primary[700] },
    accent: { color: Colors.accent[700] },
    success: { color: Colors.success[700] },
    warning: { color: Colors.warning[700] },
    error: { color: Colors.error[700] },
  };

  const sizeStyles: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
    md: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    lg: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  };

  return (
    <View style={[styles.badgeBase, variantStyles[variant], sizeStyles[size]]}>
      <Text
        style={[
          Typography.caption.sm,
          textColors[variant],
          { fontWeight: "600" },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

interface TagProps {
  text: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: "primary" | "accent" | "success" | "warning" | "error";
}

export function Tag({
  text,
  selected = false,
  onPress,
  variant = "primary",
}: TagProps) {
  const variantColors: Record<string, string> = {
    primary: Colors.primary[500],
    accent: Colors.accent[500],
    success: Colors.success[500],
    warning: Colors.warning[500],
    error: Colors.error[500],
  };

  const color = variantColors[variant];
  const bgColor = selected ? color : Colors.neutral[50];
  const textColor = selected ? Colors.neutral[0] : Colors.neutral[600];
  const borderColor = selected ? color : Colors.neutral[200];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tagBase,
        {
          backgroundColor: bgColor,
          borderWidth: selected ? 0 : 1,
          borderColor,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          Typography.body.sm,
          { color: textColor, fontWeight: selected ? "600" : "500" },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

interface LoadingProps {
  size?: "small" | "large";
  color?: string;
}

export function Loading({
  size = "large",
  color = Colors.primary[500],
}: LoadingProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing["3xl"],
      }}
    >
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: {
    text: string;
    onPress: () => void;
  };
}

export function EmptyState({
  icon = "shirt-outline",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing["5xl"],
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: Colors.neutral[100],
          justifyContent: "center",
          alignItems: "center",
          marginBottom: Spacing.xl,
        }}
      >
        <Ionicons name={icon} size={36} color={Colors.neutral[400]} />
      </View>
      <Text
        style={[
          Typography.heading.lg,
          {
            color: Colors.neutral[800],
            marginBottom: Spacing.sm,
            textAlign: "center",
          },
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={[
            Typography.body.md,
            {
              color: Colors.neutral[500],
              textAlign: "center",
              marginBottom: Spacing.xl,
            },
          ]}
        >
          {description}
        </Text>
      )}
      {action && (
        <Button
          title={action.text}
          onPress={action.onPress}
          size="md"
          variant="soft"
        />
      )}
    </View>
  );
}

interface DividerProps {
  style?: ViewStyle;
  variant?: "solid" | "dashed";
}

export function Divider({ style, variant = "solid" }: DividerProps) {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor:
            variant === "solid" ? Colors.neutral[200] : "transparent",
          marginVertical: Spacing.lg,
          borderStyle: variant === "dashed" ? "dashed" : "solid",
          borderTopWidth: variant === "dashed" ? 1 : 0,
          borderTopColor: Colors.neutral[200],
        },
        style,
      ]}
    />
  );
}

interface RowProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gap?: number;
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  justify?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around";
}

export function Row({
  children,
  style,
  gap = Spacing.sm,
  align = "center",
  justify = "flex-start",
}: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: align,
          justifyContent: justify,
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: {
    text: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function Section({ title, children, action, style }: SectionProps) {
  return (
    <View style={[{ marginBottom: Spacing["2xl"] }, style]}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: Spacing.lg,
          paddingHorizontal: Spacing.xl,
        }}
      >
        <Text style={[Typography.heading.lg, { color: Colors.neutral[900] }]}>
          {title}
        </Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
            <Text
              style={[
                Typography.body.md,
                { color: Colors.primary[600], fontWeight: "600" },
              ]}
            >
              {action.text}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

interface IconCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "success" | "warning";
  style?: ViewStyle;
}

export function IconCard({
  icon,
  title,
  description,
  onPress,
  variant = "primary",
  style,
}: IconCardProps) {
  const bgColors: Record<string, string> = {
    primary: Colors.primary[100],
    accent: Colors.accent[100],
    success: Colors.success[100],
    warning: Colors.warning[100],
  };

  const iconColors: Record<string, string> = {
    primary: Colors.primary[600],
    accent: Colors.accent[600],
    success: Colors.success[600],
    warning: Colors.warning[600],
  };

  return (
    <TouchableOpacity
      style={[styles.iconCard, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View
        style={[styles.iconWrapper, { backgroundColor: bgColors[variant] }]}
      >
        <Ionicons name={icon} size={28} color={iconColors[variant]} />
      </View>
      <Text style={[Typography.heading.sm, styles.iconTitle]}>{title}</Text>
      {description && (
        <Text style={[Typography.body.sm, styles.iconDesc]}>{description}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  badgeBase: {
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  tagBase: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  iconCard: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    ...Shadows.md,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  iconTitle: {
    color: Colors.neutral[800],
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  iconDesc: {
    color: Colors.neutral[500],
    textAlign: "center",
  },
});

// UI Component Index - Single source of truth
// All components are re-exported from their dedicated files.
// No inline implementations allowed in this file.
// Overlapping components with primitives/ are re-exported from primitives/ to avoid duplication.

// ─── Core UI Components (from primitives/) ────────────────────────────
export { ThemeProvider, lightTheme, darkTheme } from "./PaperThemeProvider";

export { Button, IconButton } from "../../design-system/primitives/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "../../design-system/primitives/Button";

export { Input, SearchInput } from "../../design-system/primitives/Input";
export type { InputProps, SearchInputProps, InputVariant, InputSize } from "../../design-system/primitives/Input";

export { Card, ProductCard } from "../../design-system/primitives/Card";
export type { CardProps, CardVariant, CardPadding, ProductCardProps } from "../../design-system/primitives/Card";

export {
  EmptyState,
  EmptyCart,
  EmptyFavorites,
  EmptyOrders,
  EmptySearch,
  EmptyNotifications,
  EmptyWardrobe,
  EmptyRecommendations,
  EmptyPosts,
  EmptyGeneric,
} from "../../design-system/primitives/EmptyState";

export { Badge, SeasonBadge } from "./Badge";
export type {
  BadgeProps,
  SeasonBadgeProps,
  BadgeVariant,
  BadgeSize,
  ColorSeasonKey,
} from "./Badge";

export { Avatar, AvatarGroup } from "./Avatar";
export type { AvatarProps, AvatarSize } from "./Avatar";

export { LoadingSpinner, InlineSpinner } from "./LoadingSpinner";
export type { LoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner";

// @deprecated Use `LoadingSpinner` instead
export { LoadingSpinner as Loading } from "./LoadingSpinner";

export { Rating, RatingBadge } from "./Rating";
export type { RatingProps, RatingBadgeProps } from "./Rating";

export { ProductGrid, HorizontalProductList } from "./ProductGrid";
// @deprecated Use `ProductCard` from `../../design-system/primitives/Card` instead
export { ProductCard as ProductGridCard } from "./ProductGrid";
export type { Product } from "./ProductGrid";

export {
  ProductBottomSheet,
  FilterBottomSheet,
  ShareBottomSheet,
  BottomSheetModalProvider,
} from "./BottomSheets";

export { ShareButton, ShareProduct, ShareToSocial } from "./Share";

export { Skeleton, CircleSkeleton, TextSkeleton, CardSkeleton } from "./Skeleton";
export type {
  SkeletonProps,
  CircleSkeletonProps,
  TextSkeletonProps,
  CardSkeletonProps,
} from "./Skeleton";

export { Tag } from "./Tag";
export type { TagProps } from "./Tag";

export { Divider } from "./Divider";
export type { DividerProps } from "./Divider";

export { Row } from "./Row";
export type { RowProps } from "./Row";

export { Section } from "./Section";
export type { SectionProps } from "./Section";

export { IconCard } from "./IconCard";
export type { IconCardProps } from "./IconCard";

// ─── Modern Components ────────────────────────────────────────────────
export {
  GradientCard,
  GlassCard,
  ModernButton,
  FeatureCard,
  SectionHeader,
} from "./ModernComponents";
// @deprecated Use `ProductCard` from `../../design-system/primitives/Card` instead
export { ProductCard as ModernProductCard } from "./ModernComponents";
// @deprecated Use `Skeleton` from `./Skeleton` instead
export { Skeleton as AnimatedSkeleton } from "./ModernComponents";
// @deprecated Use `Badge` from `./Badge` instead
export { Badge as ModernBadge } from "./ModernComponents";
// @deprecated Use `Avatar` from `./Avatar` instead
export { Avatar as ModernAvatar } from "./ModernComponents";
export type {
  GradientCardProps,
  GlassCardProps,
  ModernButtonProps,
  FeatureCardProps,
  SectionHeaderProps,
} from "./ModernComponents";
// @deprecated Use `ProductCardProps` from `../../design-system/primitives/Card` instead
export type { ProductCardProps as ModernProductCardProps } from "./ModernComponents";
// @deprecated Use `SkeletonProps` from `./Skeleton` instead
export type { SkeletonProps as AnimatedSkeletonProps } from "./ModernComponents";
// @deprecated Use `BadgeProps` from `./Badge` instead
export type { BadgeProps as ModernBadgeProps } from "./ModernComponents";
// @deprecated Use `AvatarProps` from `./Avatar` instead
export type { AvatarProps as ModernAvatarProps } from "./ModernComponents";

// ─── Fluid Animations ─────────────────────────────────────────────────
export {
  LiquidGlassCard,
  ParallaxScrollView,
  FloatingElement,
  GlowText,
  ParticleEffect,
  SkeletonLoader,
  StaggeredList,
} from "./FluidAnimations";
// @deprecated Use `MagneticButton` from `../interactions/MicroInteractions` instead
export { MagneticButton as FluidMagneticButton } from "./FluidAnimations";
// @deprecated Use `RippleEffect` from `../interactions/MicroInteractions` instead
export { RippleEffect as FluidRippleEffect } from "./FluidAnimations";
export type {
  LiquidGlassCardProps,
  ParallaxScrollViewProps,
  FloatingElementProps,
  GlowTextProps,
  ParticleEffectProps,
  SkeletonLoaderProps,
  StaggeredListProps,
} from "./FluidAnimations";
// @deprecated Use `MagneticButtonProps` from `../interactions/MicroInteractions` instead
export type { MagneticButtonProps as FluidMagneticButtonProps } from "./FluidAnimations";
// @deprecated Use `RippleEffectProps` from `../interactions/MicroInteractions` instead
export type { RippleEffectProps as FluidRippleEffectProps } from "./FluidAnimations";

// ─── Page Transitions ─────────────────────────────────────────────────
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

// ─── Micro Interactions ───────────────────────────────────────────────
export {
  RippleEffect,
  MagneticButton,
  BounceCard,
  SwipeAction,
  PullToRefresh,
  LongPressDrag,
  PinchZoom,
} from "../interactions/MicroInteractions";

// ─── Loading States ───────────────────────────────────────────────────
export {
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
// @deprecated Use `Skeleton` from `./Skeleton` instead
export { Skeleton as LoadingSkeleton } from "../loading/LoadingStates";
export type {
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
// @deprecated Use `SkeletonProps` from `./Skeleton` instead
export type { SkeletonProps as LoadingSkeletonProps } from "../loading/LoadingStates";

// ─── Theme System ─────────────────────────────────────────────────────
// @deprecated ThemeSystem 组件已迁移至消费统一 ThemeContext。
// 新代码请直接使用：
//   - ThemeProvider / useTheme 来自 `../../contexts/ThemeContext`
//   - PaperThemeProvider 来自 `./PaperThemeProvider`
export {
  useTheme,
  ThemedView,
  ThemedText,
  ThemeSwitch,
  ThemeSettingsSheet,
} from "../theme/ThemeSystem";
// @deprecated 使用 `ThemeProvider` from `../../contexts/ThemeContext` 代替
export { ThemeProvider as AdvancedThemeProvider } from "../theme/ThemeSystem";

// ─── Animation Hooks ──────────────────────────────────────────────────
export {
  useParallax,
  useLiquidGlass,
  use3DCard,
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
// @deprecated Use `useMagneticButton` instead
export { useMagneticButton as useMagneticButtonAnimation } from "../../hooks/useAdvancedAnimations";

// UI Component Index - Single source of truth
// All components are re-exported from their dedicated files.
// No inline implementations allowed in this file.
// Overlapping components with primitives/ are re-exported from primitives/ to avoid duplication.

// ─── Core UI Components (from primitives/) ────────────────────────────
export { ThemeProvider, lightTheme, darkTheme } from "./PaperThemeProvider";

export { Button, IconButton } from "../primitives/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "../primitives/Button";

export { Input, SearchInput } from "../primitives/Input";
export type { InputProps, SearchInputProps, InputVariant, InputSize } from "../primitives/Input";

export { Card, ProductCard } from "../primitives/Card";
export type { CardProps, CardVariant, CardPadding, ProductCardProps } from "../primitives/Card";

export { EmptyState, EmptyCart, EmptyFavorites, EmptyOrders, EmptySearch, EmptyNotifications, EmptyWardrobe } from "../primitives/EmptyState";

export { Badge, SeasonBadge } from "./Badge";
export type { BadgeProps, SeasonBadgeProps, BadgeVariant, BadgeSize, ColorSeasonKey } from "./Badge";

export { Avatar, AvatarGroup } from "./Avatar";
export type { AvatarProps, AvatarSize } from "./Avatar";

export { LoadingSpinner, InlineSpinner } from "./LoadingSpinner";
export type { LoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner";

// LoadingSpinner aliased as Loading for convenience
export { LoadingSpinner as Loading } from "./LoadingSpinner";

export { Rating, RatingBadge } from "./Rating";
export type { RatingProps, RatingBadgeProps } from "./Rating";

export { ProductGrid, HorizontalProductList } from "./ProductGrid";
export { ProductCard as ProductGridCard } from "./ProductGrid";
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

// ─── Fluid Animations ─────────────────────────────────────────────────
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

// ─── Theme System ─────────────────────────────────────────────────────
export {
  ThemeProvider as AdvancedThemeProvider,
  useTheme,
  ThemedView,
  ThemedText,
  ThemeSwitch,
  ThemeSettingsSheet,
} from "../theme/ThemeSystem";

// ─── Animation Hooks ──────────────────────────────────────────────────
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

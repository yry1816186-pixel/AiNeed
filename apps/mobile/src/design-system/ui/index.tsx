// UI Component Index - Single source of truth
// All components are re-exported from their dedicated files.
// No inline implementations allowed in this file.
// Overlapping components with primitives/ are re-exported from primitives/ to avoid duplication.

// ─── Core UI Components (from primitives/) ────────────────────────────
export { ThemeProvider, lightTheme, darkTheme } from "./PaperThemeProvider";

export { Button, IconButton } from "../../design-system/primitives/Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "../../design-system/primitives/Button";

export { Input, SearchInput } from "../../design-system/primitives/Input";
export type {
  InputProps,
  SearchInputProps,
  InputVariant,
  InputSize,
} from "../../design-system/primitives/Input";

export { Card, ProductCard } from "../../design-system/primitives/Card";
export type {
  CardProps,
  CardVariant,
  CardPadding,
  ProductCardProps,
} from "../../design-system/primitives/Card";

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

export { YiyiAvatar } from "./YiyiAvatar";
export type { YiyiAvatarProps, YiyiAvatarSize } from "./YiyiAvatar";
export { SimilarityHeatmap } from "./SimilarityHeatmap";
export type { SimilarityHeatmapProps } from "./SimilarityHeatmap";

export { LoadingSpinner, InlineSpinner } from "./LoadingSpinner";
export type { LoadingSpinnerProps, SpinnerSize } from "./LoadingSpinner";

export { Rating, RatingBadge } from "./Rating";
export type { RatingProps, RatingBadgeProps } from "./Rating";

export { ProductGrid, HorizontalProductList } from "./ProductGrid";
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

export { MatchRadarChart } from "./MatchRadarChart";
export type { MatchRadarChartProps, MatchScores } from "./MatchRadarChart";

// ─── Modern Components ────────────────────────────────────────────────
export {
  GradientCard,
  GlassCard,
  ModernButton,
  FeatureCard,
  SectionHeader,
} from "./ModernComponents";
export type {
  GradientCardProps,
  GlassCardProps,
  ModernButtonProps,
  FeatureCardProps,
  SectionHeaderProps,
} from "./ModernComponents";

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
export type {
  LiquidGlassCardProps,
  ParallaxScrollViewProps,
  FloatingElementProps,
  GlowTextProps,
  ParticleEffectProps,
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

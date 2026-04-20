/**
 * Premium animation components for AiNeed (寻裳)
 *
 * All components use react-native-reanimated exclusively —
 * no react-native Animated API. Target 60fps with zero JS-thread work
 * during animation frames.
 */

export { AnimatedSplash } from "./AnimatedSplash";
export type { AnimatedSplashProps } from "./AnimatedSplash";

export { TabBarIndicator } from "./TabBarIndicator";
export type { TabBarIndicatorProps } from "./TabBarIndicator";

export {
  SharedTransition,
  SharedTransitionProvider,
  useSharedTransition,
} from "./SharedTransition";
export type { SharedTransitionProps } from "./SharedTransition";

export { RippleButton } from "./RippleButton";
export type { RippleButtonProps } from "./RippleButton";

export { ShimmerSkeleton } from "./ShimmerSkeleton";
export type { ShimmerSkeletonProps } from "./ShimmerSkeleton";

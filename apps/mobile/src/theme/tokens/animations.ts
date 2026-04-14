import { Animated } from "react-native";

/**
 * Spring configuration semantic mapping:
 *
 * snappy  → Confirm actions: button clicks, toggle switches, quick feedback
 * gentle  → Soft transitions: page transitions, card slides, content reveals, embrace
 * bouncy  → Celebrate/success: success animations, favorites, rewards, achievements
 * stiff   → Alert/warning: form validation, alert shakes, destructive actions
 *
 * slow    → Ambient/background: subtle drifts, breathing effects
 * soft    → Gentle emphasis: hover states, subtle highlights
 * rubber  → Playful/overshoot: pop-in effects, playful interactions
 * default → General purpose fallback when no semantic mapping applies
 */
export const SpringConfigs = {
  /** snappy → Confirm actions: button clicks, toggle switches, quick feedback */
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  /** gentle → Soft transitions: page transitions, card slides, content reveals, embrace */
  gentle: {
    damping: 25,
    stiffness: 120,
    mass: 1,
  },
  /** bouncy → Celebrate/success: success animations, favorites, rewards, achievements */
  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 1,
  },
  /** stiff → Alert/warning: form validation, alert shakes, destructive actions */
  stiff: {
    damping: 30,
    stiffness: 400,
    mass: 1,
  },
  /** slow → Ambient/background: subtle drifts, breathing effects */
  slow: {
    damping: 25,
    stiffness: 80,
    mass: 1.2,
  },
  /** soft → Gentle emphasis: hover states, subtle highlights */
  soft: {
    damping: 15,
    stiffness: 120,
    mass: 1,
  },
  /** rubber → Playful/overshoot: pop-in effects, playful interactions */
  rubber: {
    damping: 8,
    stiffness: 200,
    mass: 0.5,
  },
  /** default → General purpose fallback when no semantic mapping applies */
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;

/**
 * Semantic spring accessor — use this instead of SpringConfigs directly
 * to ensure animations are bound to interaction semantics.
 *
 * Usage:
 *   import { SemanticSpring } from '../theme/tokens/animations';
 *   withSpring(1, SemanticSpring.light)   // button click, toggle
 *   withSpring(1, SemanticSpring.medium)  // page transition, card slide
 *   withSpring(1, SemanticSpring.heavy)   // success, favorite, celebration
 *   withSpring(1, SemanticSpring.error)   // validation error, warning
 */
export const SemanticSpring = {
  /** Confirm actions: button clicks, toggle switches, quick feedback → snappy */
  light: SpringConfigs.snappy,
  /** Soft transitions: page transitions, card slides, content reveals, embrace → gentle */
  medium: SpringConfigs.gentle,
  /** Celebrate/success: success animations, favorites, rewards, achievements → bouncy */
  heavy: SpringConfigs.bouncy,
  /** Alert/warning: form validation, alert shakes, destructive actions → stiff */
  error: SpringConfigs.stiff,
} as const;

export const Duration = {
  instant: 100,
  fastest: 150,
  faster: 200,
  fast: 250,
  normal: 300,
  slow: 400,
  slower: 500,
  slowest: 700,
  verySlow: 1000,
} as const;

export const Easing = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  linear: [0, 0, 1, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.68, -0.6, 0.32, 1.6],
} as const;

export const FadeAnimations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: Duration.normal,
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    duration: Duration.normal,
  },
  fadeInUp: {
    from: { opacity: 0, translateY: 20 },
    to: { opacity: 1, translateY: 0 },
    duration: Duration.normal,
  },
  fadeInDown: {
    from: { opacity: 0, translateY: -20 },
    to: { opacity: 1, translateY: 0 },
    duration: Duration.normal,
  },
  fadeInLeft: {
    from: { opacity: 0, translateX: -20 },
    to: { opacity: 1, translateX: 0 },
    duration: Duration.normal,
  },
  fadeInRight: {
    from: { opacity: 0, translateX: 20 },
    to: { opacity: 1, translateX: 0 },
    duration: Duration.normal,
  },
} as const;

export const ScaleAnimations = {
  scaleIn: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1 },
    config: SpringConfigs.snappy,
  },
  scaleOut: {
    from: { opacity: 1, scale: 1 },
    to: { opacity: 0, scale: 0.9 },
    duration: Duration.fast,
  },
  scaleInBounce: {
    from: { opacity: 0, scale: 0.3 },
    to: { opacity: 1, scale: 1 },
    config: SpringConfigs.bouncy,
  },
  popIn: {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1.05 },
    overshoot: { scale: 1 },
    config: SpringConfigs.rubber,
  },
} as const;

export const SlideAnimations = {
  slideInUp: {
    from: { translateY: 100, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    config: SpringConfigs.gentle,
  },
  slideInDown: {
    from: { translateY: -100, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    config: SpringConfigs.gentle,
  },
  slideInLeft: {
    from: { translateX: -100, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    config: SpringConfigs.gentle,
  },
  slideInRight: {
    from: { translateX: 100, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    config: SpringConfigs.gentle,
  },
} as const;

export const InteractionAnimations = {
  press: {
    from: { scale: 1 },
    to: { scale: 0.95 },
    duration: Duration.fastest,
  },
  pressRelease: {
    from: { scale: 0.95 },
    to: { scale: 1 },
    config: SpringConfigs.bouncy,
  },
  hover: {
    from: { scale: 1 },
    to: { scale: 1.02 },
    duration: Duration.fast,
  },
  tap: {
    from: { scale: 1 },
    to: { scale: 0.97 },
    duration: Duration.fastest,
  },
  bounce: {
    from: { scale: 1 },
    to: { scale: 1.1 },
    config: SpringConfigs.bouncy,
  },
  shake: {
    keyframes: [
      { translateX: 0 },
      { translateX: -10 },
      { translateX: 10 },
      { translateX: -10 },
      { translateX: 10 },
      { translateX: 0 },
    ],
    duration: Duration.slow,
  },
  pulse: {
    keyframes: [
      { scale: 1, opacity: 1 },
      { scale: 1.05, opacity: 0.8 },
      { scale: 1, opacity: 1 },
    ],
    duration: Duration.slow,
  },
} as const;

export const PageTransitions = {
  push: {
    entering: {
      from: { translateX: 400, opacity: 0 },
      to: { translateX: 0, opacity: 1 },
      config: SpringConfigs.snappy,
    },
    exiting: {
      from: { translateX: 0, opacity: 1 },
      to: { translateX: -120, opacity: 0.8 },
      duration: Duration.normal,
    },
  },
  modal: {
    entering: {
      from: { translateY: 900, opacity: 0 },
      to: { translateY: 0, opacity: 1 },
      config: SpringConfigs.gentle,
    },
    exiting: {
      from: { translateY: 0, opacity: 1 },
      to: { translateY: 900, opacity: 0 },
      duration: Duration.normal,
    },
  },
  fade: {
    entering: {
      from: { opacity: 0, scale: 0.98 },
      to: { opacity: 1, scale: 1 },
      duration: Duration.normal,
    },
    exiting: {
      from: { opacity: 1, scale: 1 },
      to: { opacity: 0, scale: 1.02 },
      duration: Duration.normal,
    },
  },
  flip: {
    entering: {
      from: { rotateY: "90deg", opacity: 0 },
      to: { rotateY: "0deg", opacity: 1 },
      duration: Duration.slow,
    },
    exiting: {
      from: { rotateY: "0deg", opacity: 1 },
      to: { rotateY: "-90deg", opacity: 0 },
      duration: Duration.slow,
    },
  },
} as const;

export const ListAnimations = {
  stagger: {
    delay: 50,
    duration: Duration.normal,
  },
  itemSlideIn: {
    from: { opacity: 0, translateX: -20 },
    to: { opacity: 1, translateX: 0 },
    config: SpringConfigs.gentle,
  },
  itemFadeIn: {
    from: { opacity: 0, scale: 0.95 },
    to: { opacity: 1, scale: 1 },
    duration: Duration.fast,
  },
  itemPopIn: {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1 },
    config: SpringConfigs.bouncy,
  },
} as const;

export const LoadingAnimations = {
  spin: {
    from: { rotate: "0deg" },
    to: { rotate: "360deg" },
    duration: 1000,
    loop: true,
  },
  pulse: {
    from: { opacity: 1, scale: 1 },
    to: { opacity: 0.5, scale: 0.95 },
    duration: Duration.slow,
    loop: true,
    reverse: true,
  },
  shimmer: {
    from: { translateX: -200 },
    to: { translateX: 200 },
    duration: 1500,
    loop: true,
  },
  dotBounce: {
    keyframes: [{ translateY: 0 }, { translateY: -10 }, { translateY: 0 }],
    duration: Duration.normal,
    loop: true,
  },
} as const;

export const animations = {
  spring: SpringConfigs,
  duration: Duration,
  easing: Easing,
  fade: FadeAnimations,
  scale: ScaleAnimations,
  slide: SlideAnimations,
  interaction: InteractionAnimations,
  page: PageTransitions,
  list: ListAnimations,
  loading: LoadingAnimations,
};

export default animations;

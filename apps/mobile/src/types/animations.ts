/**
 * 动画相关类型定义
 */

import { EasingFunction } from 'react-native';

// 动画配置
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  useNativeDriver?: boolean;
  easing?: EasingFunction;
  isInteraction?: boolean;
}

// 动画值类型
export type AnimatedValue = {
  setValue: (value: number) => void;
  setOffset: (offset: number) => void;
  flattenOffset: () => void;
  extractOffset: () => void;
  addListener: (callback: (value: { value: number }) => void) => string;
  removeListener: (id: string) => void;
  removeAllListeners: () => void;
  stopAnimation: (callback?: (value: number) => void) => void;
  resetAnimation: (callback?: (value: number) => void) => void;
  interpolate: (config: InterpolationConfigType) => AnimatedValue;
};

// 插值配置
export interface InterpolationConfigType {
  inputRange: number[];
  outputRange: number[] | string[];
  easing?: EasingFunction;
  extrapolate?: 'extend' | 'clamp' | 'identity';
  extrapolateLeft?: 'extend' | 'clamp' | 'identity';
  extrapolateRight?: 'extend' | 'clamp' | 'identity';
}

// 动画样式
export interface AnimatedStyle {
  transform?: Array<{
    translateX?: AnimatedValue | number;
    translateY?: AnimatedValue | number;
    scale?: AnimatedValue | number;
    scaleX?: AnimatedValue | number;
    scaleY?: AnimatedValue | number;
    rotate?: AnimatedValue | string;
    rotateX?: AnimatedValue | string;
    rotateY?: AnimatedValue | string;
    rotateZ?: AnimatedValue | string;
    perspective?: AnimatedValue | number;
  }>;
  opacity?: AnimatedValue | number;
  backgroundColor?: string;
}

// 复合动画
export interface CompositeAnimation {
  start: (callback?: (result: { finished: boolean }) => void) => void;
  stop: () => void;
  reset: () => void;
}

// 动画类型
export type AnimationType =
  | 'spring'
  | 'timing'
  | 'decay'
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'modulo'
  | 'diffClamp'
  | 'delay'
  | 'sequence'
  | 'parallel'
  | 'stagger'
  | 'loop'
  | 'event';

// Spring 动画配置
export interface SpringConfig extends AnimationConfig {
  toValue?: number | AnimatedValue;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
  velocity?: number;
  bounciness?: number;
  speed?: number;
  tension?: number;
  friction?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
}

// Timing 动画配置
export interface TimingConfig extends AnimationConfig {
  toValue: number | AnimatedValue;
}

// Decay 动画配置
export interface DecayConfig extends AnimationConfig {
  velocity: number;
  deceleration?: number;
}

// 滚动动画配置
export interface ScrollAnimationConfig {
  inputRange: number[];
  outputRange: number[] | string[];
  extrapolate?: 'clamp' | 'extend' | 'identity';
}

// 进度条动画
export interface ProgressAnimation {
  progress: AnimatedValue;
  config: AnimationConfig;
}

// 淡入淡出动画
export interface FadeAnimation {
  opacity: AnimatedValue;
  duration: number;
}

// 滑动动画
export interface SlideAnimation {
  translateX: AnimatedValue;
  translateY: AnimatedValue;
  duration: number;
}

// 缩放动画
export interface ScaleAnimation {
  scale: AnimatedValue;
  duration: number;
}

// 旋转动画
export interface RotateAnimation {
  rotate: AnimatedValue;
  duration: number;
}

// 动画结果
export interface AnimationResult {
  finished: boolean;
  value?: number;
}

// 动画回调
export type AnimationCallback = (result: AnimationResult) => void;

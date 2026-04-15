/**
 * 错误边界高阶组件
 *
 * 提供便捷的错误边界包装功能
 */

import React from "react";
import type { ErrorInfo, ComponentType } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import type { ErrorBoundaryProps } from "./ErrorBoundary";
import type { StructuredError } from "../../utils/errorHandling";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 高阶组件选项
 */
export interface WithErrorBoundaryOptions {
  /** 自定义错误展示组件 */
  fallback?: ErrorBoundaryProps["fallback"];
  /** 错误重置回调 */
  onReset?: () => void;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo, structuredError: StructuredError) => void;
  /** 是否显示详细错误信息 */
  showDetails?: boolean;
  /** 屏幕名称 */
  screenName?: string;
  /** 错误上下文 */
  context?: Record<string, unknown>;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用自动恢复 */
  autoRecover?: boolean;
  /** 自动恢复延迟 */
  autoRecoverDelay?: number;
}

// ============================================================================
// 高阶组件
// ============================================================================

/**
 * 为组件添加错误边界的高阶函数
 *
 * @example
 * ```typescript
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   screenName: 'HomeScreen',
 *   onReset: () => console.log('Reset'),
 * });
 * ```
 */
export function withErrorBoundary<P extends Record<string, unknown>>(
  WrappedComponent: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary
      fallback={options.fallback}
      onReset={options.onReset}
      onError={options.onError}
      showDetails={options.showDetails}
      screenName={options.screenName || displayName}
      context={options.context}
      maxRetries={options.maxRetries}
      autoRecover={options.autoRecover}
      autoRecoverDelay={options.autoRecoverDelay}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建局部错误边界的工厂函数
 * 用于为特定屏幕创建专用的错误边界
 *
 * @example
 * ```typescript
 * const HomeScreenErrorBoundary = createErrorBoundary('HomeScreen');
 *
 * // 使用
 * <HomeScreenErrorBoundary>
 *   <HomeScreen />
 * </HomeScreenErrorBoundary>
 * ```
 */
export function createErrorBoundary(screenName: string) {
  return function ScreenErrorBoundary({
    children,
    ...props
  }: {
    children: React.ReactNode;
    onReset?: () => void;
    onError?: (error: Error, errorInfo: ErrorInfo, structuredError: StructuredError) => void;
  }) {
    return (
      <ErrorBoundary screenName={screenName} onReset={props.onReset} onError={props.onError}>
        {children}
      </ErrorBoundary>
    );
  };
}

/**
 * 创建带预设配置的错误边界高阶组件
 *
 * @example
 * ```typescript
 * const withScreenErrorBoundary = createErrorBoundaryHOC({
 *   showDetails: __DEV__,
 *   maxRetries: 3,
 * });
 *
 * const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, { screenName: 'HomeScreen' });
 * ```
 */
export function createErrorBoundaryHOC(defaultOptions: WithErrorBoundaryOptions) {
  return function <P extends Record<string, unknown>>(
    WrappedComponent: ComponentType<P>,
    options: WithErrorBoundaryOptions = {}
  ): React.FC<P> {
    return withErrorBoundary(WrappedComponent, {
      ...defaultOptions,
      ...options,
    });
  };
}

export default withErrorBoundary;

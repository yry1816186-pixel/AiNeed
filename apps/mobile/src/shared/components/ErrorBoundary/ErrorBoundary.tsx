/**
 * 企业级错误边界组件
 *
 * 提供增强的错误捕获、分类、上报和恢复能力
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, StyleSheet, InteractionManager } from "react-native";
import {
  handleError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  StructuredError,
} from "../../utils/errorHandling";
import { ErrorFallback, ErrorFallbackProps } from "./ErrorFallback";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 错误边界组件属性
 */
export interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  /** 自定义错误展示组件 */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  /** 错误重置回调 */
  onReset?: () => void;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo, structuredError: StructuredError) => void;
  /** 是否显示详细错误信息（仅开发环境） */
  showDetails?: boolean;
  /** 屏幕名称，用于错误追踪 */
  screenName?: string;
  /** 错误发生时的上下文 */
  context?: Record<string, unknown>;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否启用自动恢复 */
  autoRecover?: boolean;
  /** 自动恢复延迟（毫秒） */
  autoRecoverDelay?: number;
  /** 自定义错误分类 */
  errorCategory?: ErrorCategory;
  /** 自定义错误严重级别 */
  errorSeverity?: ErrorSeverity;
  /** 自定义恢复策略 */
  recoveryStrategy?: RecoveryStrategy;
}

/**
 * 错误边界状态
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  structuredError: StructuredError | null;
  retryCount: number;
  isRecovering: boolean;
}

// ============================================================================
// 错误边界组件
// ============================================================================

/**
 * 企业级错误边界组件
 *
 * 特性：
 * - 自动错误分类和严重级别评估
 * - 集成错误上报系统
 * - 支持多种恢复策略
 * - 重试机制
 * - 自动恢复（可选）
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private autoRecoverTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      structuredError: null,
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { screenName, context, onError, errorCategory, errorSeverity, recoveryStrategy } =
      this.props;

    // 处理错误，获取结构化错误信息
    const structuredError = handleError(error, {
      ...context,
      screenName,
      componentStack: errorInfo.componentStack,
    });

    // 如果提供了自定义分类，覆盖自动分类
    if (errorCategory) {
      structuredError.category = errorCategory;
    }

    // 如果提供了自定义严重级别，覆盖自动评估
    if (errorSeverity) {
      structuredError.severity = errorSeverity;
    }

    // 如果提供了自定义恢复策略，覆盖自动策略
    if (recoveryStrategy) {
      structuredError.recoveryStrategy = recoveryStrategy;
    }

    // 更新状态
    this.setState({
      errorInfo,
      structuredError,
    });

    // 调用自定义错误处理
    onError?.(error, errorInfo, structuredError);

    // 如果启用自动恢复，启动自动恢复计时器
    if (this.props.autoRecover && structuredError.recoverable) {
      this.scheduleAutoRecover();
    }
  }

  componentWillUnmount(): void {
    this.clearTimers();
  }

  /**
   * 清除所有计时器
   */
  private clearTimers(): void {
    if (this.autoRecoverTimer) {
      clearTimeout(this.autoRecoverTimer);
      this.autoRecoverTimer = undefined;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  /**
   * 安排自动恢复
   */
  private scheduleAutoRecover(): void {
    const { autoRecoverDelay = 3000 } = this.props;

    this.autoRecoverTimer = setTimeout(() => {
      this.handleReset();
    }, autoRecoverDelay);
  }

  /**
   * 处理重置
   */
  private handleReset = (): void => {
    const { onReset, maxRetries = 3 } = this.props;
    const { retryCount, structuredError } = this.state;

    // 检查是否超过最大重试次数
    if (retryCount >= maxRetries) {
      console.warn(`[ErrorBoundary] 已达到最大重试次数 (${maxRetries})`);
      return;
    }

    // 检查错误是否可恢复
    if (structuredError && !structuredError.recoverable) {
      console.warn("[ErrorBoundary] 错误不可恢复");
      return;
    }

    // 更新状态
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      structuredError: null,
      retryCount: retryCount + 1,
      isRecovering: false,
    });

    // 调用重置回调
    onReset?.();
  };

  /**
   * 处理重试
   */
  private handleRetry = (): void => {
    this.setState({ isRecovering: true });

    // 使用 InteractionManager 确保在交互完成后重试
    void InteractionManager.runAfterInteractions(() => {
      this.handleReset();
    });
  };

  /**
   * 处理刷新
   */
  private handleRefresh = (): void => {
    this.handleRetry();
  };

  /**
   * 处理返回
   */
  private handleGoBack = (): void => {
    // 这里需要导航支持，由外部提供
    this.handleReset();
  };

  /**
   * 处理返回首页
   */
  private handleGoHome = (): void => {
    // 这里需要导航支持，由外部提供
    this.handleReset();
  };

  /**
   * 处理重新登录
   */
  private handleReLogin = (): void => {
    // 这里需要清除认证状态并跳转登录页
    this.handleReset();
  };

  /**
   * 获取恢复处理函数
   */
  private getRecoveryHandler = (strategy: RecoveryStrategy): (() => void) => {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        return this.handleRetry;
      case RecoveryStrategy.REFRESH:
        return this.handleRefresh;
      case RecoveryStrategy.GO_BACK:
        return this.handleGoBack;
      case RecoveryStrategy.GO_HOME:
        return this.handleGoHome;
      case RecoveryStrategy.RE_LOGIN:
        return this.handleReLogin;
      case RecoveryStrategy.IGNORE:
        return this.handleReset;
      case RecoveryStrategy.MANUAL:
        return this.handleReset;
      default:
        return this.handleRetry;
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, structuredError, retryCount, isRecovering } = this.state;
    const { children, fallback, showDetails = __DEV__, maxRetries = 3 } = this.props;

    if (!hasError) {
      return children;
    }

    // 如果提供了自定义 fallback
    if (fallback) {
      if (typeof fallback === "function") {
        return fallback({
          error: error!,
          errorInfo: errorInfo!,
          structuredError: structuredError!,
          onRetry: this.handleRetry,
          onReset: this.handleReset,
          retryCount,
          maxRetries,
          isRecovering,
        });
      }
      return fallback;
    }

    // 使用默认错误展示组件
    return (
      <View style={styles.container}>
        <ErrorFallback
          error={error!}
          errorInfo={errorInfo!}
          structuredError={structuredError!}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          onRecovery={this.getRecoveryHandler(
            structuredError?.recoveryStrategy || RecoveryStrategy.RETRY
          )}
          showDetails={showDetails}
          retryCount={retryCount}
          maxRetries={maxRetries}
          isRecovering={isRecovering}
        />
      </View>
    );
  }
}

// ============================================================================
// 样式
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ErrorBoundary;

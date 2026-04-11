import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, BorderRadius, Spacing } from "../../theme";
import * as Sentry from "@sentry/react-native";

/**
 * 错误边界组件属性
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** 自定义错误展示组件 */
  fallback?: ReactNode;
  /** 错误重置回调 */
  onReset?: () => void;
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 是否显示详细错误信息（仅开发环境） */
  showDetails?: boolean;
  /** 屏幕名称，用于错误追踪 */
  screenName?: string;
}

/**
 * 错误边界状态
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 全局错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, screenName } = this.props;
    
    // 更新状态以存储错误信息
    this.setState({ errorInfo });
    
    // 控制台输出
    console.error(`[ErrorBoundary${screenName ? ` - ${screenName}` : ''}]`, error, errorInfo);
    
    // 上报到 Sentry
    Sentry.captureException(error, { 
      extra: { 
        componentStack: errorInfo.componentStack,
        screenName,
      } 
    });
    
    // 调用自定义错误处理
    onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = __DEV__ } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="warning-outline" size={48} color={Colors.error[500]} />
        </View>
        
        <Text style={styles.title}>出错了</Text>
        <Text style={styles.message}>
          应用遇到了一个意外错误，请尝试重试
        </Text>
        
        {showDetails && error && (
          <ScrollView style={styles.errorDetails} nestedScrollEnabled>
            <Text style={styles.errorTitle}>错误详情：</Text>
            <Text style={styles.errorText}>{error.message}</Text>
            {errorInfo?.componentStack && (
              <>
                <Text style={styles.errorTitle}>组件堆栈：</Text>
                <Text style={styles.errorStack}>{errorInfo.componentStack}</Text>
              </>
            )}
          </ScrollView>
        )}
        
        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
          <Ionicons name="refresh-outline" size={20} color={Colors.neutral.white} />
          <Text style={styles.buttonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

/**
 * 错误边界高阶组件选项
 */
interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  screenName?: string;
}

/**
 * 为组件添加错误边界的高阶函数
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent, { screenName: 'HomeScreen' });
 */
export function withErrorBoundary<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {},
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary
      fallback={options.fallback}
      onReset={options.onReset}
      onError={options.onError}
      showDetails={options.showDetails}
      screenName={options.screenName || displayName}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

/**
 * 创建局部错误边界的工厂函数
 * 用于为特定屏幕创建专用的错误边界
 */
export function createErrorBoundary(screenName: string) {
  return function ScreenErrorBoundary({ children }: { children: ReactNode }) {
    return (
      <ErrorBoundary screenName={screenName}>
        {children}
      </ErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing[6],
    backgroundColor: Colors.neutral[50],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.error[500]}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing[5],
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.neutral[800],
    marginBottom: Spacing[2],
  },
  message: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing[6],
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[5],
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.neutral[700],
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
  },
  errorText: {
    fontSize: 12,
    color: Colors.error[600],
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: Colors.neutral[600],
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.lg,
    gap: Spacing[2],
  },
  buttonText: {
    color: Colors.neutral.white,
    fontSize: 15,
    fontWeight: "600",
  },
});

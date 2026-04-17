/**
 * 错误展示 UI 组件
 *
 * 提供丰富的错误展示界面，支持多种错误类型和恢复操作
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "../../../polyfills/expo-vector-icons.ts";
import { Colors, BorderRadius, Spacing, Typography } from '../../../design-system/theme';
import {
  StructuredError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
} from "../../utils/errorHandling";
import type { ErrorInfo } from "react";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 错误展示组件属性
 */
export interface ErrorFallbackProps {
  /** 原始错误对象 */
  error: Error;
  /** 错误信息 */
  errorInfo: ErrorInfo;
  /** 结构化错误信息 */
  structuredError: StructuredError;
  /** 重试回调 */
  onRetry?: () => void;
  /** 重置回调 */
  onReset?: () => void;
  /** 恢复回调 */
  onRecovery?: () => void;
  /** 是否显示详细错误信息 */
  showDetails?: boolean;
  /** 当前重试次数 */
  retryCount?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否正在恢复 */
  isRecovering?: boolean;
}

// ============================================================================
// 错误图标组件
// ============================================================================

/**
 * 根据错误类型获取图标
 */
const getErrorIcon = (category: ErrorCategory): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case ErrorCategory.NETWORK:
      return "cloud-offline-outline";
    case ErrorCategory.PERMISSION:
      return "lock-closed-outline";
    case ErrorCategory.RESOURCE:
      return "search-outline";
    case ErrorCategory.STORAGE:
      return "save-outline";
    case ErrorCategory.RENDER:
      return "bug-outline";
    case ErrorCategory.BUSINESS:
      return "warning-outline";
    case ErrorCategory.THIRD_PARTY:
      return "cube-outline";
    default:
      return "alert-circle-outline";
  }
};

/**
 * 根据错误严重级别获取颜色
 */
const getSeverityColor = (severity: ErrorSeverity): string => {
  switch (severity) {
    case ErrorSeverity.LOW:
      return Colors.warning[500];
    case ErrorSeverity.MEDIUM:
      return Colors.warning[600];
    case ErrorSeverity.HIGH:
      return Colors.error[500];
    case ErrorSeverity.CRITICAL:
      return Colors.error[600];
    default:
      return Colors.error[500];
  }
};

// ============================================================================
// 恢复按钮组件
// ============================================================================

interface RecoveryButtonProps {
  strategy: RecoveryStrategy;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const RecoveryButton: React.FC<RecoveryButtonProps> = ({
  strategy,
  onPress,
  disabled,
  loading,
}) => {
  const getButtonConfig = () => {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        return {
          icon: "refresh-outline" as const,
          label: "重试",
        };
      case RecoveryStrategy.REFRESH:
        return {
          icon: "refresh-outline" as const,
          label: "刷新页面",
        };
      case RecoveryStrategy.GO_BACK:
        return {
          icon: "arrow-back-outline" as const,
          label: "返回上一页",
        };
      case RecoveryStrategy.GO_HOME:
        return {
          icon: "home-outline" as const,
          label: "返回首页",
        };
      case RecoveryStrategy.RE_LOGIN:
        return {
          icon: "log-in-outline" as const,
          label: "重新登录",
        };
      case RecoveryStrategy.IGNORE:
        return {
          icon: "close-outline" as const,
          label: "忽略",
        };
      case RecoveryStrategy.MANUAL:
        return {
          icon: "hand-left-outline" as const,
          label: "手动处理",
        };
      default:
        return {
          icon: "refresh-outline" as const,
          label: "重试",
        };
    }
  };

  const config = getButtonConfig();

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.neutral.white} />
      ) : (
        <>
          <Ionicons name={config.icon} size={20} color={Colors.neutral.white} />
          <Text style={styles.buttonText}>{config.label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// 错误展示组件
// ============================================================================

/**
 * 错误展示组件
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  structuredError,
  onRetry,
  onReset,
  onRecovery,
  showDetails = __DEV__,
  retryCount = 0,
  maxRetries = 3,
  isRecovering = false,
}) => {
  const severityColor = getSeverityColor(structuredError.severity);
  const iconName = getErrorIcon(structuredError.category);

  return (
    <View style={styles.container}>
      {/* 错误图标 */}
      <View style={[styles.iconCircle, { backgroundColor: `${severityColor}15` }]}>
        <Ionicons name={iconName} size={48} color={severityColor} />
      </View>

      {/* 错误标题 */}
      <Text style={styles.title}>出错了</Text>

      {/* 用户友好的错误消息 */}
      <Text style={styles.message}>{structuredError.userMessage}</Text>

      {/* 错误分类标签 */}
      <View style={styles.tagsContainer}>
        <View style={[styles.tag, { backgroundColor: `${severityColor}15` }]}>
          <Text style={[styles.tagText, { color: severityColor }]}>{structuredError.category}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: `${Colors.neutral[500]}15` }]}>
          <Text style={[styles.tagText, { color: Colors.neutral[600] }]}>
            {structuredError.severity}
          </Text>
        </View>
        {structuredError.code && (
          <View style={[styles.tag, { backgroundColor: `${Colors.primary[500]}15` }]}>
            <Text style={[styles.tagText, { color: Colors.primary[600] }]}>
              {structuredError.code}
            </Text>
          </View>
        )}
      </View>

      {/* 重试次数提示 */}
      {retryCount > 0 && (
        <Text style={styles.retryHint}>
          已重试 {retryCount}/{maxRetries} 次
        </Text>
      )}

      {/* 开发环境显示详细错误信息 */}
      {showDetails && (
        <ScrollView style={styles.errorDetails} nestedScrollEnabled>
          <Text style={styles.errorTitle}>错误详情：</Text>
          <Text style={styles.errorText}>{error.message}</Text>

          {errorInfo.componentStack && (
            <>
              <Text style={styles.errorTitle}>组件堆栈：</Text>
              <Text style={styles.errorStack}>{errorInfo.componentStack}</Text>
            </>
          )}

          {structuredError.context && (
            <>
              <Text style={styles.errorTitle}>上下文：</Text>
              <Text style={styles.errorStack}>
                {JSON.stringify(structuredError.context, null, 2)}
              </Text>
            </>
          )}
        </ScrollView>
      )}

      {/* 操作按钮 */}
      <View style={styles.buttonsContainer}>
        {structuredError.recoverable && onRecovery && (
          <RecoveryButton
            strategy={structuredError.recoveryStrategy}
            onPress={onRecovery}
            disabled={retryCount >= maxRetries}
            loading={isRecovering}
          />
        )}

        {onReset && !structuredError.recoverable && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={onReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.primary[500]} />
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>重置</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 不可恢复提示 */}
      {!structuredError.recoverable && (
        <Text style={styles.unrecoverableHint}>此错误无法自动恢复，请联系客服或重启应用</Text>
      )}
    </View>
  );
};

// ============================================================================
// 样式
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing[6],
    backgroundColor: Colors.neutral[50],
  },
  iconCircle: {
    width: Spacing['5xl'],
    height: Spacing['5xl'],
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing[5],
  },
  title: {
    ...Typography.styles.h2,
    color: Colors.neutral[800],
    marginBottom: Spacing[2],
  },
  message: {
    ...Typography.body,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing[4],
    maxWidth: 300,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
    marginBottom: Spacing[4],
  },
  tag: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },
  tagText: {
    ...Typography.caption,
    fontWeight: "600",
  },
  retryHint: {
    ...Typography.caption,
    color: Colors.neutral[500],
    marginBottom: Spacing[4],
  },
  errorDetails: {
    maxHeight: 200,
    width: "100%",
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[5],
  },
  errorTitle: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.neutral[700],
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error[600],
    fontFamily: "monospace",
  },
  errorStack: {
    ...Typography.caption,
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[600],
    fontFamily: "monospace",
    lineHeight: 16,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: Spacing[3],
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.lg,
    gap: Spacing[2],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonSecondary: {
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  buttonText: {
    color: Colors.neutral.white,
    ...Typography.body,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: Colors.primary[500],
  },
  unrecoverableHint: {
    ...Typography.caption,
    color: Colors.neutral[500],
    textAlign: "center",
    marginTop: Spacing[4],
    maxWidth: 280,
  },
});

export default ErrorFallback;

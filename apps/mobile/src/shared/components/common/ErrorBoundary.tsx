/**
 * ErrorBoundary - 已合并至 ErrorBoundary/ 目录的企业级实现
 *
 * 此文件保留作为 re-export，避免破坏现有导入。
 * 新代码请直接从 @/src/shared/components/ErrorBoundary 导入。
 *
 * 企业级版本提供增强的错误捕获、分类、上报和恢复能力：
 * - 自动错误分类和严重级别评估
 * - 集成错误上报系统
 * - 支持多种恢复策略
 * - 重试机制
 * - 自动恢复（可选）
 */
export {
  ErrorBoundary,
  ErrorFallback,
  withErrorBoundary,
  createErrorBoundary,
  createErrorBoundaryHOC,
} from "../ErrorBoundary";

export type {
  ErrorBoundaryProps,
  ErrorFallbackProps,
  WithErrorBoundaryOptions,
} from "../ErrorBoundary";

export {
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ErrorClassifier,
  ErrorReporter,
  ErrorHandler,
  handleError,
  reportError,
  configureErrorReporting,
} from "../../utils/errorHandling";

export type { StructuredError, ErrorReportConfig } from "../../utils/errorHandling";

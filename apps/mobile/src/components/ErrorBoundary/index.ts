/**
 * 错误边界组件导出
 * 
 * 企业级错误边界系统
 */

// 核心组件
export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';

// 错误展示组件
export { ErrorFallback } from './ErrorFallback';
export type { ErrorFallbackProps } from './ErrorFallback';

// 高阶组件
export {
  withErrorBoundary,
  createErrorBoundary,
  createErrorBoundaryHOC,
} from './withErrorBoundary';
export type { WithErrorBoundaryOptions } from './withErrorBoundary';

// 错误处理工具
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
} from '../../utils/errorHandling';
export type { StructuredError, ErrorReportConfig } from '../../utils/errorHandling';

/**
 * 企业级错误处理工具
 *
 * 提供错误分类、上报、恢复策略等核心功能
 */

import * as Sentry from "@sentry/react-native";
import { logger } from "./logger";

// ============================================================================
// 错误类型定义
// ============================================================================

/**
 * 错误分类枚举
 */
export enum ErrorCategory {
  /** 网络错误 - API请求失败、超时、连接问题 */
  NETWORK = "NETWORK",
  /** 渲染错误 - React组件渲染失败 */
  RENDER = "RENDER",
  /** 业务错误 - 业务逻辑错误、数据验证失败 */
  BUSINESS = "BUSINESS",
  /** 权限错误 - 认证失败、授权不足 */
  PERMISSION = "PERMISSION",
  /** 资源错误 - 资源不存在、已删除 */
  RESOURCE = "RESOURCE",
  /** 存储错误 - 本地存储失败、缓存问题 */
  STORAGE = "STORAGE",
  /** 第三方错误 - 第三方SDK、库错误 */
  THIRD_PARTY = "THIRD_PARTY",
  /** 未知错误 - 无法分类的错误 */
  UNKNOWN = "UNKNOWN",
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  /** 低 - 不影响核心功能 */
  LOW = "LOW",
  /** 中 - 影响部分功能 */
  MEDIUM = "MEDIUM",
  /** 高 - 影响核心功能 */
  HIGH = "HIGH",
  /** 严重 - 应用崩溃 */
  CRITICAL = "CRITICAL",
}

/**
 * 错误恢复策略
 */
export enum RecoveryStrategy {
  /** 重试 - 重新执行失败的操作 */
  RETRY = "RETRY",
  /** 刷新页面 - 重新加载当前页面 */
  REFRESH = "REFRESH",
  /** 返回上一页 - 导航回退 */
  GO_BACK = "GO_BACK",
  /** 跳转首页 - 导航到首页 */
  GO_HOME = "GO_HOME",
  /** 重新登录 - 清除认证状态，跳转登录页 */
  RE_LOGIN = "RE_LOGIN",
  /** 忽略 - 忽略错误，继续执行 */
  IGNORE = "IGNORE",
  /** 手动处理 - 需要用户手动处理 */
  MANUAL = "MANUAL",
}

/**
 * 结构化错误信息
 */
export interface StructuredError {
  /** 原始错误对象 */
  originalError: Error;
  /** 错误分类 */
  category: ErrorCategory;
  /** 错误严重级别 */
  severity: ErrorSeverity;
  /** 错误代码 */
  code?: string;
  /** 用户友好的错误消息 */
  userMessage: string;
  /** 技术错误消息 */
  technicalMessage: string;
  /** 恢复策略 */
  recoveryStrategy: RecoveryStrategy;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 额外上下文 */
  context?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: number;
  /** 设备信息 */
  deviceInfo?: {
    platform?: string;
    version?: string;
    model?: string;
  };
}

/**
 * 错误上报配置
 */
export interface ErrorReportConfig {
  /** 是否上报到 Sentry */
  sentry: boolean;
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否上报到自定义后端 */
  customBackend: boolean;
  /** 自定义上报端点 */
  customEndpoint?: string;
  /** 是否包含设备信息 */
  includeDeviceInfo: boolean;
  /** 是否包含用户信息 */
  includeUserInfo: boolean;
  /** 采样率 (0-1) */
  sampleRate: number;
}

// ============================================================================
// 错误分类器
// ============================================================================

/**
 * 错误分类器
 * 根据错误特征自动分类错误
 */
export class ErrorClassifier {
  /**
   * 网络错误关键词
   */
  private static readonly NETWORK_KEYWORDS = [
    "network",
    "fetch",
    "timeout",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNRESET",
    "网络",
    "连接",
    "超时",
    "请求失败",
    "Network request failed",
    "Network Error",
  ];

  /**
   * 权限错误关键词
   */
  private static readonly PERMISSION_KEYWORDS = [
    "unauthorized",
    "forbidden",
    "permission",
    "auth",
    "token",
    "401",
    "403",
    "未授权",
    "权限不足",
    "认证失败",
    "登录已过期",
  ];

  /**
   * 资源错误关键词
   */
  private static readonly RESOURCE_KEYWORDS = [
    "not found",
    "404",
    "不存在",
    "已删除",
    "无法找到",
    "ENOENT",
  ];

  /**
   * 存储错误关键词
   */
  private static readonly STORAGE_KEYWORDS = [
    "storage",
    "asyncstorage",
    "sqlite",
    "cache",
    "存储",
    "缓存",
    "写入失败",
    "读取失败",
  ];

  /**
   * 渲染错误关键词
   */
  private static readonly RENDER_KEYWORDS = [
    "render",
    "component",
    "element",
    "hook",
    "React",
    "渲染",
    "组件",
    "undefined is not",
    "null is not",
    "Cannot read property",
  ];

  /**
   * 分类错误
   */
  public static classify(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";
    const combined = `${message} ${stack}`;

    // 检查网络错误
    if (this.NETWORK_KEYWORDS.some((keyword) => combined.includes(keyword.toLowerCase()))) {
      return ErrorCategory.NETWORK;
    }

    // 检查权限错误
    if (this.PERMISSION_KEYWORDS.some((keyword) => combined.includes(keyword.toLowerCase()))) {
      return ErrorCategory.PERMISSION;
    }

    // 检查资源错误
    if (this.RESOURCE_KEYWORDS.some((keyword) => combined.includes(keyword.toLowerCase()))) {
      return ErrorCategory.RESOURCE;
    }

    // 检查存储错误
    if (this.STORAGE_KEYWORDS.some((keyword) => combined.includes(keyword.toLowerCase()))) {
      return ErrorCategory.STORAGE;
    }

    // 检查渲染错误
    if (this.RENDER_KEYWORDS.some((keyword) => combined.includes(keyword.toLowerCase()))) {
      return ErrorCategory.RENDER;
    }

    // 检查错误名称
    if (
      error.name === "NetworkError" ||
      (error.name === "TypeError" && message.includes("fetch"))
    ) {
      return ErrorCategory.NETWORK;
    }

    if (error.name === "NavigationError") {
      return ErrorCategory.BUSINESS;
    }

    // 默认为未知错误
    return ErrorCategory.UNKNOWN;
  }

  /**
   * 判断错误严重级别
   */
  public static assessSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // 渲染错误通常是严重的
    if (category === ErrorCategory.RENDER) {
      return ErrorSeverity.HIGH;
    }

    // 权限错误通常是中等的
    if (category === ErrorCategory.PERMISSION) {
      return ErrorSeverity.MEDIUM;
    }

    // 网络错误根据类型判断
    if (category === ErrorCategory.NETWORK) {
      const message = error.message.toLowerCase();
      if (message.includes("timeout")) {
        return ErrorSeverity.MEDIUM;
      }
      if (message.includes("offline") || message.includes("disconnect")) {
        return ErrorSeverity.HIGH;
      }
      return ErrorSeverity.MEDIUM;
    }

    // 资源错误通常是低级别的
    if (category === ErrorCategory.RESOURCE) {
      return ErrorSeverity.LOW;
    }

    // 默认为中等
    return ErrorSeverity.MEDIUM;
  }

  /**
   * 确定恢复策略
   */
  public static determineRecoveryStrategy(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): RecoveryStrategy {
    switch (category) {
      case ErrorCategory.NETWORK:
        return RecoveryStrategy.RETRY;

      case ErrorCategory.PERMISSION:
        return RecoveryStrategy.RE_LOGIN;

      case ErrorCategory.RESOURCE:
        return RecoveryStrategy.GO_BACK;

      case ErrorCategory.RENDER:
        return severity === ErrorSeverity.CRITICAL
          ? RecoveryStrategy.GO_HOME
          : RecoveryStrategy.REFRESH;

      case ErrorCategory.STORAGE:
        return RecoveryStrategy.RETRY;

      case ErrorCategory.BUSINESS:
        return RecoveryStrategy.MANUAL;

      default:
        return RecoveryStrategy.REFRESH;
    }
  }
}

// ============================================================================
// 错误上报器
// ============================================================================

/**
 * 错误上报器
 * 负责将错误上报到各种监控系统
 */
export class ErrorReporter {
  private static config: ErrorReportConfig = {
    sentry: true,
    console: __DEV__,
    customBackend: false,
    includeDeviceInfo: true,
    includeUserInfo: true,
    sampleRate: 1.0,
  };

  /**
   * 配置上报器
   */
  public static configure(config: Partial<ErrorReportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 上报错误
   */
  public static async report(structuredError: StructuredError): Promise<void> {
    // 采样检查
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    // 控制台输出
    if (this.config.console) {
      this.logToConsole(structuredError);
    }

    // Sentry 上报
    if (this.config.sentry) {
      this.reportToSentry(structuredError);
    }

    // 自定义后端上报
    if (this.config.customBackend && this.config.customEndpoint) {
      await this.reportToCustomBackend(structuredError);
    }
  }

  /**
   * 输出到控制台
   */
  private static logToConsole(error: StructuredError): void {
    const logPrefix = `[${error.category}] [${error.severity}]`;

    logger.error(`${logPrefix} ${error.technicalMessage}`);

    if (__DEV__) {
      logger.error("错误详情:", {
        code: error.code,
        userMessage: error.userMessage,
        recoveryStrategy: error.recoveryStrategy,
        context: error.context,
        stack: error.originalError.stack,
      });
    }
  }

  /**
   * 上报到 Sentry
   */
  private static reportToSentry(error: StructuredError): void {
    const tags: Record<string, string> = {
      category: error.category,
      severity: error.severity,
      recoveryStrategy: error.recoveryStrategy,
    };

    if (error.code) {
      tags.code = error.code;
    }

    const requestId = error.context?.requestId;
    if (typeof requestId === "string") {
      tags.request_id = requestId;
    }

    Sentry.captureException(error.originalError, {
      tags,
      extra: {
        userMessage: error.userMessage,
        technicalMessage: error.technicalMessage,
        context: error.context,
        deviceInfo: error.deviceInfo,
        timestamp: error.timestamp,
      },
      level: this.mapSeverityToSentryLevel(error.severity),
    });
  }

  /**
   * 上报到自定义后端
   */
  private static async reportToCustomBackend(error: StructuredError): Promise<void> {
    try {
      const endpoint = this.config.customEndpoint;
      if (!endpoint) {
        return;
      }

      const payload = {
        category: error.category,
        severity: error.severity,
        code: error.code,
        userMessage: error.userMessage,
        technicalMessage: error.technicalMessage,
        recoveryStrategy: error.recoveryStrategy,
        context: error.context,
        timestamp: error.timestamp,
        deviceInfo: error.deviceInfo,
        stack: error.originalError.stack,
      };

      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      logger.error("上报错误到自定义后端失败:", err);
    }
  }

  /**
   * 映射严重级别到 Sentry 级别
   */
  private static mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
    switch (severity) {
      case ErrorSeverity.LOW:
        return "info";
      case ErrorSeverity.MEDIUM:
        return "warning";
      case ErrorSeverity.HIGH:
        return "error";
      case ErrorSeverity.CRITICAL:
        return "fatal";
      default:
        return "error";
    }
  }
}

// ============================================================================
// 错误处理器
// ============================================================================

/**
 * 错误处理器
 * 统一的错误处理入口
 */
export class ErrorHandler {
  /**
   * 处理错误并返回结构化错误信息
   */
  public static handle(error: Error, context?: Record<string, unknown>): StructuredError {
    // 分类错误
    const category = ErrorClassifier.classify(error);

    // 评估严重级别
    const severity = ErrorClassifier.assessSeverity(error, category);

    // 确定恢复策略
    const recoveryStrategy = ErrorClassifier.determineRecoveryStrategy(category, severity);

    // 构建结构化错误
    const structuredError: StructuredError = {
      originalError: error,
      category,
      severity,
      code: this.extractErrorCode(error),
      userMessage: this.generateUserMessage(error, category),
      technicalMessage: error.message,
      recoveryStrategy,
      recoverable: this.isRecoverable(category, severity),
      context,
      timestamp: Date.now(),
    };

    // 上报错误
    void ErrorReporter.report(structuredError);

    return structuredError;
  }

  /**
   * 提取错误代码
   */
  private static extractErrorCode(error: Error): string | undefined {
    // 尝试从错误消息中提取代码
    const codeMatch = error.message.match(/\[([A-Z0-9_]+)\]/);
    if (codeMatch) {
      return codeMatch[1];
    }

    // 尝试从错误对象中提取
    const errorWithCode = error as Error & { code?: string };
    if (errorWithCode.code) {
      return errorWithCode.code;
    }

    return undefined;
  }

  /**
   * 生成用户友好的错误消息
   */
  private static generateUserMessage(error: Error, category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return "网络连接失败，请检查网络设置后重试";

      case ErrorCategory.PERMISSION:
        return "您没有权限执行此操作，请重新登录";

      case ErrorCategory.RESOURCE:
        return "请求的资源不存在或已被删除";

      case ErrorCategory.STORAGE:
        return "本地存储失败，请检查存储空间";

      case ErrorCategory.RENDER:
        return "页面渲染出现问题，请刷新重试";

      case ErrorCategory.BUSINESS:
        return error.message || "操作失败，请稍后重试";

      case ErrorCategory.THIRD_PARTY:
        return "第三方服务暂时不可用，请稍后重试";

      default:
        return "应用遇到了一个意外错误，请重试";
    }
  }

  /**
   * 判断错误是否可恢复
   */
  private static isRecoverable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    // 严重错误通常不可恢复
    if (severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    // 权限错误需要重新登录
    if (category === ErrorCategory.PERMISSION) {
      return true; // 可通过重新登录恢复
    }

    // 网络错误可重试
    if (category === ErrorCategory.NETWORK) {
      return true;
    }

    // 渲染错误可刷新
    if (category === ErrorCategory.RENDER) {
      return true;
    }

    return true;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速处理错误
 */
export function handleError(error: Error, context?: Record<string, unknown>): StructuredError {
  return ErrorHandler.handle(error, context);
}

/**
 * 快速上报错误
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  const structuredError = ErrorHandler.handle(error, context);
  void ErrorReporter.report(structuredError);
}

/**
 * 配置错误上报
 */
export function configureErrorReporting(config: Partial<ErrorReportConfig>): void {
  ErrorReporter.configure(config);
}

// ============================================================================
// 导出
// ============================================================================

export default {
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ErrorClassifier,
  ErrorReporter,
  ErrorHandler,
  handleError,
  reportError,
  configureErrorReporting,
};

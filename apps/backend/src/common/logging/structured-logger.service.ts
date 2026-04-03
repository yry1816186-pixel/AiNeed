/**
 * @fileoverview Structured Logger Service - 企业级结构化日志系统
 *
 * 提供结构化JSON格式日志，支持：
 * - 请求ID追踪 (RequestId)
 * - 用户ID关联 (UserId)
 * - 时间戳 (ISO 8601)
 * - 敏感信息脱敏
 * - 多日志级别 (debug, log, warn, error)
 * - 上下文信息注入
 *
 * @example
 * ```typescript
 * // 基础使用
 * this.logger.log('用户登录成功', { userId: '123', email: 'test@example.com' });
 *
 * // 输出JSON格式
 * {
 *   "level": "info",
 *   "message": "用户登录成功",
 *   "timestamp": "2026-04-01T10:30:00.000Z",
 *   "context": "AuthService",
 *   "requestId": "req-abc123",
 *   "userId": "123",
 *   "data": { "email": "t***@example.com" }  // 脱敏后
 * }
 * ```
 */

import { Injectable, LoggerService, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AsyncLocalStorage } from "async_hooks";

/**
 * 日志级别枚举
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 结构化日志条目接口
 */
export interface StructuredLogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 日志上下文（通常是类名） */
  context: string;
  /** 请求ID（用于追踪请求链路） */
  requestId?: string;
  /** 用户ID */
  userId?: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
  /** 错误堆栈（仅error级别） */
  stack?: string;
  /** 环境标识 */
  env?: string;
  /** 服务名称 */
  service?: string;
}

/**
 * 请求上下文接口
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * 敏感字段配置
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "creditCard",
  "cvv",
  "ssn",
  "phone",
  "mobile",
  "idCard",
];

/**
 * 结构化日志服务
 *
 * @class StructuredLoggerService
 * @implements {LoggerService}
 */
@Injectable({ scope: Scope.DEFAULT })
export class StructuredLoggerService implements LoggerService {
  private readonly context?: string;
  private readonly asyncLocalStorage: AsyncLocalStorage<RequestContext>;
  private readonly isProduction: boolean;
  private readonly serviceName: string;
  private readonly logLevel: LogLevel;

  constructor(
    private readonly configService: ConfigService,
    asyncLocalStorage?: AsyncLocalStorage<RequestContext>,
  ) {
    this.asyncLocalStorage = asyncLocalStorage || new AsyncLocalStorage<RequestContext>();
    this.isProduction = this.configService.get<string>("NODE_ENV") === "production";
    this.serviceName = this.configService.get<string>("SERVICE_NAME", "aineed-backend");
    this.logLevel = this.configService.get<LogLevel>("LOG_LEVEL", "info");
  }

  /**
   * 设置上下文
   */
  setContext(context: string): void {
    (this as unknown as { context?: string }).context = context;
  }

  /**
   * 获取当前请求上下文
   */
  private getRequestContext(): Partial<RequestContext> {
    const store = this.asyncLocalStorage.getStore();
    return store || {};
  }

  /**
   * 创建结构化日志条目
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context: string,
    data?: Record<string, unknown>,
    stack?: string,
  ): StructuredLogEntry {
    const requestContext = this.getRequestContext();

    const entry: StructuredLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      env: this.isProduction ? "production" : "development",
      service: this.serviceName,
    };

    // 注入请求上下文
    if (requestContext.requestId) {
      entry.requestId = requestContext.requestId;
    }
    if (requestContext.userId) {
      entry.userId = requestContext.userId;
    }

    // 脱敏处理附加数据
    if (data && Object.keys(data).length > 0) {
      entry.data = this.sanitizeData(data);
    }

    // 错误堆栈
    if (stack) {
      entry.stack = stack;
    }

    return entry;
  }

  /**
   * 敏感信息脱敏
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // 检查是否为敏感字段
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = this.maskValue(value);
      } else if (typeof value === "string") {
        // 检查字符串是否包含敏感信息
        sanitized[key] = this.sanitizeString(value, key);
      } else if (value && typeof value === "object") {
        // 递归处理嵌套对象
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 脱敏字符串值
   */
  private sanitizeString(value: string, key: string): string {
    const lowerKey = key.toLowerCase();

    // 邮箱脱敏: test@example.com -> t***@example.com
    if (lowerKey.includes("email") && value.includes("@")) {
      const parts = value.split("@");
      const localPart = parts[0];
      const domain = parts[1];
      if (localPart && domain) {
        const maskedLocal = localPart.charAt(0) + "***";
        return `${maskedLocal}@${domain}`;
      }
    }

    // 手机号脱敏: 13812345678 -> 138****5678
    if (lowerKey.includes("phone") || lowerKey.includes("mobile")) {
      if (/^\d{11}$/.test(value)) {
        return value.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
      }
    }

    // 身份证脱敏: 110101199001011234 -> 110101********1234
    if (lowerKey.includes("idcard") || lowerKey.includes("id_card")) {
      if (/^\d{17}[\dXx]$/.test(value)) {
        return value.replace(/(\d{6})\d{8}(\d{4})/, "$1********$2");
      }
    }

    // 银行卡脱敏: 6222021234567890 -> 6222****7890
    if (lowerKey.includes("card") || lowerKey.includes("account")) {
      if (/^\d{16,19}$/.test(value)) {
        return value.replace(/(\d{4})\d+(\d{4})/, "$1****$2");
      }
    }

    return value;
  }

  /**
   * 遮罩敏感值
   */
  private maskValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "[REDACTED]";
    }

    const strValue = String(value);
    if (strValue.length <= 4) {
      return "****";
    }

    // 保留前后各2个字符
    return strValue.substring(0, 2) + "****" + strValue.substring(strValue.length - 2);
  }

  /**
   * 格式化输出日志
   */
  private formatOutput(entry: StructuredLogEntry): string {
    if (this.isProduction) {
      // 生产环境：JSON格式（便于日志聚合分析）
      return JSON.stringify(entry);
    } else {
      // 开发环境：可读格式 + JSON数据
      const { level, message, context, requestId, userId, data } = entry;
      const prefix = `[${level.toUpperCase()}] ${context}`;
      const contextInfo = requestId ? ` [req:${requestId}]` : "";
      const userInfo = userId ? ` [user:${userId}]` : "";

      if (data && Object.keys(data).length > 0) {
        return `${prefix}${contextInfo}${userInfo} ${message} | ${JSON.stringify(data)}`;
      }
      return `${prefix}${contextInfo}${userInfo} ${message}`;
    }
  }

  /**
   * 检查日志级别是否应该输出
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Debug级别日志
   */
  debug(message: string, context?: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  debug(message: string, contextOrData?: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (!this.shouldLog("debug")) return;

    const { context, data: logData } = this.parseArguments(contextOrData, data);
    const entry = this.createLogEntry("debug", message, context, logData);
    console.debug(this.formatOutput(entry));
  }

  /**
   * Info级别日志
   */
  log(message: string, context?: string, data?: Record<string, unknown>): void;
  log(message: string, data?: Record<string, unknown>): void;
  log(message: string, contextOrData?: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (!this.shouldLog("info")) return;

    const { context, data: logData } = this.parseArguments(contextOrData, data);
    const entry = this.createLogEntry("info", message, context, logData);
    console.log(this.formatOutput(entry));
  }

  /**
   * Warn级别日志
   */
  warn(message: string, context?: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  warn(message: string, contextOrData?: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (!this.shouldLog("warn")) return;

    const { context, data: logData } = this.parseArguments(contextOrData, data);
    const entry = this.createLogEntry("warn", message, context, logData);
    console.warn(this.formatOutput(entry));
  }

  /**
   * Error级别日志
   */
  error(message: string, trace?: string, context?: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  error(message: string, traceOrData?: string | Record<string, unknown>, contextOrData?: string | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (!this.shouldLog("error")) return;

    let trace: string | undefined;
    let context: string | undefined;
    let logData: Record<string, unknown> | undefined;

    if (typeof traceOrData === "string") {
      trace = traceOrData;
      if (typeof contextOrData === "string") {
        context = contextOrData;
        logData = data;
      } else {
        logData = contextOrData;
      }
    } else {
      logData = traceOrData;
    }

    const finalContext = context || this.context || "Application";
    const entry = this.createLogEntry("error", message, finalContext, logData, trace);
    console.error(this.formatOutput(entry));
  }

  /**
   * 解析参数重载
   */
  private parseArguments(
    contextOrData?: string | Record<string, unknown>,
    data?: Record<string, unknown>,
  ): { context: string; data?: Record<string, unknown> } {
    if (typeof contextOrData === "string") {
      return {
        context: contextOrData,
        data,
      };
    } else {
      return {
        context: this.context || "Application",
        data: contextOrData,
      };
    }
  }

  /**
   * 创建子日志器（带固定上下文）
   */
  createChildLogger(context: string): ContextualLogger {
    return new ContextualLogger(this, context);
  }

  /**
   * 获取AsyncLocalStorage实例（用于拦截器注入请求上下文）
   */
  getAsyncLocalStorage(): AsyncLocalStorage<RequestContext> {
    return this.asyncLocalStorage;
  }
}

/**
 * 带上下文的日志器
 */
export class ContextualLogger {
  constructor(
    private readonly logger: StructuredLoggerService,
    private readonly context: string,
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, this.context, data);
  }

  log(message: string, data?: Record<string, unknown>): void {
    this.logger.log(message, this.context, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, this.context, data);
  }

  error(message: string, trace?: string, data?: Record<string, unknown>): void {
    this.logger.error(message, trace, this.context, data);
  }
}

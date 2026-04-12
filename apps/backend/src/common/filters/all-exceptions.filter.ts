/**
 * @fileoverview 全局异常过滤器 - 企业级错误处理
 *
 * 提供统一的错误响应格式，支持：
 * - 请求ID追踪 (RequestId)
 * - 结构化日志记录
 * - 敏感信息脱敏
 * - 开发/生产环境区分
 * - 业务错误码映射
 * - 自定义异常处理 (BusinessException, ValidationException, NotFoundException, ForbiddenException)
 * - 数据库错误处理 (QueryFailedError)
 *
 * @example
 * ```typescript
 * // 在 main.ts 中全局应用
 * app.useGlobalFilters(new AllExceptionsFilter());
 * ```
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  Optional,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { StructuredLoggerService, RequestContext } from "../logging/structured-logger.service";
import { AsyncLocalStorage } from "async_hooks";
import {
  BusinessException,
  ValidationException,
  NotFoundException,
  ForbiddenException,
  ValidationErrorItem,
} from "../exceptions";
import { SentryService } from "../sentry/sentry.service";

/**
 * 验证错误项接口（兼容旧格式）
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * 标准API错误响应接口
 * 符合 API.md 文档规范
 */
export interface ErrorResponse {
  /** 5位业务错误码 */
  code: number;
  /** 错误消息 */
  message: string;
  /** 验证错误详情（可选） */
  errors?: ValidationError[];
  /** 错误详情（可选） */
  details?: Record<string, unknown>;
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 请求路径 */
  path: string;
  /** 请求ID（用于追踪） */
  requestId?: string;
  /** 堆栈信息（仅开发环境） */
  stack?: string;
}

/**
 * 业务错误码映射表
 * 格式: XXYYZ
 * - XX: 错误类别 (40=客户端, 50=服务端)
 * - YY: 具体错误类型
 * - Z: 严重程度 (0=低, 9=高)
 */
const BUSINESS_ERROR_CODES: Record<number, number> = {
  // 4xx 客户端错误
  400: 40000, // 通用请求错误
  401: 40100, // 认证失败
  403: 40300, // 权限不足
  404: 40400, // 资源不存在
  405: 40500, // 方法不允许
  409: 40900, // 资源冲突
  422: 42200, // 验证失败
  429: 42900, // 请求过于频繁
  // 5xx 服务端错误
  500: 50000, // 内部服务器错误
  502: 50200, // 网关错误
  503: 50300, // 服务不可用
  504: 50400, // 网关超时
};

/**
 * 敏感字段列表（用于日志脱敏）
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
  "email",
];

/**
 * 全局异常过滤器
 *
 * @class AllExceptionsFilter
 * @implements {ExceptionFilter}
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isProduction: boolean;
  private readonly internalLogger = new console.Console({
    stdout: process.stdout,
    stderr: process.stderr,
  });

  constructor(
    @Optional()
    @Inject("ASYNC_LOCAL_STORAGE")
    private readonly asyncLocalStorage?: AsyncLocalStorage<RequestContext>,
    @Optional()
    private readonly logger?: StructuredLoggerService,
    @Optional()
    private readonly sentryService?: SentryService,
  ) {
    this.isProduction = process.env.NODE_ENV === "production";
    if (this.logger) {
      this.logger.setContext("AllExceptionsFilter");
    }
  }

  /**
   * 捕获并处理异常
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logError(exception, request, errorResponse);

    this.reportToSentry(exception, request, errorResponse);

    const statusCode = this.getStatusCode(exception);

    response.status(statusCode).json(errorResponse);
  }

  /**
   * 构建标准化错误响应
   */
  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestId = this.getRequestId();

    // 处理自定义异常
    if (exception instanceof ValidationException) {
      return this.handleValidationException(exception, timestamp, path, requestId);
    }

    if (exception instanceof NotFoundException) {
      return this.handleNotFoundException(exception, timestamp, path, requestId);
    }

    if (exception instanceof ForbiddenException) {
      return this.handleForbiddenException(exception, timestamp, path, requestId);
    }

    if (exception instanceof BusinessException) {
      return this.handleBusinessException(exception, timestamp, path, requestId);
    }

    // 处理数据库错误
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleDatabaseError(exception, timestamp, path, requestId);
    }

    // 处理 HTTP 异常
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, timestamp, path, requestId);
    }

    // 处理通用错误
    return this.handleGenericError(exception, timestamp, path, requestId);
  }

  /**
   * 处理验证异常 (ValidationException)
   */
  private handleValidationException(
    exception: ValidationException,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    const response: ErrorResponse = {
      code: exception.code,
      message: exception.message,
      errors: exception.errors.map((e: ValidationErrorItem) => ({
        field: e.field,
        message: e.message,
      })),
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (!this.isProduction) {
      response.stack = exception.stack;
    }

    return response;
  }

  /**
   * 处理资源不存在异常 (NotFoundException)
   */
  private handleNotFoundException(
    exception: NotFoundException,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    const response: ErrorResponse = {
      code: exception.code,
      message: exception.message,
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (!this.isProduction) {
      response.stack = exception.stack;
    }

    return response;
  }

  /**
   * 处理权限不足异常 (ForbiddenException)
   */
  private handleForbiddenException(
    exception: ForbiddenException,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    const response: ErrorResponse = {
      code: exception.code,
      message: exception.message,
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (!this.isProduction) {
      response.stack = exception.stack;
    }

    return response;
  }

  /**
   * 处理业务异常 (BusinessException)
   */
  private handleBusinessException(
    exception: BusinessException,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    const response: ErrorResponse = {
      code: exception.businessCode,
      message: exception.message,
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    // 开发环境添加详情和堆栈
    if (!this.isProduction) {
      if (exception.details) {
        response.details = exception.details;
      }
      response.stack = exception.stack;
    }

    return response;
  }

  /**
   * 处理数据库错误 (Prisma)
   */
  private handleDatabaseError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    let message = "数据库操作失败";
    let code = 50001;

    // 解析 Prisma 错误码
    // https://www.prisma.io/docs/reference/api-reference/error-reference
    switch (exception.code) {
      case "P2002":
        // 唯一约束冲突
        message = "资源已存在";
        code = 40901;
        break;
      case "P2025":
        // 记录不存在
        message = "资源不存在";
        code = 40401;
        break;
      case "P2003":
        // 外键约束失败
        message = "关联资源不存在";
        code = 40402;
        break;
      case "P2011":
        // 非空约束失败
        message = "必填字段缺失";
        code = 42201;
        break;
      default:
        break;
    }

    const response: ErrorResponse = {
      code,
      message: this.isProduction ? message : exception.message,
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (!this.isProduction) {
      response.stack = exception.stack;
      response.details = {
        prismaCode: exception.code,
        meta: exception.meta,
      };
    }

    return response;
  }

  /**
   * 处理HTTP异常（NestJS内置异常）
   */
  private handleHttpException(
    exception: HttpException,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let errors: ValidationError[] | undefined = undefined;
    let code = this.getBusinessErrorCode(status);

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === "object") {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message = (responseObj.message as string) || exception.message;

      // 处理 class-validator 验证错误
      if (Array.isArray(responseObj.message)) {
        message = "Validation failed";
        errors = this.parseValidationErrors(responseObj.message as string[]);
        code = 40001; // 验证错误码
      }

      // 使用自定义错误码（如果提供）
      if (typeof responseObj.code === "number") {
        code = responseObj.code;
      }
    } else {
      message = exception.message;
    }

    // 合并数组消息
    if (Array.isArray(message)) {
      message = message.join(", ");
    }

    const response: ErrorResponse = {
      code,
      message,
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    if (errors && errors.length > 0) {
      response.errors = errors;
    }

    // 开发环境添加堆栈信息
    if (!this.isProduction) {
      response.stack = exception.stack;
    }

    return response;
  }

  /**
   * 解析 class-validator 验证错误
   */
  private parseValidationErrors(messages: string[]): ValidationError[] {
    return messages.map((msg) => {
      // 尝试匹配 "fieldName error message" 格式
      const match = msg.match(/^(\w+)\s+(.+)$/);
      if (match) {
        return {
          field: match[1] ?? "unknown",
          message: match[2] ?? msg,
        };
      }
      return { field: "unknown", message: msg };
    });
  }

  /**
   * 处理通用/意外错误
   */
  private handleGenericError(
    exception: unknown,
    timestamp: string,
    path: string,
    requestId: string | undefined,
  ): ErrorResponse {
    const error = exception as Error;

    const response: ErrorResponse = {
      code: 50000, // 内部服务器错误码
      message: this.isProduction
        ? "An unexpected error occurred"
        : error.message || "Unknown error",
      timestamp,
      path,
    };

    if (requestId) {
      response.requestId = requestId;
    }

    // 开发环境添加堆栈信息
    if (!this.isProduction && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  /**
   * 获取HTTP状态码
   */
  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 获取业务错误码
   */
  private getBusinessErrorCode(status: number): number {
    return BUSINESS_ERROR_CODES[status] || 50000;
  }

  /**
   * 获取请求ID
   */
  private getRequestId(): string | undefined {
    try {
      const store = this.asyncLocalStorage?.getStore();
      return store?.requestId;
    } catch {
      return undefined;
    }
  }

  /**
   * 记录错误日志（带敏感信息脱敏）
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    // 脱敏请求体
    const sanitizedBody = this.sanitizeRequestBody(request.body);

    // 构建日志数据
    const logData = {
      method: request.method,
      url: request.url,
      query: request.query,
      body: sanitizedBody,
      ip: this.maskIp(request.ip),
      userAgent: request.headers["user-agent"]?.substring(0, 100),
      errorCode: errorResponse.code,
      errorMessage: errorResponse.message,
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status >= 500) {
        // 服务端错误 - Error级别
        if (this.logger) {
          this.logger.error(
            `Server error: ${exception.message}`,
            exception.stack,
            "HttpException",
            logData,
          );
        } else {
          this.internalLogger.error(`Server error: ${exception.message}`, exception.stack);
        }
      } else if (status >= 400) {
        // 客户端错误 - Warn级别
        if (this.logger) {
          this.logger.warn("Client error occurred", "HttpException", logData);
        } else {
          this.internalLogger.warn("Client error occurred");
        }
      }
    } else {
      // 意外错误 - Error级别
      const error = exception as Error;
      if (this.logger) {
        this.logger.error(
          `Unexpected error: ${error.message}`,
          error.stack,
          "UnhandledException",
          logData,
        );
      } else {
        this.internalLogger.error(`Unexpected error: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * 脱敏请求体
   */
  private sanitizeRequestBody(body: unknown): unknown {
    if (!body || typeof body !== "object") {
      return body;
    }

    const sanitized: Record<string, unknown> = {};
    const bodyObj = body as Record<string, unknown>;

    for (const [key, value] of Object.entries(bodyObj)) {
      const lowerKey = key.toLowerCase();

      // 检查是否为敏感字段
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = this.maskValue(value);
      } else if (value && typeof value === "object") {
        // 递归处理嵌套对象
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
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
   * 遮罩IP地址
   */
  private maskIp(ip: string | undefined): string {
    if (!ip) return "unknown";

    if (ip.includes(".")) {
      const parts = ip.split(".");
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.*.*`;
      }
    }

    if (ip.includes(":")) {
      const parts = ip.split(":");
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}:****`;
      }
    }

    return ip;
  }

  private reportToSentry(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    if (!this.sentryService?.isEnabled()) return;

    const statusCode = this.getStatusCode(exception);

    if (statusCode < 500 && !(exception instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    const requestId = this.getRequestId();
    const sanitizedBody = this.sanitizeRequestBody(request.body);

    this.sentryService.setTag("error_code", String(errorResponse.code));
    this.sentryService.setTag("http_method", request.method);
    this.sentryService.setTag("http_status", String(statusCode));

    if (requestId) {
      this.sentryService.setTag("request_id", requestId);
    }

    const store = this.asyncLocalStorage?.getStore();
    if (store?.userId) {
      this.sentryService.setUser({ id: store.userId });
    }

    this.sentryService.captureException(exception, {
      request: {
        method: request.method,
        url: request.url,
        query: request.query,
        body: sanitizedBody,
        headers: {
          "user-agent": request.headers["user-agent"]?.substring(0, 100),
          "content-type": request.headers["content-type"],
        },
      },
      errorResponse: {
        code: errorResponse.code,
        message: errorResponse.message,
        requestId,
      },
    });
  }
}

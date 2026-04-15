/**
 * @fileoverview 响应转换拦截器 - 企业级响应处理
 *
 * 提供统一的响应格式，支持：
 * - 请求ID追踪 (RequestId)
 * - 响应时间记录
 * - 成功/失败统一格式
 * - 跳过转换装饰器
 *
 * @example
 * ```typescript
 * // 在模块中全局注册
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: TransformInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 *
 * // 跳过转换（返回原始响应）
 * @SkipTransform()
 * @Get('raw')
 * getRawData() {
 *   return { raw: true };
 * }
 * ```
 */

import { AsyncLocalStorage } from "async_hooks";

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
 SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

import { StructuredLoggerService, RequestContext } from "../logging/structured-logger.service";

/**
 * 跳过响应转换的元数据键
 */
export const SKIP_RESPONSE_TRANSFORM = "skip_response_transform";

/**
 * 请求开始时间 Symbol
 */
const REQUEST_START_TIME = Symbol("requestStartTime");

/**
 * 扩展的 Request 类型，包含请求开始时间
 */
interface RequestWithStartTime extends Request {
  [REQUEST_START_TIME]?: number;
}

/**
 * 标准API成功响应接口
 */
export interface ApiResponse<T> {
  /** 业务状态码 (0=成功) */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 请求路径 */
  path: string;
  /** 请求ID（用于追踪） */
  requestId?: string;
  /** 响应时间（毫秒） */
  duration?: number;
}

/**
 * 响应转换拦截器
 *
 * @class TransformInterceptor
 * @implements {NestInterceptor}
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject("ASYNC_LOCAL_STORAGE")
    private readonly asyncLocalStorage: AsyncLocalStorage<RequestContext>,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext("TransformInterceptor");
  }

  /**
   * 拦截请求，转换响应格式
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    // 检查是否跳过转换
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithStartTime>();
    const response = context.switchToHttp().getResponse<Response>();

    // 记录请求开始时间
    request[REQUEST_START_TIME] = Date.now();

    return next.handle().pipe(
      // 记录响应时间
      tap(() => {
        const startTime = request[REQUEST_START_TIME];
        if (startTime) {
          const duration = Date.now() - startTime;
          response.locals.duration = duration;
        }
      }),
      // 转换响应格式
      map((data: T) => {
        const startTime = request[REQUEST_START_TIME];
        const duration = startTime ? Date.now() - startTime : undefined;
        const requestId = this.getRequestId();

        const apiResponse: ApiResponse<T> = {
          code: 0,
          message: "success",
          data: data ?? ({} as T),
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        if (requestId) {
          apiResponse.requestId = requestId;
        }

        if (duration !== undefined) {
          apiResponse.duration = duration;
        }

        // 记录成功响应日志（仅记录慢请求）
        if (duration && duration > 1000) {
          this.logger.warn("Slow request detected", "Performance", {
            method: request.method,
            url: request.url,
            duration: `${duration}ms`,
          });
        }

        return apiResponse;
      }),
    );
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
}

/**
 * 跳过响应转换装饰器
 *
 * @example
 * ```typescript
 * @SkipTransform()
 * @Get('download')
 * downloadFile(@Res() res: Response) {
 *   return res.download('file.pdf');
 * }
 * ```
 */

export const SkipTransform = () => SetMetadata(SKIP_RESPONSE_TRANSFORM, true);

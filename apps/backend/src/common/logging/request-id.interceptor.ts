/**
 * @fileoverview Request ID Interceptor - 请求追踪拦截器
 *
 * 自动为每个请求生成或提取请求ID，并注入到AsyncLocalStorage上下文中，
 * 实现请求链路追踪。
 *
 * @example
 * ```typescript
 * // 在模块中注册
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: RequestIdInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { Request, Response } from "express";
import { StructuredLoggerService, RequestContext } from "./structured-logger.service";

/**
 * 请求ID Header名称
 */
const REQUEST_ID_HEADER = "X-Request-Id";

/**
 * 请求开始时间Symbol（用于存储在Request对象上）
 */
const REQUEST_START_TIME = Symbol("requestStartTime");

/**
 * 请求ID拦截器
 *
 * @class RequestIdInterceptor
 * @implements {NestInterceptor}
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    @Inject("ASYNC_LOCAL_STORAGE")
    private readonly asyncLocalStorage: AsyncLocalStorage<RequestContext>,
    private readonly logger: StructuredLoggerService,
  ) {
    // 如果没有注入AsyncLocalStorage，使用logger的实例
    if (!this.asyncLocalStorage) {
      this.asyncLocalStorage = logger.getAsyncLocalStorage();
    }
  }

  /**
   * 拦截请求，注入请求ID和用户ID到上下文
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 生成或提取请求ID
    const requestId = this.getOrGenerateRequestId(request);

    // 提取用户ID（如果已认证）
    const userId = this.extractUserId(request);

    // 创建请求上下文
    const requestContext: RequestContext = {
      requestId,
      userId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    };

    // 记录请求开始时间
    (request as unknown as Record<symbol, number>)[REQUEST_START_TIME] = Date.now();

    // 设置响应头
    response.setHeader(REQUEST_ID_HEADER, requestId);

    // 在AsyncLocalStorage上下文中执行
    return new Observable((subscriber) => {
      this.asyncLocalStorage.run(requestContext, () => {
        // 记录请求开始日志
        this.logger.log("请求开始", "HttpRequest", {
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.headers["user-agent"]?.substring(0, 100),
        });

        next.handle()
          .pipe(
            tap({
              next: (data) => {
                const duration = Date.now() - ((request as unknown as Record<symbol, number>)[REQUEST_START_TIME] || 0);

                // 记录请求完成日志
                this.logger.log("请求完成", "HttpRequest", {
                  method: request.method,
                  url: request.url,
                  statusCode: response.statusCode,
                  duration: `${duration}ms`,
                });

                subscriber.next(data);
                subscriber.complete();
              },
              error: (error) => {
                const duration = Date.now() - ((request as unknown as Record<symbol, number>)[REQUEST_START_TIME] || 0);

                // 记录请求错误日志
                this.logger.error("请求失败", error.stack, "HttpRequest", {
                  method: request.method,
                  url: request.url,
                  statusCode: error.status || 500,
                  duration: `${duration}ms`,
                  errorMessage: error.message,
                });

                subscriber.error(error);
              },
            }),
          )
          .subscribe();
      });
    });
  }

  /**
   * 获取或生成请求ID
   */
  private getOrGenerateRequestId(request: Request): string {
    // 优先从请求头获取（支持分布式追踪）
    const headerRequestId = request.headers[REQUEST_ID_HEADER.toLowerCase()];
    if (typeof headerRequestId === "string" && headerRequestId.trim()) {
      return headerRequestId.trim();
    }

    // 从查询参数获取
    const queryRequestId = request.query.requestId;
    if (typeof queryRequestId === "string" && queryRequestId.trim()) {
      return queryRequestId.trim();
    }

    // 生成新的请求ID
    return `req_${randomUUID().replace(/-/g, "")}`;
  }

  /**
   * 提取用户ID
   */
  private extractUserId(request: Request): string | undefined {
    // 从JWT payload中提取
    const user = request.user as { id?: string; sub?: string } | undefined;
    if (user?.id) {
      return user.id;
    }
    if (user?.sub) {
      return user.sub;
    }

    // 从请求头提取
    const userIdHeader = request.headers["x-user-id"];
    if (typeof userIdHeader === "string" && userIdHeader.trim()) {
      return userIdHeader.trim();
    }

    return undefined;
  }
}

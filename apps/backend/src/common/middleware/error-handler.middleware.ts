/**
 * @fileoverview 全局错误处理中间件
 *
 * 提供请求级别的错误捕获和处理能力：
 * - 请求上下文注入（requestId, timestamp）
 * - 异常捕获和转换
 * - 请求超时处理
 * - 错误响应标准化
 *
 * 与 AllExceptionsFilter 配合使用，形成完整的错误处理链：
 * Middleware (请求预处理) -> Controller -> Service -> Filter (异常后处理)
 *
 * @example
 * ```typescript
 * // 在 main.ts 中应用
 * app.use(new ErrorHandlerMiddleware().use);
 * ```
 */

import { Injectable, NestMiddleware, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 错误响应接口
 */
interface ErrorResponseBody {
  code: number;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId: string;
  path: string;
}

/**
 * 扩展 Request 接口
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 请求唯一标识符 */
      requestId: string;
      /** 请求开始时间戳 */
      requestStartTime: number;
    }
  }
}

/**
 * 全局错误处理中间件
 *
 * @class ErrorHandlerMiddleware
 * @implements {NestMiddleware}
 */
@Injectable()
export class ErrorHandlerMiddleware implements NestMiddleware {
  private readonly isProduction: boolean;
  private readonly logger = new Logger('ErrorHandlerMiddleware');

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * 中间件主方法
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // 注入请求上下文
    this.injectRequestContext(req, res);

    // 设置请求超时处理
    this.setupTimeoutHandler(req, res);

    // 设置响应完成监听
    this.setupResponseListener(req, res);

    // 包装响应的 json 方法以标准化错误响应
    this.wrapJsonResponse(req, res);

    next();
  }

  /**
   * 注入请求上下文
   */
  private injectRequestContext(req: Request, res: Response): void {
    req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestStartTime = Date.now();

    // 设置响应头
    res.setHeader('X-Request-Id', req.requestId);
  }

  /**
   * 设置请求超时处理
   */
  private setupTimeoutHandler(req: Request, res: Response): void {
    const timeout = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

    req.setTimeout(timeout, () => {
      this.handleTimeout(req, res);
    });

    res.setTimeout(timeout, () => {
      this.handleTimeout(req, res);
    });
  }

  /**
   * 处理请求超时
   */
  private handleTimeout(req: Request, res: Response): void {
    if (!res.headersSent) {
      const errorResponse: ErrorResponseBody = {
        code: 50400,
        message: '请求超时',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        path: req.url,
      };

      this.logger.warn({
        message: 'Request timeout',
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: Date.now() - req.requestStartTime,
      });

      res.status(HttpStatus.GATEWAY_TIMEOUT).json(errorResponse);
    }
  }

  /**
   * 设置响应完成监听
   */
  private setupResponseListener(req: Request, res: Response): void {
    res.on('finish', () => {
      const duration = Date.now() - req.requestStartTime;

      if (res.statusCode >= 400) {
        this.logger.warn({
          message: 'Request completed with error',
          requestId: req.requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
        });
      }
    });
  }

  /**
   * 包装响应的 json 方法
   */
  private wrapJsonResponse(req: Request, res: Response): void {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown): Response => {
      // 如果是错误响应且未标准化，进行标准化处理
      if (res.statusCode >= 400 && body && typeof body === 'object') {
        const bodyObj = body as Record<string, unknown>;

        // 检查是否已经是标准格式
        if (!('code' in bodyObj) || !('timestamp' in bodyObj)) {
          const standardizedBody = this.standardizeErrorResponse(
            bodyObj,
            req,
            res.statusCode,
          );
          return originalJson(standardizedBody);
        }
      }

      return originalJson(body);
    };
  }

  /**
   * 标准化错误响应
   */
  private standardizeErrorResponse(
    body: Record<string, unknown>,
    req: Request,
    statusCode: number,
  ): ErrorResponseBody {
    return {
      code: (body.code as number) ?? this.inferErrorCode(statusCode),
      message: (body.message as string) ?? 'An error occurred',
      details: body.details as Record<string, unknown> | undefined,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      path: req.url,
    };
  }

  /**
   * 根据 HTTP 状态码推断错误码
   */
  private inferErrorCode(statusCode: number): number {
    const mapping: Record<number, number> = {
      400: 40000,
      401: 40100,
      403: 40300,
      404: 40400,
      409: 40900,
      422: 42200,
      429: 42900,
      500: 50000,
      502: 50200,
      503: 50300,
      504: 50400,
    };

    return mapping[statusCode] ?? 50000;
  }
}

// 导出一个工厂函数，方便在 main.ts 中使用
export function createErrorHandlerMiddleware(): ErrorHandlerMiddleware {
  return new ErrorHandlerMiddleware();
}

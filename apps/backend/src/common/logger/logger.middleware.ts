import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { PINO_ASYNC_LOCAL_STORAGE } from './logger.module';
import { PinoLoggerService } from './logger.service';

interface RequestContext {
  requestId: string;
  userId?: string;
  [key: string]: unknown;
}

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(
    @Inject(PINO_ASYNC_LOCAL_STORAGE)
    private readonly asyncLocalStorage: AsyncLocalStorage<RequestContext>,
    private readonly logger: PinoLoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = this.getOrGenerateTraceId(req);
    const userId = this.extractUserId(req);
    const startTime = Date.now();

    const requestContext: RequestContext = {
      requestId: traceId,
      userId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    };

    res.setHeader('X-Request-Id', traceId);

    this.logger.log('Request started', 'TraceIdMiddleware', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      this.logger.log('Request completed', 'TraceIdMiddleware', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    });

    res.on('error', (error: Error) => {
      const duration = Date.now() - startTime;

      this.logger.error('Request failed', error.stack, 'TraceIdMiddleware', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode || 500,
        duration: `${duration}ms`,
        errorMessage: error.message,
      });
    });

    this.asyncLocalStorage.run(requestContext, () => {
      next();
    });
  }

  private getOrGenerateTraceId(req: Request): string {
    const headerTraceId = req.headers['x-request-id'];
    if (typeof headerTraceId === 'string' && headerTraceId.trim()) {
      return headerTraceId.trim();
    }

    const queryTraceId = req.query.requestId;
    if (typeof queryTraceId === 'string' && queryTraceId.trim()) {
      return queryTraceId.trim();
    }

    return `req_${randomUUID().replace(/-/g, '')}`;
  }

  private extractUserId(req: Request): string | undefined {
    const user = req.user as { id?: string; sub?: string } | undefined;
    if (user?.id) {return user.id;}
    if (user?.sub) {return user.sub;}

    const userIdHeader = req.headers['x-user-id'];
    if (typeof userIdHeader === 'string' && userIdHeader.trim()) {
      return userIdHeader.trim();
    }

    return undefined;
  }
}

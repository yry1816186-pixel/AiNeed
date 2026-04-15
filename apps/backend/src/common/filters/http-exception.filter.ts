import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  BusinessException,
  ValidationException,
  NotFoundException,
  ForbiddenException,
} from '../exceptions';

interface JsonApiErrorSource {
  pointer?: string;
  parameter?: string;
}

interface JsonApiErrorMeta {
  timestamp: string;
  requestId?: string;
  stack?: string;
  details?: Record<string, unknown>;
}

interface JsonApiError {
  status: string;
  code: string;
  title: string;
  detail: string;
  source?: JsonApiErrorSource;
  meta?: JsonApiErrorMeta;
}

interface JsonApiErrorResponse {
  errors: JsonApiError[];
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.getRequestId(request);
    const timestamp = new Date().toISOString();

    const errors = this.mapExceptionToErrors(exception, requestId, timestamp);

    const status = exception.getStatus();

    response.status(status).json({ errors } as JsonApiErrorResponse);
  }

  private mapExceptionToErrors(
    exception: HttpException,
    requestId: string | undefined,
    timestamp: string,
  ): JsonApiError[] {
    if (exception instanceof ValidationException) {
      return this.mapValidationException(exception, requestId, timestamp);
    }

    if (exception instanceof BusinessException) {
      return this.mapBusinessException(exception, requestId, timestamp);
    }

    if (exception instanceof NotFoundException) {
      return this.mapNotFoundException(exception, requestId, timestamp);
    }

    if (exception instanceof ForbiddenException) {
      return this.mapForbiddenException(exception, requestId, timestamp);
    }

    return this.mapGenericHttpException(exception, requestId, timestamp);
  }

  private mapValidationException(
    exception: ValidationException,
    requestId: string | undefined,
    timestamp: string,
  ): JsonApiError[] {
    return exception.errors.map((error) => {
      const meta: JsonApiErrorMeta = { timestamp };
      if (requestId) {
        meta.requestId = requestId;
      }
      if (!this.isProduction && exception.stack) {
        meta.stack = exception.stack;
      }

      return {
        status: String(HttpStatus.UNPROCESSABLE_ENTITY),
        code: String(exception.code),
        title: 'Unprocessable Entity',
        detail: error.message,
        source: { pointer: `/data/attributes/${error.field}` },
        meta,
      };
    });
  }

  private mapBusinessException(
    exception: BusinessException,
    requestId: string | undefined,
    timestamp: string,
  ): JsonApiError[] {
    const meta: JsonApiErrorMeta = { timestamp };
    if (requestId) {
      meta.requestId = requestId;
    }
    if (exception.details) {
      meta.details = exception.details;
    }
    if (!this.isProduction && exception.stack) {
      meta.stack = exception.stack;
    }

    return [
      {
        status: String(exception.httpStatus),
        code: String(exception.businessCode),
        title: exception.errorKey,
        detail: exception.message,
        meta,
      },
    ];
  }

  private mapNotFoundException(
    exception: NotFoundException,
    requestId: string | undefined,
    timestamp: string,
  ): JsonApiError[] {
    const meta: JsonApiErrorMeta = { timestamp };
    if (requestId) {
      meta.requestId = requestId;
    }
    if (!this.isProduction && exception.stack) {
      meta.stack = exception.stack;
    }

    return [
      {
        status: String(HttpStatus.NOT_FOUND),
        code: 'RESOURCE_NOT_FOUND',
        title: 'Not Found',
        detail: exception.message,
        meta,
      },
    ];
  }

  private mapForbiddenException(
    exception: ForbiddenException,
    requestId: string | undefined,
    timestamp: string,
  ): JsonApiError[] {
    const meta: JsonApiErrorMeta = { timestamp };
    if (requestId) {
      meta.requestId = requestId;
    }
    if (!this.isProduction && exception.stack) {
      meta.stack = exception.stack;
    }

    return [
      {
        status: String(HttpStatus.FORBIDDEN),
        code: 'FORBIDDEN',
        title: 'Forbidden',
        detail: exception.message,
        meta,
      },
    ];
  }

  private mapGenericHttpException(
    exception: HttpException,
    requestId: string | undefined,
    timestamp: string,
  ): JsonApiError[] {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const meta: JsonApiErrorMeta = { timestamp };
    if (requestId) {
      meta.requestId = requestId;
    }
    if (!this.isProduction && exception.stack) {
      meta.stack = exception.stack;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;

      if (Array.isArray(responseObj.message)) {
        return (responseObj.message as string[]).map((msg) => {
          const match = msg.match(/^(\w+)\s+(.+)$/);
          const pointer = match ? `/data/attributes/${match[1]}` : undefined;

          return {
            status: String(status),
            code: 'VALIDATION_ERROR',
            title: this.getStatusTitle(status),
            detail: msg,
            source: pointer ? { pointer } : undefined,
            meta,
          };
        });
      }
    }

    const detail = this.extractDetail(exceptionResponse, exception.message);

    return [
      {
        status: String(status),
        code: this.getErrorCode(status),
        title: this.getStatusTitle(status),
        detail,
        meta,
      },
    ];
  }

  private getRequestId(request: Request): string | undefined {
    return (request as Request & { requestId?: string }).requestId
      || (request.headers['x-request-id'] as string | undefined);
  }

  private extractDetail(
    exceptionResponse: string | object,
    fallback: string,
  ): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      if (typeof responseObj.message === 'string') {
        return responseObj.message;
      }
    }

    return fallback;
  }

  private getStatusTitle(status: number): string {
    const titles: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
      [HttpStatus.GATEWAY_TIMEOUT]: 'Gateway Timeout',
    };

    return titles[status] || 'Error';
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [HttpStatus.GATEWAY_TIMEOUT]: 'GATEWAY_TIMEOUT',
    };

    return codes[status] || 'ERROR';
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import {
  BusinessException,
} from '../exceptions/business.exception';
import {
  ValidationException,
} from '../exceptions/validation.exception';
import {
  NotFoundException,
} from '../exceptions/not-found.exception';
import {
  ForbiddenException,
} from '../exceptions/forbidden.exception';
import {
  JsonApiError,
} from './json-api.interceptor';

/**
 * 带有可选 stack 属性的异常接口
 */
interface ExceptionWithStack {
  stack?: string;
}

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
    }>();

    const requestId = request.headers['x-request-id'] as string | undefined;

    return next.handle().pipe(
      catchError((exception: unknown) => {
        const jsonApiErrors = this.mapToJsonApiErrors(exception, requestId);
        const mappedException = this.mapToHttpException(exception, jsonApiErrors);

        throw mappedException;
      }),
    );
  }

  private mapToJsonApiErrors(exception: unknown, requestId?: string): JsonApiError[] {
    const timestamp = new Date().toISOString();
    const baseMeta: Record<string, unknown> = { timestamp };
    if (requestId) {
      baseMeta.requestId = requestId;
    }

    if (exception instanceof ValidationException) {
      return exception.errors.map((error) => {
        const meta: Record<string, unknown> = { ...baseMeta };
        if (!this.isProduction && error.constraint) {
          meta.constraint = error.constraint;
        }

        return {
          status: String(HttpStatus.UNPROCESSABLE_ENTITY),
          code: String(exception.code),
          title: 'Validation Error',
          detail: error.message,
          source: {
            pointer: `/${error.field.replace(/\./g, '/')}`,
          },
          meta,
        } as JsonApiError;
      });
    }

    if (exception instanceof NotFoundException) {
      const meta: Record<string, unknown> = { ...baseMeta };
      const notFoundEx = exception as ExceptionWithStack;
      if (!this.isProduction && notFoundEx.stack) {
        meta.stack = notFoundEx.stack;
      }

      return [
        {
          status: String(HttpStatus.NOT_FOUND),
          code: String(exception.code),
          title: 'Not Found',
          detail: exception.message,
          source: {
            pointer: `/${exception.resourceType.toLowerCase()}`,
          },
          meta,
        } as JsonApiError,
      ];
    }

    if (exception instanceof ForbiddenException) {
      const meta: Record<string, unknown> = { ...baseMeta };
      const forbiddenEx = exception as ExceptionWithStack;
      if (!this.isProduction && forbiddenEx.stack) {
        meta.stack = forbiddenEx.stack;
      }

      return [
        {
          status: String(HttpStatus.FORBIDDEN),
          code: String(exception.code),
          title: 'Forbidden',
          detail: exception.message,
          source: {
            parameter: exception.requiredPermission ?? exception.operation,
          },
          meta,
        } as JsonApiError,
      ];
    }

    if (exception instanceof BusinessException) {
      const meta: Record<string, unknown> = { ...baseMeta };
      if (!this.isProduction) {
        if (exception.details) {
          meta.details = exception.details;
        }
        const businessEx = exception as ExceptionWithStack;
        if (businessEx.stack) {
          meta.stack = businessEx.stack;
        }
      }

      return [
        {
          status: String(exception.httpStatus),
          code: String(exception.businessCode),
          title: this.getTitleForStatus(exception.httpStatus),
          detail: exception.message,
          source: {
            parameter: exception.errorKey,
          },
          meta,
        } as JsonApiError,
      ];
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, title, detail } = this.mapPrismaError(exception);
      const meta: Record<string, unknown> = { ...baseMeta };
      if (!this.isProduction) {
        meta.prismaCode = exception.code;
        meta.meta = exception.meta;
        const prismaEx = exception as ExceptionWithStack;
        if (prismaEx.stack) {
          meta.stack = prismaEx.stack;
        }
      }

      return [
        {
          status: String(status),
          code: String(status * 100 + 1),
          title,
          detail: this.isProduction ? detail : exception.message,
          meta,
        } as JsonApiError,
      ];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let detail: string;
      let sourcePointer: string | undefined;
      let sourceParameter: string | undefined;

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (Array.isArray(responseObj.message)) {
          detail = (responseObj.message as string[]).join('; ');
          sourcePointer = '/request-body';
        } else {
          detail = String(responseObj.message ?? exception.message);
        }
      } else {
        detail = exception.message;
      }

      const meta: Record<string, unknown> = { ...baseMeta };
      const httpEx = exception as ExceptionWithStack;
      if (!this.isProduction && httpEx.stack) {
        meta.stack = httpEx.stack;
      }

      const error: JsonApiError = {
        status: String(status),
        code: String(status * 100),
        title: this.getTitleForStatus(status),
        detail,
        meta,
      };

      if (sourcePointer) {
        error.source = { pointer: sourcePointer };
      } else if (sourceParameter) {
        error.source = { parameter: sourceParameter };
      }

      return [error];
    }

    const error = exception as Error;
    const meta: Record<string, unknown> = { ...baseMeta };
    if (!this.isProduction && error.stack) {
      meta.stack = error.stack;
    }

    return [
      {
        status: String(HttpStatus.INTERNAL_SERVER_ERROR),
        code: '50000',
        title: 'Internal Server Error',
        detail: this.isProduction ? 'An unexpected error occurred' : (error.message || 'Unknown error'),
        meta,
      } as JsonApiError,
    ];
  }

  private mapToHttpException(exception: unknown, jsonApiErrors: JsonApiError[]): HttpException {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = this.getPrismaStatusCode(exception);
    }

    const response = {
      errors: jsonApiErrors,
    };

    return new HttpException(response, statusCode);
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    title: string;
    detail: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          title: 'Conflict',
          detail: 'Resource already exists',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Not Found',
          detail: 'Resource not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.NOT_FOUND,
          title: 'Not Found',
          detail: 'Related resource not found',
        };
      case 'P2011':
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          title: 'Unprocessable Entity',
          detail: 'Required field is missing',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          title: 'Internal Server Error',
          detail: 'Database operation failed',
        };
    }
  }

  private getPrismaStatusCode(exception: Prisma.PrismaClientKnownRequestError): number {
    const codeMap: Record<string, number> = {
      P2002: HttpStatus.CONFLICT,
      P2025: HttpStatus.NOT_FOUND,
      P2003: HttpStatus.NOT_FOUND,
      P2011: HttpStatus.UNPROCESSABLE_ENTITY,
    };

    return codeMap[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getTitleForStatus(status: number): string {
    const titles: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
      [HttpStatus.GATEWAY_TIMEOUT]: 'Gateway Timeout',
    };

    return titles[status] ?? 'Error';
  }
}

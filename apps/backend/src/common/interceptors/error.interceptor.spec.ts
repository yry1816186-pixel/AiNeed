import {
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { of, throwError } from 'rxjs';


import { BusinessException } from '../exceptions/business.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ValidationException } from '../exceptions/validation.exception';

import { ErrorInterceptor } from './error.interceptor';

function createMockContext(requestId?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: requestId ? { 'x-request-id': requestId } : {},
      }),
    }),
  } as ExecutionContext;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockCallHandler(error: any) {
  return { handle: () => throwError(() => error) } as CallHandler;
}

describe('ErrorInterceptor', () => {
  let interceptor: ErrorInterceptor;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    interceptor = new ErrorInterceptor();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('ValidationException', () => {
    it('should map each validation error to a separate JsonApiError with source.pointer', (done) => {
      const exception = new ValidationException([
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ]);

      interceptor
        .intercept(createMockContext('req-1'), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err).toBeInstanceOf(HttpException);
            expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
            const body = err.getResponse();
            expect(body.errors).toHaveLength(2);
            expect(body.errors[0].source.pointer).toBe('/email');
            expect(body.errors[0].detail).toBe('Invalid email format');
            expect(body.errors[1].source.pointer).toBe('/password');
            expect(body.errors[1].detail).toBe('Password too short');
            expect(body.errors[0].meta.requestId).toBe('req-1');
            expect(body.errors[0].meta.timestamp).toBeDefined();
            done();
          },
        });
    });

    it('should include constraint in meta in non-production', (done) => {
      const exception = new ValidationException([
        { field: 'email', message: 'Invalid', constraint: 'isEmail' },
      ]);

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].meta.constraint).toBe('isEmail');
            done();
          },
        });
    });
  });

  describe('NotFoundException', () => {
    it('should map to 404 with source.pointer', (done) => {
      const exception = new NotFoundException('User', 'user-123');

      interceptor
        .intercept(createMockContext('req-2'), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
            const body = err.getResponse();
            expect(body.errors[0].status).toBe('404');
            expect(body.errors[0].source.pointer).toBe('/user');
            expect(body.errors[0].detail).toBe('User 不存在');
            done();
          },
        });
    });
  });

  describe('ForbiddenException', () => {
    it('should map to 403 with source.parameter', (done) => {
      const exception = new ForbiddenException('delete_user', 'user:delete');

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
            const body = err.getResponse();
            expect(body.errors[0].status).toBe('403');
            expect(body.errors[0].source.parameter).toBe('user:delete');
            done();
          },
        });
    });

    it('should use operation as source.parameter when requiredPermission is absent', (done) => {
      const exception = new ForbiddenException('some_operation');

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].source.parameter).toBe('some_operation');
            done();
          },
        });
    });
  });

  describe('BusinessException', () => {
    it('should map with businessCode, errorKey, and details in meta', (done) => {
      const exception = new BusinessException(
        'INSUFFICIENT_BALANCE',
        'Balance too low',
        { currentBalance: 50, required: 100 },
        40103,
        HttpStatus.BAD_REQUEST,
      );

      interceptor
        .intercept(createMockContext('req-3'), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            const body = err.getResponse();
            expect(body.errors[0].code).toBe('40103');
            expect(body.errors[0].source.parameter).toBe('INSUFFICIENT_BALANCE');
            expect(body.errors[0].detail).toBe('Balance too low');
            expect(body.errors[0].meta.details).toEqual({
              currentBalance: 50,
              required: 100,
            });
            done();
          },
        });
    });
  });

  describe('Prisma errors', () => {
    it('should map P2002 to 409 Conflict', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['email'] } } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
            const body = err.getResponse();
            expect(body.errors[0].status).toBe('409');
            expect(body.errors[0].title).toBe('Conflict');
            done();
          },
        });
    });

    it('should map P2025 to 404 Not Found', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Record not found',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P2025', clientVersion: '5.0.0' } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
            const body = err.getResponse();
            expect(body.errors[0].status).toBe('404');
            done();
          },
        });
    });

    it('should map P2003 to 404 Not Found', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P2003', clientVersion: '5.0.0' } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
            done();
          },
        });
    });

    it('should map P2011 to 422 Unprocessable Entity', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Null constraint violation',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P2011', clientVersion: '5.0.0' } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
            done();
          },
        });
    });

    it('should map unknown Prisma error to 500', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Unknown error',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P9999', clientVersion: '5.0.0' } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
            done();
          },
        });
    });

    it('should include prismaCode and meta in non-production', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['email'] } } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].meta.prismaCode).toBe('P2002');
            expect(body.errors[0].meta.meta).toEqual({ target: ['email'] });
            done();
          },
        });
    });
  });

  describe('HttpException', () => {
    it('should map with status-derived code and title', (done) => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
            const body = err.getResponse();
            expect(body.errors[0].status).toBe('404');
            expect(body.errors[0].code).toBe('40400');
            expect(body.errors[0].title).toBe('Not Found');
            expect(body.errors[0].detail).toBe('Not found');
            done();
          },
        });
    });

    it('should map array message to validation errors with source.pointer', (done) => {
      const exception = new HttpException(
        { message: ['email is not valid', 'password is too short'] },
        HttpStatus.BAD_REQUEST,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].detail).toBe('email is not valid; password is too short');
            expect(body.errors[0].source.pointer).toBe('/request-body');
            done();
          },
        });
    });
  });

  describe('Generic Error', () => {
    it('should map to 500', (done) => {
      const exception = new Error('Something went wrong');

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
            const body = err.getResponse();
            expect(body.errors[0].status).toBe('500');
            expect(body.errors[0].code).toBe('50000');
            expect(body.errors[0].detail).toBe('Something went wrong');
            done();
          },
        });
    });
  });

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      interceptor = new ErrorInterceptor();
    });

    it('should sanitize generic error messages', (done) => {
      const exception = new Error('Internal database connection string');

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].detail).toBe('An unexpected error occurred');
            expect(body.errors[0].meta.stack).toBeUndefined();
            done();
          },
        });
    });

    it('should sanitize Prisma error messages', (done) => {
      const exception = new PrismaClientKnownRequestError(
        'Raw database error message',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { code: 'P2002', clientVersion: '5.0.0' } as any,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].detail).toBe('Resource already exists');
            expect(body.errors[0].meta.prismaCode).toBeUndefined();
            done();
          },
        });
    });

    it('should exclude stack from BusinessException', (done) => {
      const exception = new BusinessException(
        'TEST_ERROR',
        'Test error',
        { foo: 'bar' },
        40000,
        HttpStatus.BAD_REQUEST,
      );

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].meta.stack).toBeUndefined();
            expect(body.errors[0].meta.details).toBeUndefined();
            done();
          },
        });
    });
  });

  describe('Non-production mode', () => {
    it('should include stack trace', (done) => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

      interceptor
        .intercept(createMockContext(), createMockCallHandler(exception))
        .subscribe({
          error: (err) => {
            const body = err.getResponse();
            expect(body.errors[0].meta.stack).toBeDefined();
            done();
          },
        });
    });
  });
});

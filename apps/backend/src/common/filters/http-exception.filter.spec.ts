import { HttpException, HttpStatus } from '@nestjs/common';

import { BusinessException } from '../exceptions/business.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ValidationException } from '../exceptions/validation.exception';

import { HttpExceptionFilter } from './http-exception.filter';

function createMockHost(requestId?: string, headerRequestId?: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, json } as any;
  const request = {
    requestId,
    headers: headerRequestId ? { 'x-request-id': headerRequestId } : {},
  } as any;

  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
    json,
    response,
    request,
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    filter = new HttpExceptionFilter();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('ValidationException', () => {
    it('should map each error with source.pointer=/data/attributes/{field}', () => {
      const exception = new ValidationException([
        { field: 'email', message: 'Invalid email' },
        { field: 'name', message: 'Name required' },
      ]);
      const host = createMockHost(undefined, 'req-1');

      filter.catch(exception, host as any);

      expect(host.response.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '422',
            code: '42200',
            title: 'Unprocessable Entity',
            detail: 'Invalid email',
            source: { pointer: '/data/attributes/email' },
            meta: expect.objectContaining({ timestamp: expect.any(String), requestId: 'req-1' }),
          },
          {
            status: '422',
            code: '42200',
            title: 'Unprocessable Entity',
            detail: 'Name required',
            source: { pointer: '/data/attributes/name' },
            meta: expect.objectContaining({ timestamp: expect.any(String), requestId: 'req-1' }),
          },
        ],
      });
    });
  });

  describe('BusinessException', () => {
    it('should map with businessCode, errorKey as title, details in meta', () => {
      const exception = new BusinessException(
        'INSUFFICIENT_BALANCE',
        'Balance too low',
        { currentBalance: 50, required: 100 },
        40103,
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost(undefined, 'req-2');

      filter.catch(exception, host as any);

      expect(host.response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '400',
            code: '40103',
            title: 'INSUFFICIENT_BALANCE',
            detail: 'Balance too low',
            meta: expect.objectContaining({
              timestamp: expect.any(String),
              requestId: 'req-2',
              details: { currentBalance: 50, required: 100 },
            }),
          },
        ],
      });
    });
  });

  describe('NotFoundException', () => {
    it('should map to 404 with code RESOURCE_NOT_FOUND', () => {
      const exception = new NotFoundException('User', 'user-123');
      const host = createMockHost(undefined, 'req-3');

      filter.catch(exception, host as any);

      expect(host.response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '404',
            code: 'RESOURCE_NOT_FOUND',
            title: 'Not Found',
            detail: 'User 不存在',
            meta: expect.objectContaining({ timestamp: expect.any(String), requestId: 'req-3' }),
          },
        ],
      });
    });
  });

  describe('ForbiddenException', () => {
    it('should map to 403 with code FORBIDDEN', () => {
      const exception = new ForbiddenException('delete_user', 'user:delete');
      const host = createMockHost(undefined, 'req-4');

      filter.catch(exception, host as any);

      expect(host.response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '403',
            code: 'FORBIDDEN',
            title: 'Forbidden',
            detail: expect.any(String),
            meta: expect.objectContaining({ timestamp: expect.any(String), requestId: 'req-4' }),
          },
        ],
      });
    });
  });

  describe('Generic HttpException', () => {
    it('should map with status-derived code and title', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const host = createMockHost();

      filter.catch(exception, host as any);

      expect(host.response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '404',
            code: 'NOT_FOUND',
            title: 'Not Found',
            detail: 'Not found',
            meta: expect.objectContaining({ timestamp: expect.any(String) }),
          },
        ],
      });
    });

    it('should map 500 to INTERNAL_ERROR', () => {
      const exception = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
      const host = createMockHost();

      filter.catch(exception, host as any);

      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '500',
            code: 'INTERNAL_ERROR',
            title: 'Internal Server Error',
            detail: 'Server error',
            meta: expect.objectContaining({ timestamp: expect.any(String) }),
          },
        ],
      });
    });

    it('should map unknown status to ERROR code', () => {
      const exception = new HttpException('Custom', 418);
      const host = createMockHost();

      filter.catch(exception, host as any);

      expect(host.json).toHaveBeenCalledWith({
        errors: [
          {
            status: '418',
            code: 'ERROR',
            title: 'Error',
            detail: 'Custom',
            meta: expect.objectContaining({ timestamp: expect.any(String) }),
          },
        ],
      });
    });
  });

  describe('HttpException with array message', () => {
    it('should map to validation errors with source.pointer', () => {
      const exception = new HttpException(
        { message: ['email must be a valid email', 'password is too short'] },
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors).toHaveLength(2);
      expect(call.errors[0].code).toBe('VALIDATION_ERROR');
      expect(call.errors[0].detail).toBe('email must be a valid email');
      expect(call.errors[0].source.pointer).toBe('/data/attributes/email');
      expect(call.errors[1].source.pointer).toBe('/data/attributes/password');
    });

    it('should handle array message without field pattern', () => {
      const exception = new HttpException(
        { message: ['validation failed on multiple fields'] },
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].code).toBe('VALIDATION_ERROR');
      expect(call.errors[0].source).toEqual({ pointer: '/data/attributes/validation' });
    });
  });

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      filter = new HttpExceptionFilter();
    });

    it('should exclude stack trace', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].meta.stack).toBeUndefined();
    });
  });

  describe('Non-production mode', () => {
    it('should include stack trace', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].meta.stack).toBeDefined();
    });
  });

  describe('requestId', () => {
    it('should use request.requestId when available', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
      const host = createMockHost('direct-request-id');

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].meta.requestId).toBe('direct-request-id');
    });

    it('should fall back to X-Request-Id header', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
      const host = createMockHost(undefined, 'header-request-id');

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].meta.requestId).toBe('header-request-id');
    });

    it('should omit requestId when neither is available', () => {
      const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].meta.requestId).toBeUndefined();
    });
  });

  describe('extractDetail', () => {
    it('should extract string response', () => {
      const exception = new HttpException('Simple message', HttpStatus.BAD_REQUEST);
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].detail).toBe('Simple message');
    });

    it('should extract message from object response', () => {
      const exception = new HttpException(
        { message: 'Object message', code: 400 },
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].detail).toBe('Object message');
    });

    it('should fall back to exception.message when response has no message string', () => {
      const exception = new HttpException(
        { error: 'Bad Request', statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockHost();

      filter.catch(exception, host as any);

      const call = host.json.mock.calls[0][0];
      expect(call.errors[0].detail).toBeDefined();
      expect(typeof call.errors[0].detail).toBe('string');
    });
  });
});

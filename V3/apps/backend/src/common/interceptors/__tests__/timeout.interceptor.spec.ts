import { of, throwError } from 'rxjs';
import { RequestTimeoutException } from '@nestjs/common';
import { TimeoutError } from 'rxjs';
import { TimeoutInterceptor } from '../timeout.interceptor';

function createMockExecutionContext() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({}),
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('TimeoutInterceptor', () => {
  it('should be defined with default timeout', () => {
    const interceptor = new TimeoutInterceptor();
    expect(interceptor).toBeDefined();
  });

  it('should be defined with custom timeout', () => {
    const interceptor = new TimeoutInterceptor(5000);
    expect(interceptor).toBeDefined();
  });

  it('should pass through data when response arrives in time', (done) => {
    const interceptor = new TimeoutInterceptor(10000);
    const context = createMockExecutionContext();
    const callHandler = {
      handle: () => of({ data: 'quick' }),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: 'quick' });
        done();
      },
    });
  });

  it('should convert TimeoutError to RequestTimeoutException', (done) => {
    const interceptor = new TimeoutInterceptor(10000);
    const context = createMockExecutionContext();
    const callHandler = {
      handle: () => throwError(() => new TimeoutError()),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      error: (err) => {
        expect(err).toBeInstanceOf(RequestTimeoutException);
        expect(err.message).toBe('请求超时');
        done();
      },
    });
  });

  it('should pass through non-timeout errors unchanged', (done) => {
    const interceptor = new TimeoutInterceptor(10000);
    const context = createMockExecutionContext();
    const originalError = new Error('Something else');
    const callHandler = {
      handle: () => throwError(() => originalError),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      error: (err) => {
        expect(err).toBe(originalError);
        done();
      },
    });
  });

  it('should pass through HttpException errors unchanged', (done) => {
    const interceptor = new TimeoutInterceptor(10000);
    const context = createMockExecutionContext();
    const { NotFoundException } = require('@nestjs/common');
    const originalError = new NotFoundException('Not found');
    const callHandler = {
      handle: () => throwError(() => originalError),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      error: (err) => {
        expect(err).toBe(originalError);
        done();
      },
    });
  });
});

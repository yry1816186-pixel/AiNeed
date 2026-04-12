import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';

function createMockExecutionContext(method = 'GET', url = '/test') {
  const mockResponse = { statusCode: 200 };
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => mockResponse,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log successful request', (done) => {
    const context = createMockExecutionContext('GET', '/api/v1/test');
    const callHandler = {
      handle: () => of({ data: 'test' }),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      next: () => {
        done();
      },
    });
  });

  it('should log error request', (done) => {
    const context = createMockExecutionContext('POST', '/api/v1/error');
    const callHandler = {
      handle: () => throwError(() => new Error('Test error')),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      error: () => {
        done();
      },
    });
  });

  it('should handle different HTTP methods', (done) => {
    const context = createMockExecutionContext('DELETE', '/api/v1/resource/1');
    const callHandler = {
      handle: () => of(null),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      next: () => {
        done();
      },
    });
  });

  it('should pass through data unchanged', (done) => {
    const context = createMockExecutionContext();
    const expectedData = { id: '123', name: 'test' };
    const callHandler = {
      handle: () => of(expectedData),
    };

    interceptor.intercept(context as never, callHandler).subscribe({
      next: (data) => {
        expect(data).toEqual(expectedData);
        done();
      },
    });
  });
});

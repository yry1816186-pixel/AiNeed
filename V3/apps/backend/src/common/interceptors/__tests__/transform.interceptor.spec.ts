import { of } from 'rxjs';
import { TransformInterceptor } from '../transform.interceptor';

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

function createMockCallHandler(data: unknown) {
  return {
    handle: () => of(data),
  };
}

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('plain data transformation', () => {
    it('should wrap a plain object in success response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({ name: 'test' });

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: { name: 'test' },
          });
          done();
        },
      });
    });

    it('should wrap a string in success response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler('hello');

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: 'hello',
          });
          done();
        },
      });
    });

    it('should wrap null in success response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(null);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: null,
          });
          done();
        },
      });
    });

    it('should wrap a number in success response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(42);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: 42,
          });
          done();
        },
      });
    });

    it('should wrap undefined in success response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(undefined);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: undefined,
          });
          done();
        },
      });
    });

    it('should wrap an array in success response', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler([1, 2, 3]);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: [1, 2, 3],
          });
          done();
        },
      });
    });
  });

  describe('already formatted responses', () => {
    it('should pass through data that already has success field', (done) => {
      const context = createMockExecutionContext();
      const existingResponse = { success: true, data: { id: '123' } };
      const callHandler = createMockCallHandler(existingResponse);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual(existingResponse);
          done();
        },
      });
    });

    it('should pass through error responses with success: false', (done) => {
      const context = createMockExecutionContext();
      const errorResponse = {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Not found' },
      };
      const callHandler = createMockCallHandler(errorResponse);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual(errorResponse);
          done();
        },
      });
    });
  });

  describe('paginated data transformation', () => {
    it('should transform items + meta into paginated response', (done) => {
      const context = createMockExecutionContext();
      const paginatedData = {
        items: [{ id: '1' }, { id: '2' }],
        meta: { total: 10, page: 1, limit: 2, totalPages: 5 },
      };
      const callHandler = createMockCallHandler(paginatedData);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: [{ id: '1' }, { id: '2' }],
            meta: { total: 10, page: 1, limit: 2, totalPages: 5 },
          });
          done();
        },
      });
    });

    it('should handle empty items array in paginated response', (done) => {
      const context = createMockExecutionContext();
      const paginatedData = {
        items: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      const callHandler = createMockCallHandler(paginatedData);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            data: [],
            meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
          });
          done();
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle boolean data', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(true);

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: true });
          done();
        },
      });
    });

    it('should handle empty object', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({});

      interceptor.intercept(context as never, callHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true, data: {} });
          done();
        },
      });
    });
  });
});

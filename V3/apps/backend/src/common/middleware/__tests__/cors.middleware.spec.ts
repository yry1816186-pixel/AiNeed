import { CorsMiddleware } from '../cors.middleware';
import { Request, Response } from 'express';

function createMockRequest(
  method = 'GET',
  origin?: string,
): Partial<Request> {
  return {
    method,
    headers: {},
    get: jest.fn((name: string) => {
      if (name === 'origin') return origin;
      return undefined;
    }),
  } as Partial<Request>;
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    setHeader: jest.fn(),
    sendStatus: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('CorsMiddleware', () => {
  let middleware: CorsMiddleware;
  const originalEnv = process.env.APP_ENV;

  beforeEach(() => {
    process.env.APP_ENV = 'development';
    middleware = new CorsMiddleware();
  });

  afterAll(() => {
    process.env.APP_ENV = originalEnv;
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('allowed origins in development', () => {
    it('should set Access-Control-Allow-Origin for allowed localhost origin', () => {
      const req = createMockRequest('GET', 'http://localhost:8081');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:8081',
      );
      expect(next).toHaveBeenCalled();
    });

    it('should set Access-Control-Allow-Origin for localhost:3000', () => {
      const req = createMockRequest('GET', 'http://localhost:3000');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000',
      );
    });

    it('should set Access-Control-Allow-Origin for localhost:19006', () => {
      const req = createMockRequest('GET', 'http://localhost:19006');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:19006',
      );
    });
  });

  describe('disallowed origins', () => {
    it('should NOT set Access-Control-Allow-Origin for unknown origin', () => {
      const req = createMockRequest('GET', 'http://evil.com');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      const setHeaderCalls = (res.setHeader as jest.Mock).mock.calls;
      const acaoCalls = setHeaderCalls.filter(
        (call: string[]) => call[0] === 'Access-Control-Allow-Origin',
      );
      expect(acaoCalls).toHaveLength(0);
    });
  });

  describe('no origin', () => {
    it('should set Access-Control-Allow-Origin to * when no origin header', () => {
      const req = createMockRequest('GET');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        '*',
      );
    });
  });

  describe('CORS headers', () => {
    it('should set standard CORS headers for every request', () => {
      const req = createMockRequest('GET', 'http://localhost:8081');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Max-Age',
        '86400',
      );
    });
  });

  describe('OPTIONS preflight', () => {
    it('should return 204 for OPTIONS requests', () => {
      const req = createMockRequest('OPTIONS', 'http://localhost:8081');
      const res = createMockResponse();
      const next = jest.fn();

      middleware.use(req as Request, res as Response, next);

      expect(res.sendStatus).toHaveBeenCalledWith(204);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('environment-specific origins', () => {
    it('should allow staging origins in staging environment', () => {
      process.env.APP_ENV = 'staging';
      const stagingMiddleware = new CorsMiddleware();
      const req = createMockRequest('GET', 'https://staging.aineed.com');
      const res = createMockResponse();
      const next = jest.fn();

      stagingMiddleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://staging.aineed.com',
      );
    });

    it('should allow production origins in production environment', () => {
      process.env.APP_ENV = 'production';
      const prodMiddleware = new CorsMiddleware();
      const req = createMockRequest('GET', 'https://aineed.com');
      const res = createMockResponse();
      const next = jest.fn();

      prodMiddleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://aineed.com',
      );
    });

    it('should fallback to development origins for unknown environment', () => {
      process.env.APP_ENV = 'unknown';
      const fallbackMiddleware = new CorsMiddleware();
      const req = createMockRequest('GET', 'http://localhost:8081');
      const res = createMockResponse();
      const next = jest.fn();

      fallbackMiddleware.use(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:8081',
      );
    });
  });
});

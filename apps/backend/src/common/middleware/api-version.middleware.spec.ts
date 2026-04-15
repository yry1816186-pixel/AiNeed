import { Request, Response, NextFunction } from 'express';

import { ApiVersionMiddleware, SUPPORTED_API_VERSIONS } from './api-version.middleware';

function createMockRequest(url: string) {
  return {
    url,
    originalUrl: url,
    headers: {},
    apiVersion: undefined,
  } as unknown as Request;
}

function createMockResponse() {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockNext() {
  return jest.fn() as NextFunction;
}

describe('ApiVersionMiddleware', () => {
  let middleware: ApiVersionMiddleware;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new ApiVersionMiddleware();
    res = createMockResponse();
    next = createMockNext();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('valid versioned paths', () => {
    it('should pass through /api/v1/users and set apiVersion', () => {
      const req = createMockRequest('/api/v1/users');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBe('1');
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
      expect(next).toHaveBeenCalled();
    });

    it('should pass through /api/v1/clothing/123', () => {
      const req = createMockRequest('/api/v1/clothing/123');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBe('1');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('unsupported versions', () => {
    it('should return 400 with JSON:API error for /api/v2/users', () => {
      const req = createMockRequest('/api/v2/users');

      middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect((res as any).json).toHaveBeenCalledWith({
        errors: [
          {
            status: '400',
            code: 'UNSUPPORTED_API_VERSION',
            title: 'Unsupported API Version',
            detail: "API version 'v2' is not supported. Supported versions: v1",
            source: { parameter: 'version' },
          },
        ],
      });
    });

    it('should return 400 for /api/v99/endpoint', () => {
      const req = createMockRequest('/api/v99/endpoint');

      middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('unversioned /api/ paths', () => {
    it('should rewrite /api/users to /api/v1/users', () => {
      const req = createMockRequest('/api/users');

      middleware.use(req, res, next);

      expect(req.url).toBe('/api/v1/users');
      expect(req.apiVersion).toBe('1');
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
      expect(next).toHaveBeenCalled();
    });

    it('should preserve query string during rewrite', () => {
      const req = createMockRequest('/api/users?page=1&limit=20');

      middleware.use(req, res, next);

      expect(req.url).toContain('/api/v1/users');
      expect(req.originalUrl).toContain('page=1&limit=20');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('skip paths', () => {
    it('should pass through /health without modification', () => {
      const req = createMockRequest('/health');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBeUndefined();
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should pass through /metrics without modification', () => {
      const req = createMockRequest('/metrics');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should pass through /api/docs without modification', () => {
      const req = createMockRequest('/api/docs');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should pass through /api/docs-json without modification', () => {
      const req = createMockRequest('/api/docs-json');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should pass through /api/docs-yaml without modification', () => {
      const req = createMockRequest('/api/docs-yaml');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('non-/api/ paths', () => {
    it('should pass through non-API paths without modification', () => {
      const req = createMockRequest('/some/other/path');

      middleware.use(req, res, next);

      expect(req.apiVersion).toBeUndefined();
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('custom supported versions', () => {
    it('should accept custom supported versions via constructor', () => {
      const customMiddleware = new ApiVersionMiddleware(['1', '2']);
      const req = createMockRequest('/api/v2/users');

      customMiddleware.use(req, res, next);

      expect(req.apiVersion).toBe('2');
      expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
      expect(next).toHaveBeenCalled();
    });

    it('should reject versions not in custom list', () => {
      const customMiddleware = new ApiVersionMiddleware(['2']);
      const req = createMockRequest('/api/v1/users');

      customMiddleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('SUPPORTED_API_VERSIONS constant', () => {
    it('should default to ["1"]', () => {
      expect(SUPPORTED_API_VERSIONS).toEqual(['1']);
    });
  });
});

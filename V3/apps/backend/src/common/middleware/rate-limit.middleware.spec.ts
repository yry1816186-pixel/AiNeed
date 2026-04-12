import { RateLimitMiddleware } from './rate-limit.middleware';
import { Request, Response, NextFunction } from 'express';

function createMockRequest(
  path: string,
  ip: string = '127.0.0.1',
  userId?: string,
): Request {
  const req = {
    originalUrl: path,
    url: path,
    ip,
    headers: {} as Record<string, string | string[] | undefined>,
    get: jest.fn(() => ''),
    user: userId ? { id: userId } : undefined,
  } as unknown as Request;
  return req;
}

function createMockResponse(): Response {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  return res;
}

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let redisMulti: {
    zremrangebyscore: jest.Mock;
    zadd: jest.Mock;
    zcard: jest.Mock;
    pexpire: jest.Mock;
    exec: jest.Mock;
  };

  beforeEach(() => {
    redisMulti = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const redisMock = {
      multi: jest.fn(() => redisMulti),
    };

    middleware = new RateLimitMiddleware(
      redisMock as unknown as import('ioredis').default,
    );
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should allow request under rate limit', async () => {
    redisMulti.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 1],
      [null, 1],
    ]);

    const request = createMockRequest('/api/v1/clothing');
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });

  it('should return 429 when global rate limit exceeded', async () => {
    redisMulti.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 101],
      [null, 1],
    ]);

    const request = createMockRequest('/api/v1/clothing');
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '请求过于频繁，请稍后再试',
        },
      }),
    );
  });

  it('should apply auth rate limit (10/min) for /auth/* routes', async () => {
    let callCount = 0;
    redisMulti.exec.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([
          [null, 0],
          [null, 1],
          [null, 5],
          [null, 1],
        ]);
      }
      return Promise.resolve([
        [null, 0],
        [null, 1],
        [null, 11],
        [null, 1],
      ]);
    });

    const request = createMockRequest('/api/v1/auth/login');
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(429);
  });

  it('should apply user-scoped rate limit for /stylist/* routes', async () => {
    redisMulti.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 5],
      [null, 1],
    ]);

    const request = createMockRequest('/api/v1/stylist/sessions', '127.0.0.1', 'user-123');
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should apply outfit-image rate limit (5/min) for /outfit-image/* routes', async () => {
    let callCount = 0;
    redisMulti.exec.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve([
          [null, 0],
          [null, 1],
          [null, 3],
          [null, 1],
        ]);
      }
      return Promise.resolve([
        [null, 0],
        [null, 1],
        [null, 6],
        [null, 1],
      ]);
    });

    const request = createMockRequest('/api/v1/outfit-image/generate', '127.0.0.1', 'user-123');
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(429);
  });

  it('should apply search rate limit (30/min) for /search/* routes', async () => {
    redisMulti.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 10],
      [null, 1],
    ]);

    const request = createMockRequest('/api/v1/search');
    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should extract IP from x-forwarded-for header', async () => {
    redisMulti.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 1],
      [null, 1],
    ]);

    const request = createMockRequest('/api/v1/clothing');
    request.headers['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';

    const response = createMockResponse();
    const next = jest.fn() as NextFunction;

    await middleware.use(request, response, next);

    expect(next).toHaveBeenCalled();
  });
});

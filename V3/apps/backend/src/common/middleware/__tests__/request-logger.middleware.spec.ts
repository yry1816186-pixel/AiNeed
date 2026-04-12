import { RequestLoggerMiddleware } from '../request-logger.middleware';
import { Request, Response } from 'express';

function createMockRequest(overrides: Partial<Request> = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v1/test',
    ip: '127.0.0.1',
    get: jest.fn((name: string) => {
      if (name === 'user-agent') return 'Jest Test Agent';
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(overrides: Partial<Response> = {}) {
  const res = {
    statusCode: 200,
    get: jest.fn((name: string) => {
      if (name === 'content-length') return '128';
      return undefined;
    }),
    on: jest.fn(),
  };
  return { ...res, ...overrides } as unknown as Response;
}

describe('RequestLoggerMiddleware', () => {
  let middleware: RequestLoggerMiddleware;

  beforeEach(() => {
    middleware = new RequestLoggerMiddleware();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call next()', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should register a finish event listener on the response', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should handle request without user-agent', () => {
    const req = createMockRequest();
    (req.get as jest.Mock).mockReturnValue(undefined);
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should handle request without content-length in response', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    (res.get as jest.Mock).mockReturnValue(undefined);
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log when finish event fires', () => {
    const req = createMockRequest();
    let finishCallback: (() => void) | undefined;
    const res = {
      statusCode: 200,
      get: jest.fn((name: string) => {
        if (name === 'content-length') return '256';
        return undefined;
      }),
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') {
          finishCallback = cb;
        }
      }),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(finishCallback).toBeDefined();

    // Simulate the finish event firing
    finishCallback!();

    // If it doesn't throw, the finish handler ran successfully
    expect(next).toHaveBeenCalled();
  });

  it('should log POST request with no content-length', () => {
    const req = createMockRequest({ method: 'POST', originalUrl: '/api/v1/data' });
    let finishCallback: (() => void) | undefined;
    const res = {
      statusCode: 201,
      get: jest.fn(() => undefined),
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') {
          finishCallback = cb;
        }
      }),
    } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    finishCallback!();

    expect(next).toHaveBeenCalled();
  });
});

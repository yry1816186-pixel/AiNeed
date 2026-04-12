import { TestingModule, Test } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  const createMockExecutionContext = (authHeader?: string | null): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockExecutionContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('\u7f3a\u5c11\u8ba4\u8bc1\u4ee4\u724c');
    });

    it('should throw UnauthorizedException when authorization header is null', async () => {
      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('\u7f3a\u5c11\u8ba4\u8bc1\u4ee4\u724c');
    });

    it('should throw UnauthorizedException when authorization header does not start with Bearer', async () => {
      const context = createMockExecutionContext('Basic abc123');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('\u7f3a\u5c11\u8ba4\u8bc1\u4ee4\u724c');
    });

    it('should throw UnauthorizedException when authorization header is empty string', async () => {
      const context = createMockExecutionContext('');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid token'));
      const context = createMockExecutionContext('Bearer invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('\u8ba4\u8bc1\u4ee4\u724c\u65e0\u6548\u6216\u5df2\u8fc7\u671f');
    });

    it('should return true and set user on request for valid token', async () => {
      const mockPayload = { sub: 'user-123', role: 'admin' };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      const request: Record<string, unknown> = { headers: { authorization: 'Bearer valid-token' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request['user']).toEqual({ id: 'user-123', role: 'admin' });
    });

    it('should extract token correctly (substring from index 7)', async () => {
      const mockPayload = { sub: 'user-456', role: 'user' };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      const request = { headers: { authorization: 'Bearer my-jwt-token-value' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('my-jwt-token-value');
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt expired'));
      const context = createMockExecutionContext('Bearer expired-token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when authorization is just "Bearer " with no token', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('jwt must be provided'));
      const context = createMockExecutionContext('Bearer ');

      // "Bearer " starts with "Bearer " so it passes the header check,
      // but verifyAsync fails on the empty token string
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});

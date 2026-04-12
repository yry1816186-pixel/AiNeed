import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OptionalAuthGuard } from './optional-auth.guard';

describe('OptionalAuthGuard', () => {
  let guard: OptionalAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionalAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<OptionalAuthGuard>(OptionalAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow access for public endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const context = createMockExecutionContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return null when no user is present (handleRequest)', () => {
    const result = guard.handleRequest(null, false);
    expect(result).toBeNull();
  });

  it('should return null when authentication error occurs (handleRequest)', () => {
    const result = guard.handleRequest(new Error('auth error'), false);
    expect(result).toBeNull();
  });

  it('should return user when authentication succeeds (handleRequest)', () => {
    const mockUser = { id: '1', role: 'user' };
    const result = guard.handleRequest(null, mockUser);
    expect(result).toEqual(mockUser);
  });
});

import { ExecutionContext, ForbiddenException, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";

import { USAGE_LIMIT_KEY, UsageLimitGuard } from "../usage-limit.guard";

/**
 * Helper to create a mock ExecutionContext without external dependencies
 */
function createMockExecutionContext(user?: { id: string }): ExecutionContext {
  const req = user ? { user } : {};
  const headers: Record<string, string | number> = {};
  const res = {
    setHeader: jest.fn((key: string, value: string | number) => {
      headers[key] = value;
    }),
    _headers: headers,
  };

  const handler = jest.fn();
  const cls = jest.fn();

  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

describe("UsageLimitGuard", () => {
  let guard: UsageLimitGuard;
  let reflector: Reflector;
  let redisService: {
    incr: jest.Mock;
    expire: jest.Mock;
    ttl: jest.Mock;
  };
  let prismaService: {
    userSubscription: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    redisService = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    };

    prismaService = {
      userSubscription: {
        findFirst: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        UsageLimitGuard,
        Reflector,
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    guard = module.get<UsageLimitGuard>(UsageLimitGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  // Test 4: canActivate returns true when no @RequireLimit decorator is present
  it("should return true when no @RequireLimit decorator is present", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

    const ctx = createMockExecutionContext({ id: "user-1" });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(redisService.incr).not.toHaveBeenCalled();
  });

  // Test 10: throws ForbiddenException when request has no authenticated user
  it("should throw ForbiddenException when request has no authenticated user", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai_chat");

    const ctx = createMockExecutionContext();

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  // Test 5: returns true when user has active UserSubscription (premium bypass)
  it("should return true when user has active UserSubscription (premium bypass)", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai_chat");
    prismaService.userSubscription.findFirst.mockResolvedValueOnce({
      id: "sub-1",
      status: "active",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const ctx = createMockExecutionContext({ id: "premium-user" });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(redisService.incr).not.toHaveBeenCalled();
  });

  // Test 9: sets X-Usage-Limit=-1, X-Usage-Remaining=-1 for premium users
  it("should set X-Usage-Limit=-1, X-Usage-Remaining=-1 for premium users", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai_chat");
    prismaService.userSubscription.findFirst.mockResolvedValueOnce({
      id: "sub-1",
      status: "active",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const ctx = createMockExecutionContext({ id: "premium-user" });
    await guard.canActivate(ctx);

    const res = ctx.switchToHttp().getResponse();
    expect(res.setHeader).toHaveBeenCalledWith("X-Usage-Limit", -1);
    expect(res.setHeader).toHaveBeenCalledWith("X-Usage-Remaining", -1);
  });

  // Test 6: increments Redis counter and returns true when count <= limit for free user
  it("should increment Redis counter and return true when count <= limit for free user", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai_chat");
    prismaService.userSubscription.findFirst.mockResolvedValueOnce(null);
    redisService.incr.mockResolvedValueOnce(1);
    redisService.expire.mockResolvedValueOnce(undefined);
    redisService.ttl.mockResolvedValueOnce(86400);

    const ctx = createMockExecutionContext({ id: "free-user" });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(redisService.incr).toHaveBeenCalledTimes(1);
  });

  // Test 8: sets X-Usage-Limit, X-Usage-Remaining, X-Usage-Reset headers on every response
  it("should set X-Usage-Limit, X-Usage-Remaining, X-Usage-Reset headers on every response", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai_chat");
    prismaService.userSubscription.findFirst.mockResolvedValueOnce(null);
    redisService.incr.mockResolvedValueOnce(3);
    redisService.ttl.mockResolvedValueOnce(80000);

    const ctx = createMockExecutionContext({ id: "free-user" });
    await guard.canActivate(ctx);

    const res = ctx.switchToHttp().getResponse();
    expect(res.setHeader).toHaveBeenCalledWith("X-Usage-Limit", 5);
    expect(res.setHeader).toHaveBeenCalledWith("X-Usage-Remaining", 2);
    // X-Usage-Reset should be a positive number
    const resetCalls = (res.setHeader as jest.Mock).mock.calls.filter(
      (call: [string, number]) => call[0] === "X-Usage-Reset"
    );
    expect(resetCalls.length).toBe(1);
    expect(resetCalls[0][1]).toBeGreaterThan(0);
  });

  // Test 7: throws UsageLimitExceededException (HTTP 429) when count > limit for free user
  it("should throw UsageLimitExceededException (HTTP 429) when count > limit for free user", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai_chat");
    prismaService.userSubscription.findFirst.mockResolvedValueOnce(null);
    redisService.incr.mockResolvedValueOnce(6);
    redisService.ttl.mockResolvedValueOnce(80000);

    const ctx = createMockExecutionContext({ id: "free-user" });

    try {
      await guard.canActivate(ctx);
      fail("Expected UsageLimitExceededException to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(429);
    }
  });

  // Additional: guard should set expire on first increment for free user
  it("should set TTL on Redis key when first increment (count===1) for free user", async () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("try_on");
    prismaService.userSubscription.findFirst.mockResolvedValueOnce(null);
    redisService.incr.mockResolvedValueOnce(1);
    redisService.expire.mockResolvedValueOnce(undefined);
    redisService.ttl.mockResolvedValueOnce(86400);

    const ctx = createMockExecutionContext({ id: "free-user" });
    await guard.canActivate(ctx);

    expect(redisService.expire).toHaveBeenCalledTimes(1);
    const [expireKey, seconds] = redisService.expire.mock.calls[0];
    expect(expireKey).toMatch(/^xuno:usage:free-user:try_on:\d{4}-\d{2}-\d{2}$/);
    expect(seconds).toBeGreaterThan(0);
  });
});

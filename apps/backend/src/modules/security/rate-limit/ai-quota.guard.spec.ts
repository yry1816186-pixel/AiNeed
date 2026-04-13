import { HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";

import { AiQuotaService, QuotaType as QuotaTypeEnum } from "./ai-quota.service";
import { AiQuotaGuard, QUOTA_TYPE_KEY, SetQuotaType } from "./ai-quota.guard";

describe("AiQuotaGuard", () => {
  let guard: AiQuotaGuard;
  let quotaService: AiQuotaService;
  let reflector: Reflector;

  const mockQuotaService = {
    consumeQuota: jest.fn(),
  };

  const createMockExecutionContext = (overrides: {
    user?: { id: string; email?: string };
    quotaType?: QuotaTypeEnum;
  } = {}) => {
    const mockRequest: Record<string, unknown> = {
      user: overrides.user,
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaGuard,
        { provide: AiQuotaService, useValue: mockQuotaService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();

    guard = module.get<AiQuotaGuard>(AiQuotaGuard);
    quotaService = module.get<AiQuotaService>(AiQuotaService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate", () => {
    it("应该在配额可用时放行请求", async () => {
      mockQuotaService.consumeQuota.mockResolvedValue({
        consumed: true,
        remaining: 9,
        resetAt: new Date(Date.now() + 3600000),
      });

      const context = createMockExecutionContext({
        user: { id: "user-1" },
      });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai-stylist");

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockQuotaService.consumeQuota).toHaveBeenCalledWith("user-1", "ai-stylist");
    });

    it("应该在配额耗尽时抛出 429 错误", async () => {
      const resetAt = new Date(Date.now() + 3600000);
      mockQuotaService.consumeQuota.mockResolvedValue({
        consumed: false,
        remaining: 0,
        resetAt,
      });

      const context = createMockExecutionContext({
        user: { id: "user-1" },
      });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai-stylist");

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(response.message).toContain("quota exceeded");
        expect(response.quotaType).toBe("ai-stylist");
        expect(response.retryAfter).toBeDefined();
      }
    });

    it("应该在无用户时抛出 401 错误", async () => {
      const context = createMockExecutionContext({});

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai-stylist");

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      try {
        await guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      }
    });

    it("应该在无配额类型元数据时直接放行", async () => {
      const context = createMockExecutionContext({
        user: { id: "user-1" },
      });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockQuotaService.consumeQuota).not.toHaveBeenCalled();
    });

    it("应该在响应头中设置限流信息", async () => {
      const resetAt = new Date(Date.now() + 3600000);
      mockQuotaService.consumeQuota.mockResolvedValue({
        consumed: true,
        remaining: 9,
        resetAt,
      });

      const context = createMockExecutionContext({
        user: { id: "user-1" },
      });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("ai-stylist");

      await guard.canActivate(context);

      const response = context.switchToHttp().getResponse();
      expect(response.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", expect.any(String));
      expect(response.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
      expect(response.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", expect.any(String));
    });

    it("应该对 try-on 配额类型正确工作", async () => {
      mockQuotaService.consumeQuota.mockResolvedValue({
        consumed: true,
        remaining: 2,
        resetAt: new Date(Date.now() + 3600000),
      });

      const context = createMockExecutionContext({
        user: { id: "user-1" },
      });

      jest.spyOn(reflector, "getAllAndOverride").mockReturnValue("try-on");

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockQuotaService.consumeQuota).toHaveBeenCalledWith("user-1", "try-on");
    });
  });

  describe("SetQuotaType decorator", () => {
    it("应该是一个函数", () => {
      expect(typeof SetQuotaType).toBe("function");
    });

    it("应该返回正确的元数据键名", () => {
      expect(QUOTA_TYPE_KEY).toBe("quotaType");
    });

    it("调用装饰器不应该抛出异常", () => {
      const mockTarget = {};
      const mockPropertyKey = "testMethod";
      const mockDescriptor = { value: jest.fn() };

      expect(() => {
        SetQuotaType("ai-stylist")(mockTarget, mockPropertyKey, mockDescriptor);
      }).not.toThrow();
    });
  });
});

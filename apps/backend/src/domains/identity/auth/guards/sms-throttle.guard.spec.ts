/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from "@nestjs/common";

import { RedisService } from "../../../../common/redis/redis.service";

import { SmsThrottleGuard } from "./sms-throttle.guard";

describe("SmsThrottleGuard", () => {
  let guard: SmsThrottleGuard;
  let redisService: RedisService;

  const mockRedisService = {
    exists: jest.fn(),
  };

  beforeEach(() => {
    guard = new SmsThrottleGuard(mockRedisService as unknown as RedisService);
    redisService = mockRedisService as unknown as RedisService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (phone?: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({
        body: phone ? { phone } : {},
      }),
    }),
  });

  it("手机号未被限流时应放行", async () => {
    mockRedisService.exists.mockResolvedValue(false);

    const context = createMockContext("13800138000");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(mockRedisService.exists).toHaveBeenCalledWith("sms:throttle:13800138000");
  });

  it("手机号已被限流时应拒绝", async () => {
    mockRedisService.exists.mockResolvedValue(true);

    const context = createMockContext("13800138000");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(guard.canActivate(context as any)).rejects.toThrow(BadRequestException);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(guard.canActivate(context as any)).rejects.toThrow("发送过于频繁，请60秒后再试");
  });

  it("缺少手机号时应抛出异常", async () => {
    const context = createMockContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(guard.canActivate(context as any)).rejects.toThrow(BadRequestException);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(guard.canActivate(context as any)).rejects.toThrow("手机号不能为空");
  });
});

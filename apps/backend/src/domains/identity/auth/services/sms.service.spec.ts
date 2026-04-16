/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { RedisService } from "../../../../common/redis/redis.service";

import { AliyunSmsService, MockSmsService, SmsService } from "./sms.service";

describe("AliyunSmsService", () => {
  let service: AliyunSmsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        ALIYUN_ACCESS_KEY_ID: "test-key",
        ALIYUN_ACCESS_KEY_SECRET: "test-secret",
        ALIYUN_SMS_SIGN_NAME: "xuno",
        ALIYUN_SMS_TEMPLATE_CODE: "SMS_123456",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AliyunSmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AliyunSmsService>(AliyunSmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should log send when configured", async () => {
    await expect(service.sendCode("13800138000", "123456")).resolves.not.toThrow();
  });

  it("should fallback to dev mode when not configured", async () => {
    mockConfigService.get.mockReturnValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const devService = new AliyunSmsService({ get: () => undefined } as any);
    await expect(devService.sendCode("13800138000", "123456")).resolves.not.toThrow();
  });
});

describe("MockSmsService", () => {
  let service: MockSmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockSmsService],
    }).compile();

    service = module.get<MockSmsService>(MockSmsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should send code successfully (mock)", async () => {
    await expect(service.sendCode("13800138000", "123456")).resolves.not.toThrow();
  });
});

describe("SmsService", () => {
  let service: SmsService;
  let redisService: { get: jest.Mock; setex: jest.Mock; exists: jest.Mock; del: jest.Mock };
  let smsProvider: { sendCode: jest.Mock };

  beforeEach(async () => {
    redisService = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      del: jest.fn().mockResolvedValue(undefined),
    };

    smsProvider = {
      sendCode: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: "ISmsService",
          useValue: smsProvider,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendVerificationCode", () => {
    it("should generate 6-digit code, store in Redis with 5min TTL, and call provider", async () => {
      await service.sendVerificationCode("13800138000");

      // Should store code with 300s TTL
      expect(redisService.setex).toHaveBeenCalledTimes(2);
      const codeCall = redisService.setex.mock.calls.find(
        (call: unknown[]) => (call as string[])[0]?.startsWith("sms:code:"),
      );
      expect(codeCall).toBeDefined();
      expect((codeCall as string[])[1]).toBe(300); // 5 minutes TTL
      expect((codeCall as string[])[2]).toMatch(/^\d{6}$/); // 6-digit code

      // Should set rate limit with 60s TTL
      const rateCall = redisService.setex.mock.calls.find(
        (call: unknown[]) => (call as string[])[0]?.startsWith("sms:rate:"),
      );
      expect(rateCall).toBeDefined();
      expect((rateCall as string[])[1]).toBe(60);

      // Should call SMS provider
      expect(smsProvider.sendCode).toHaveBeenCalledWith("13800138000", expect.stringMatching(/^\d{6}$/));
    });

    it("should throw 429 when rate limited", async () => {
      redisService.exists.mockResolvedValue(true);

      await expect(service.sendVerificationCode("13800138000")).rejects.toThrow(HttpException);
      await expect(service.sendVerificationCode("13800138000")).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });
  });

  describe("verifyCode", () => {
    it("should return true for correct code and delete it from Redis", async () => {
      redisService.get.mockResolvedValue("123456");

      const result = await service.verifyCode("13800138000", "123456");

      expect(result).toBe(true);
      expect(redisService.del).toHaveBeenCalledWith("sms:code:13800138000");
    });

    it("should return false when code not found in Redis", async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.verifyCode("13800138000", "123456");

      expect(result).toBe(false);
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it("should return false for wrong code without deleting", async () => {
      redisService.get.mockResolvedValue("654321");

      const result = await service.verifyCode("13800138000", "123456");

      expect(result).toBe(false);
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it("should return false for code of different length", async () => {
      redisService.get.mockResolvedValue("12345");

      const result = await service.verifyCode("13800138000", "123456");

      expect(result).toBe(false);
    });
  });
});

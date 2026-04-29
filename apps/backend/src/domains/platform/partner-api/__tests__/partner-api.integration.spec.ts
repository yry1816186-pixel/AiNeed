import * as crypto from "crypto";

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException, HttpException } from "@nestjs/common";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { PartnerAuthGuard } from "../guards/partner-auth.guard";
import { PartnerRateLimitGuard } from "../guards/partner-rate-limit.guard";
import { REDIS_CLIENT } from "../../../../common/redis/redis.service";

const MOCK_KEY = {
  id: "test-key-id",
  name: "test-key",
  keyPrefix: "abcd1234",
  keyHash: crypto
    .createHash("sha256")
    .update("abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
    .digest("hex"),
  rateLimit: 60,
  status: "active",
  permissions: [],
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMockContext(
  headers: Record<string, string>,
  body?: any,
  method = "POST",
  url = "/api/v1/partner/test"
) {
  const request = {
    headers,
    body: body || {},
    method,
    url,
    ip: "127.0.0.1",
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader: jest.fn() }),
    }),
  } as unknown as ExecutionContext;
}

describe("PartnerAuthGuard", () => {
  let guard: PartnerAuthGuard;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      partnerApiKey: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerAuthGuard, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    guard = module.get<PartnerAuthGuard>(PartnerAuthGuard);
  });

  it("should pass with valid HMAC signature within 5min window", async () => {
    const fullApiKey = "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const timestamp = Date.now();
    const method = "POST";
    const path = "/api/v1/partner/recommendation";
    const body = { userId: "test" };
    const signature = crypto
      .createHmac("sha256", fullApiKey)
      .update(String(timestamp) + method + path + JSON.stringify(body))
      .digest("hex");

    prismaMock.partnerApiKey.findFirst.mockResolvedValue(MOCK_KEY);

    const context = createMockContext(
      {
        "x-api-key": fullApiKey,
        "x-timestamp": String(timestamp),
        "x-signature": signature,
      },
      body,
      method,
      path
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("should reject expired timestamp (10 min old)", async () => {
    const timestamp = Date.now() - 10 * 60 * 1000;
    const context = createMockContext({
      "x-api-key": "abcd1234test",
      "x-timestamp": String(timestamp),
      "x-signature": "anysignature",
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow("timestamp expired");
  });

  it("should reject wrong HMAC signature", async () => {
    prismaMock.partnerApiKey.findFirst.mockResolvedValue(MOCK_KEY);

    const context = createMockContext(
      {
        "x-api-key": "abcd1234567890abcdef",
        "x-timestamp": String(Date.now()),
        "x-signature": "wrongsignature",
      },
      {}
    );

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow("Invalid signature");
  });

  it("should reject revoked key", async () => {
    prismaMock.partnerApiKey.findFirst.mockResolvedValue({
      ...MOCK_KEY,
      status: "revoked",
    });

    const context = createMockContext({
      "x-api-key": "abcd1234567890abcdef",
      "x-timestamp": String(Date.now()),
      "x-signature": "anysignature",
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow("not active");
  });

  it("should reject expired key", async () => {
    prismaMock.partnerApiKey.findFirst.mockResolvedValue({
      ...MOCK_KEY,
      expiresAt: new Date(Date.now() - 86400000),
    });

    const context = createMockContext({
      "x-api-key": "abcd1234567890abcdef",
      "x-timestamp": String(Date.now()),
      "x-signature": "anysignature",
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(context)).rejects.toThrow("expired");
  });
});

describe("PartnerRateLimitGuard", () => {
  let guard: PartnerRateLimitGuard;
  let redisMock: any;

  beforeEach(async () => {
    const pipelineMock = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    redisMock = {
      pipeline: jest.fn().mockReturnValue(pipelineMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerRateLimitGuard, { provide: REDIS_CLIENT, useValue: redisMock }],
    }).compile();

    guard = module.get<PartnerRateLimitGuard>(PartnerRateLimitGuard);
  });

  it("should pass when under rate limit", async () => {
    const pipelineMock = redisMock.pipeline();
    pipelineMock.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 30],
      [null, 1],
    ]);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ partnerApiKey: MOCK_KEY }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it("should throw 429 when rate limit exceeded", async () => {
    const pipelineMock = redisMock.pipeline();
    pipelineMock.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 65],
      [null, 1],
    ]);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ partnerApiKey: MOCK_KEY }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    try {
      await guard.canActivate(context);
    } catch (e: any) {
      expect(e.getStatus()).toBe(429);
    }
  });
});

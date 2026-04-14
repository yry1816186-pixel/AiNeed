/**
 * Phase 1 Integration Test: Auth Flow
 *
 * Tests the complete phone registration -> login -> profile -> WeChat login flow.
 * Uses mocked Prisma/Redis/external services; no infrastructure required.
 *
 * NOTE: Does not import from test-app.module to avoid pulling in
 * DoubaoSeedreamProvider / GlmTryOnProvider which require opossum dependency.
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import request from "supertest";

import { AuthController } from "../../src/modules/auth/auth.controller";
import { AuthService } from "../../src/modules/auth/auth.service";
import { AuthHelpersService } from "../../src/modules/auth/auth.helpers";
import { SmsService, ISmsService } from "../../src/modules/auth/services/sms.service";
import { WechatService } from "../../src/modules/auth/services/wechat.service";
import { JwtStrategy } from "../../src/modules/auth/strategies/jwt.strategy";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { RedisService, REDIS_CLIENT } from "../../src/common/redis/redis.service";
import { StructuredLoggerService } from "../../src/common/logging/structured-logger.service";
import { PassportModule } from "@nestjs/passport";

import {
  RedisKeyTracker,
  createRedisKeyTracker,
  createMockRedisClient,
  createMockRedisService,
} from "../utils/redis-test-utils";

// Inline mock Prisma delegate (avoids importing test-app.module which has broken CloudTryOnProvider import)
function createMockPrismaDelegate() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  };
}

function createMockPrisma(): PrismaService {
  return {
    user: createMockPrismaDelegate(),
    userProfile: createMockPrismaDelegate(),
    refreshToken: createMockPrismaDelegate(),
    quizAnswer: createMockPrismaDelegate(),
    styleQuiz: createMockPrismaDelegate(),
    styleQuizResult: createMockPrismaDelegate(),
    quizQuestion: createMockPrismaDelegate(),
    userPhoto: createMockPrismaDelegate(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn((fn: unknown) => {
      if (typeof fn === "function") {
        return fn(createMockPrisma());
      }
      return Promise.all(fn as unknown[]);
    }),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0),
  } as unknown as PrismaService;
}

describe("Phase 1 Integration: Auth Flow", () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redisTracker: RedisKeyTracker;
  let jwtService: JwtService;

  const TEST_PHONE = "13800138000";
  const TEST_SMS_CODE = "123456";
  const TEST_WECHAT_CODE = "mock-wechat-code";
  const TEST_WECHAT_OPENID = "mock-open-id-12345";

  beforeAll(async () => {
    prisma = createMockPrisma();
    redisTracker = createRedisKeyTracker();
    const mockRedisService = createMockRedisService(redisTracker);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthHelpersService,
        JwtStrategy,
        SmsService,
        {
          provide: "ISmsService",
          useValue: {
            sendCode: jest.fn().mockResolvedValue(undefined),
          } satisfies ISmsService,
        },
        {
          provide: WechatService,
          useValue: {
            getAccessToken: jest.fn().mockResolvedValue({
              access_token: "mock-access-token",
              openid: TEST_WECHAT_OPENID,
              unionid: "mock-union-id",
            }),
            getUserInfo: jest.fn().mockResolvedValue({
              nickname: "微信测试用户",
              headimgurl: "https://example.com/avatar.jpg",
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: createMockRedisClient(redisTracker) },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: "test-jwt-secret-key-for-testing-only-at-least-64-chars-long-aaaaaa",
                JWT_REFRESH_SECRET: "test-jwt-refresh-secret-key-for-testing-only-at-least-64-chars-long",
                JWT_ACCESS_EXPIRES_IN: "15m",
                JWT_REFRESH_EXPIRES_IN: "7d",
                FRONTEND_URL: "http://localhost:3000",
              };
              return config[key] ?? defaultValue ?? "";
            }),
          },
        },
        {
          provide: StructuredLoggerService,
          useValue: {
            createChildLogger: jest.fn().mockReturnValue({
              log: jest.fn(),
              warn: jest.fn(),
              error: jest.fn(),
              debug: jest.fn(),
            }),
          },
        },
        JwtService,
        EventEmitter2,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisTracker.reset();
  });

  // -------------------------------------------------------------------
  // 1. Send SMS code
  // -------------------------------------------------------------------
  describe("POST /auth/send-code", () => {
    it("should send SMS code to a valid phone number", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/send-code")
        .send({ phone: TEST_PHONE })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: "验证码已发送",
      });
    });
  });

  // -------------------------------------------------------------------
  // 2. Phone register
  // -------------------------------------------------------------------
  describe("POST /auth/phone-register", () => {
    it("should register a new user with phone and SMS code", async () => {
      // Simulate SMS code stored in Redis by SmsService.sendVerificationCode
      redisTracker.setValue(`sms:code:${TEST_PHONE}`, TEST_SMS_CODE);

      const mockCreatedUser = {
        id: "user-phone-001",
        email: `${TEST_PHONE}@sms.placeholder`,
        phone: TEST_PHONE,
        nickname: "测试用户",
        gender: "female",
        avatar: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        const txMock = {
          user: {
            create: jest.fn().mockResolvedValue(mockCreatedUser),
          },
          userProfile: {
            create: jest.fn().mockResolvedValue({ userId: mockCreatedUser.id }),
          },
          userConsent: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return fn(txMock);
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: "rt-001",
        token: "hashed-token",
        userId: mockCreatedUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      });

      const response = await request(app.getHttpServer())
        .post("/auth/phone-register")
        .send({
          phone: TEST_PHONE,
          code: TEST_SMS_CODE,
          gender: "female",
          nickname: "测试用户",
        })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toBeDefined();
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("email");
    });

    it("should return 409 when phone already registered", async () => {
      redisTracker.setValue(`sms:code:${TEST_PHONE}`, TEST_SMS_CODE);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing-user" });

      await request(app.getHttpServer())
        .post("/auth/phone-register")
        .send({
          phone: TEST_PHONE,
          code: TEST_SMS_CODE,
          gender: "female",
        })
        .expect(409);
    });

    it("should return 401 when SMS code is invalid", async () => {
      // No code stored in Redis -> invalid
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app.getHttpServer())
        .post("/auth/phone-register")
        .send({
          phone: TEST_PHONE,
          code: "000000",
          gender: "female",
        })
        .expect(401);
    });
  });

  // -------------------------------------------------------------------
  // 3. Phone login
  // -------------------------------------------------------------------
  describe("POST /auth/phone-login", () => {
    it("should login existing user with phone and code", async () => {
      redisTracker.setValue(`sms:code:${TEST_PHONE}`, TEST_SMS_CODE);

      const mockUser = {
        id: "user-phone-002",
        email: `${TEST_PHONE}@sms.placeholder`,
        phone: TEST_PHONE,
        nickname: "登录测试用户",
        avatar: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: "rt-002",
        token: "hashed-token",
        userId: mockUser.id,
        expiresAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post("/auth/phone-login")
        .send({ phone: TEST_PHONE, code: TEST_SMS_CODE })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toBeDefined();
    });

    it("should auto-register new user on phone login", async () => {
      redisTracker.setValue(`sms:code:${TEST_PHONE}`, TEST_SMS_CODE);

      const mockCreatedUser = {
        id: "user-phone-auto",
        email: `${TEST_PHONE}@sms.placeholder`,
        phone: TEST_PHONE,
        nickname: `用户${TEST_PHONE.slice(-4)}`,
        avatar: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        const txMock = {
          user: {
            create: jest.fn().mockResolvedValue(mockCreatedUser),
          },
          userProfile: {
            create: jest.fn().mockResolvedValue({ userId: mockCreatedUser.id }),
          },
        };
        return fn(txMock);
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: "rt-auto",
        token: "hashed-token",
        userId: mockCreatedUser.id,
        expiresAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post("/auth/phone-login")
        .send({ phone: TEST_PHONE, code: TEST_SMS_CODE })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body.user).toHaveProperty("id", "user-phone-auto");
    });

    it("should return 401 when SMS code is wrong", async () => {
      // Store a different code
      redisTracker.setValue(`sms:code:${TEST_PHONE}`, "654321");

      await request(app.getHttpServer())
        .post("/auth/phone-login")
        .send({ phone: TEST_PHONE, code: "000000" })
        .expect(401);
    });
  });

  // -------------------------------------------------------------------
  // 4. WeChat login
  // -------------------------------------------------------------------
  describe("POST /auth/wechat", () => {
    it("should login via WeChat OAuth code", async () => {
      const mockWechatUser = {
        id: "user-wechat-001",
        email: `wechat_${TEST_WECHAT_OPENID}@placeholder`,
        wechatOpenId: TEST_WECHAT_OPENID,
        nickname: "微信测试用户",
        avatar: "https://example.com/avatar.jpg",
        createdAt: new Date(),
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
        const txMock = {
          user: {
            create: jest.fn().mockResolvedValue(mockWechatUser),
          },
          userProfile: {
            create: jest.fn().mockResolvedValue({ userId: mockWechatUser.id }),
          },
        };
        return fn(txMock);
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: "rt-wechat",
        token: "hashed-token",
        userId: mockWechatUser.id,
        expiresAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post("/auth/wechat")
        .send({ code: TEST_WECHAT_CODE })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toHaveProperty("id", "user-wechat-001");
    });

    it("should return existing user on repeat WeChat login", async () => {
      const existingUser = {
        id: "user-wechat-001",
        email: `wechat_${TEST_WECHAT_OPENID}@placeholder`,
        wechatOpenId: TEST_WECHAT_OPENID,
        nickname: "微信测试用户",
        avatar: "https://example.com/avatar.jpg",
        createdAt: new Date(),
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(existingUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: "rt-wechat-2",
        token: "hashed-token",
        userId: existingUser.id,
        expiresAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post("/auth/wechat")
        .send({ code: TEST_WECHAT_CODE })
        .expect(201);

      expect(response.body.user).toHaveProperty("id", "user-wechat-001");
    });
  });

  // -------------------------------------------------------------------
  // 5. Access protected endpoint with token
  // -------------------------------------------------------------------
  describe("Protected endpoint access", () => {
    it("should access /auth/me with valid token", async () => {
      const token = jwtService.sign(
        { sub: "user-protected-001", email: "test@protected.com" },
        { secret: "test-jwt-secret-key-for-testing-only-at-least-64-chars-long-aaaaaa", expiresIn: "15m" },
      );

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-protected-001",
        email: "test@protected.com",
        nickname: "Protected User",
        avatar: null,
        createdAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", "user-protected-001");
      expect(response.body).toHaveProperty("email", "test@protected.com");
    });

    it("should reject access without token", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .expect(401);
    });
  });
});

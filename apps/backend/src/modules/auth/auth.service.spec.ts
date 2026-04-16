import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "crypto";

import { AuthService, JwtPayload } from "./auth.service";
import { AuthHelpersService } from "./auth.helpers";
import { SmsService, ISmsService } from "./services/sms.service";
import { TokenBlacklistService } from "./services/token-blacklist.service";
import { WechatService } from "./services/wechat.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { EmailService } from "../../common/email/email.service";
import { StructuredLoggerService } from "../../common/logging/structured-logger.service";
import * as bcrypt from "../../common/security/bcrypt";

jest.mock("../../common/security/bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
  compare: jest.fn().mockResolvedValue(true),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: Record<string, jest.Mock>;
  let jwtService: { sign: jest.Mock; verify: jest.Mock; decode: jest.Mock };
  let redisService: { get: jest.Mock; setWithTtl: jest.Mock; del: jest.Mock; exists: jest.Mock };
  let configService: { get: jest.Mock };

  const mockUser = {
    id: "user-id-1",
    email: "test@example.com",
    nickname: "TestUser",
    avatar: null,
    createdAt: new Date(),
  };

  const mockTokens = {
    accessToken: "access-token-mock",
    refreshToken: "refresh-token-mock",
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(mockUser),
      },
      userProfile: { create: jest.fn().mockResolvedValue({}) },
      userConsent: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      refreshToken: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn((fn) => fn({
        user: { create: jest.fn().mockResolvedValue(mockUser) },
        userProfile: { create: jest.fn().mockResolvedValue({}) },
        userConsent: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      })),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue("signed-jwt-token"),
      verify: jest.fn().mockReturnValue({ sub: "user-id-1", email: "test@example.com", jti: "jti-1" }),
      decode: jest.fn().mockReturnValue({ jti: "jti-1", exp: Math.floor(Date.now() / 1000) + 900 }),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      setWithTtl: jest.fn().mockResolvedValue("OK"),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(false),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          JWT_SECRET: "test-secret-key-for-jwt-access-tokens-min-32-chars",
          JWT_REFRESH_SECRET: "test-secret-key-for-jwt-refresh-tokens-min-32-chars",
          JWT_ACCESS_EXPIRES_IN: "15m",
          JWT_REFRESH_EXPIRES_IN: "7d",
        };
        return map[key] ?? defaultValue ?? "";
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
        {
          provide: AuthHelpersService,
          useValue: { validateCredentials: jest.fn().mockResolvedValue(mockUser) },
        },
        { provide: "ISmsService", useValue: { sendCode: jest.fn().mockResolvedValue({ success: true }) } },
        { provide: SmsService, useValue: { verifyCode: jest.fn().mockResolvedValue(true), sendCode: jest.fn().mockResolvedValue({ success: true }) } },
        {
          provide: WechatService,
          useValue: { getAccessToken: jest.fn().mockResolvedValue({ openid: "wx-openid", unionid: null, access_token: "wx-access-token" }), getUserInfo: jest.fn().mockResolvedValue({ nickname: "WxUser", headimgurl: null }) },
        },
        {
          provide: TokenBlacklistService,
          useValue: { blacklistToken: jest.fn().mockResolvedValue(undefined), trackUserToken: jest.fn().mockResolvedValue(undefined), blacklistAllUserTokens: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: EmailService, useValue: { sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, messageId: "msg-1" }) } },
        {
          provide: StructuredLoggerService,
          useValue: { createChildLogger: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          userProfile: { create: jest.fn().mockResolvedValue({}) },
          userConsent: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
        };
        return fn(tx);
      });

      const result = await service.register({
        email: "test@example.com",
        password: "Test1234",
        nickname: "TestUser",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw ConflictException if email already exists", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.register({ email: "test@example.com", password: "Test1234" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const result = await service.login({
        email: "test@example.com",
        password: "Test1234",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result.user.email).toBe("test@example.com");
    });
  });

  describe("refreshToken", () => {
    it("should refresh tokens with valid refresh token", async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([{ id: "rt-1", token: "hashed-rt", userId: "user-id-1" }]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.refreshToken("valid-refresh-token");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should throw UnauthorizedException for invalid refresh token", async () => {
      jwtService.verify.mockImplementationOnce(() => { throw new Error("invalid"); });

      await expect(service.refreshToken("invalid-token")).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when refresh token not found in store", async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([]);

      await expect(service.refreshToken("valid-but-revoked")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("should delete all refresh tokens for user when no refreshToken provided", async () => {
      await service.logout("user-id-1");

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-id-1" },
      });
    });

    it("should delete matching refresh tokens when refreshToken provided", async () => {
      prisma.refreshToken.findMany.mockResolvedValueOnce([{ id: "rt-1", token: "hashed-rt" }]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      await service.logout("user-id-1", "some-refresh-token", "Bearer access-token");

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
    });
  });

  describe("validateUser", () => {
    it("should return user by id", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.validateUser("user-id-1");

      expect(result).toEqual(mockUser);
    });

    it("should return null for non-existent user", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.validateUser("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should send reset email for existing user", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await service.sendPasswordResetEmail("test@example.com");

      expect(redisService.setWithTtl).toHaveBeenCalledWith(
        expect.stringContaining("auth:password_reset:"),
        "user-id-1",
        3600,
      );
    });

    it("should not throw when user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.sendPasswordResetEmail("nobody@example.com")).resolves.toBeUndefined();
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      redisService.get.mockResolvedValueOnce("user-id-1");

      await service.resetPassword("valid-reset-token", "NewPassword123");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-id-1" },
        data: { password: "hashed-password" },
      });
    });

    it("should throw BadRequestException for invalid token", async () => {
      redisService.get.mockResolvedValueOnce(null);

      await expect(service.resetPassword("invalid-token", "NewPassword123")).rejects.toThrow(BadRequestException);
    });
  });

  describe("sendSmsCode", () => {
    it("should send SMS code successfully", async () => {
      redisService.exists.mockResolvedValueOnce(false);

      await service.sendSmsCode("13800138000");

      expect(redisService.setWithTtl).toHaveBeenCalledTimes(2);
    });

    it("should throw BadRequestException when throttled", async () => {
      redisService.exists.mockResolvedValueOnce(true);

      await expect(service.sendSmsCode("13800138000")).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifySmsCode", () => {
    it("should verify valid SMS code", async () => {
      redisService.get.mockResolvedValueOnce("0");
      redisService.get.mockResolvedValueOnce("123456");

      const result = await service.verifySmsCode("13800138000", "123456");

      expect(result).toBe(true);
    });

    it("should return false for invalid SMS code", async () => {
      redisService.get.mockResolvedValueOnce("0");
      redisService.get.mockResolvedValueOnce("654321");

      const result = await service.verifySmsCode("13800138000", "123456");

      expect(result).toBe(false);
    });

    it("should throw BadRequestException after 5 failed attempts", async () => {
      redisService.get.mockResolvedValueOnce("5");

      await expect(service.verifySmsCode("13800138000", "123456")).rejects.toThrow(BadRequestException);
    });
  });

  describe("loginWithPhone", () => {
    it("should login existing user with phone", async () => {
      redisService.get.mockResolvedValueOnce("0");
      redisService.get.mockResolvedValueOnce("123456");
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.loginWithPhone("13800138000", "123456");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should auto-register new user with phone", async () => {
      redisService.get.mockResolvedValueOnce("0");
      redisService.get.mockResolvedValueOnce("123456");
      prisma.user.findUnique.mockResolvedValueOnce(null);
      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (fn: Function) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue({ ...mockUser, phone: "13800138000" }) },
          userProfile: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const result = await service.loginWithPhone("13800138000", "123456");

      expect(result).toHaveProperty("accessToken");
    });

    it("should throw UnauthorizedException for invalid code", async () => {
      redisService.get.mockResolvedValueOnce("0");
      redisService.get.mockResolvedValueOnce("654321");

      await expect(service.loginWithPhone("13800138000", "123456")).rejects.toThrow(UnauthorizedException);
    });
  });
});

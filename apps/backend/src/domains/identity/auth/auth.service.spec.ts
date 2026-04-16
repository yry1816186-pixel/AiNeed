import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { StructuredLoggerService } from "../../../../common/logging/structured-logger.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import * as bcrypt from "../../../../common/security/bcrypt";

import { AuthHelpersService } from "./auth.helpers";
import { AuthService } from "./auth.service";
import { ISmsService, SmsService } from "./services/sms.service";
import { TokenBlacklistService } from "./services/token-blacklist.service";
import { WechatService } from "./services/wechat.service";

// Mock bcrypt
jest.mock("../../../../../common/security/bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockSmsService = {
  sendCode: jest.fn(),
};

const mockSmsVerificationService = {
  verifyCode: jest.fn(),
};

const mockWechatService = {
  getAccessToken: jest.fn(),
  getUserInfo: jest.fn(),
};

const mockAuthHelpersService = {
  validateCredentials: jest.fn(),
};

const mockTokenBlacklistService = {
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  isBlacklisted: jest.fn().mockResolvedValue(false),
  blacklistAllUserTokens: jest.fn().mockResolvedValue(undefined),
  trackUserToken: jest.fn().mockResolvedValue(undefined),
};

const mockLoggingService = {
  createChildLogger: jest.fn().mockReturnValue({
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  }),
};

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let redisService: RedisService;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaService: Record<string, any> = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
    userConsent: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_REFRESH_SECRET: "test-refresh-secret-key",
        JWT_SECRET: "test-jwt-secret-key",
        FRONTEND_URL: "http://localhost:3000",
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockRedisService = {
    exists: jest.fn().mockResolvedValue(false),
    incr: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(true),
    setWithTtl: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue("0"),
  };

  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    password: "hashed-password",
    nickname: "Test User",
    avatar: null,
    createdAt: new Date(),
  };

  const mockRefreshToken = {
    id: "refresh-token-id",
    token: "valid-refresh-token",
    userId: "test-user-id",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: AuthHelpersService,
          useValue: mockAuthHelpersService,
        },
        {
          provide: "ISmsService",
          useValue: mockSmsService,
        },
        {
          provide: SmsService,
          useValue: mockSmsVerificationService,
        },
        {
          provide: WechatService,
          useValue: mockWechatService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const registerDto = {
      email: "test@example.com",
      password: "Password123",
      nickname: "Test User",
    };

    it("应该成功注册新用户", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result.user.email).toBe(registerDto.email);
      expect(result.accessToken).toBe("test-access-token");
      expect(result.refreshToken).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.userProfile.create).toHaveBeenCalledWith({
        data: { userId: mockUser.id },
      });
    });

    it("应该拒绝已注册的邮箱", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it("应该正确处理带有手机号的注册", async () => {
      const registerDtoWithPhone = {
        ...registerDto,
        phone: "13800138000",
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockPrismaService.user.create.mockResolvedValue({
        ...mockUser,
        phone: "13800138000",
      });
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register(registerDtoWithPhone);

      expect(result.user.email).toBe(registerDto.email);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: "13800138000",
          }),
        }),
      );
    });
  });

  describe("login", () => {
    const loginDto = {
      email: "test@example.com",
      password: "Password123",
    };

    it("应该成功登录", async () => {
      mockAuthHelpersService.validateCredentials.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBe("test-access-token");
      expect(result.refreshToken).toBeDefined();
      expect(mockAuthHelpersService.validateCredentials).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
    });

    it("应该拒绝不存在的用户", async () => {
      mockAuthHelpersService.validateCredentials.mockRejectedValue(
        new UnauthorizedException("邮箱或密码错误"),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该拒绝错误的密码", async () => {
      mockAuthHelpersService.validateCredentials.mockRejectedValue(
        new UnauthorizedException("邮箱或密码错误"),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该在登录时生成并保存refresh token", async () => {
      mockAuthHelpersService.validateCredentials.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login(loginDto);

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
          }),
        }),
      );
    });
  });

  describe("refreshToken", () => {
    it("应该成功刷新token", async () => {
      const mockPayload = { sub: "test-user-id", email: "test@example.com" };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      mockJwtService.sign.mockReturnValue("new-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshToken("valid-refresh-token");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBeDefined();
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [mockRefreshToken.id],
          },
        },
      });
    });

    it("应该拒绝无效的refresh token", async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshToken("invalid-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该拒绝过期的refresh token", async () => {
      const mockPayload = { sub: "test-user-id", email: "test@example.com" };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);

      await expect(service.refreshToken("expired-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该拒绝不属于该用户的refresh token", async () => {
      const mockPayload = { sub: "different-user-id", email: "test@example.com" };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findMany.mockResolvedValue([]);

      await expect(service.refreshToken("wrong-user-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("logout", () => {
    it("应该删除特定的refresh token", async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout("test-user-id", "specific-refresh-token");

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [mockRefreshToken.id],
          },
        },
      });
    });

    it("应该删除用户所有的refresh tokens（强制登出所有设备）", async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      await service.logout("test-user-id");

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
      });
      expect(mockTokenBlacklistService.blacklistAllUserTokens).toHaveBeenCalledWith("test-user-id");
    });

    it("应该将access token加入黑名单", async () => {
      const mockDecoded = {
        sub: "test-user-id",
        email: "test@example.com",
        jti: "access-jti-123",
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      mockJwtService.decode = jest.fn().mockReturnValue(mockDecoded);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout("test-user-id", "specific-refresh-token", "access-token-value");

      expect(mockJwtService.decode).toHaveBeenCalledWith("access-token-value");
      expect(mockTokenBlacklistService.blacklistToken).toHaveBeenCalledWith(
        "access-jti-123",
        expect.any(Number),
      );
    });

    it("应该在access token解码失败时安全处理", async () => {
      mockJwtService.decode = jest.fn().mockReturnValue(null);
      mockPrismaService.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout("test-user-id", "specific-refresh-token", "invalid-token");

      expect(mockTokenBlacklistService.blacklistToken).not.toHaveBeenCalled();
    });

    it("应该在access token没有jti时跳过黑名单", async () => {
      const mockDecoded = {
        sub: "test-user-id",
        email: "test@example.com",
      };
      mockJwtService.decode = jest.fn().mockReturnValue(mockDecoded);
      mockPrismaService.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout("test-user-id", "specific-refresh-token", "access-token-no-jti");

      expect(mockTokenBlacklistService.blacklistToken).not.toHaveBeenCalled();
    });
  });

  describe("validateUser", () => {
    it("应该返回用户信息", async () => {
      const userWithoutPassword = {
        id: mockUser.id,
        email: mockUser.email,
        nickname: mockUser.nickname,
        avatar: mockUser.avatar,
        gender: null,
        createdAt: mockUser.createdAt,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutPassword);

      const result = await service.validateUser(mockUser.id);

      expect(result).toEqual(userWithoutPassword);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          gender: true,
          createdAt: true,
        },
      });
    });

    it("应该返回 null 如果用户不存在", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("generateTokens", () => {
    it("应该生成带有正确过期时间的accessToken", async () => {
      mockJwtService.sign.mockReturnValue("test-token");

      mockAuthHelpersService.validateCredentials.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login({ email: "test@example.com", password: "Password123" });

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: mockUser.id, email: mockUser.email, jti: expect.any(String) },
        expect.objectContaining({
          secret: "test-jwt-secret-key",
          expiresIn: "15m",
        }),
      );
    });

    it("应该使用configService中的refresh secret", async () => {
      mockJwtService.sign.mockReturnValue("test-token");

      mockAuthHelpersService.validateCredentials.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login({ email: "test@example.com", password: "Password123" });

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          jti: expect.any(String),
        }),
        expect.objectContaining({
          secret: "test-refresh-secret-key",
          expiresIn: "7d",
        }),
      );
    });
  });

  describe("saveRefreshToken", () => {
    it("应该创建带有正确过期时间的refresh token", async () => {
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      // 通过register方法间接测试saveRefreshToken
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("test-token");

      await service.register({
        email: "test@example.com",
        password: "Password123",
        nickname: "Test User",
      });

      const createCall = mockPrismaService.refreshToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      // 验证过期时间约为7天后（允许1分钟误差）
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60000); // 1 minute tolerance
    });
  });

  describe("登录锁定机制", () => {
    const loginDto = {
      email: "test@example.com",
      password: "Password123",
    };

    it("应该在账户被锁定时拒绝登录", async () => {
      mockAuthHelpersService.validateCredentials.mockRejectedValue(
        new UnauthorizedException("账户已被锁定，请15分钟后再试"),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "账户已被锁定，请15分钟后再试",
      );
    });

    it("应该在密码错误时记录失败尝试", async () => {
      mockAuthHelpersService.validateCredentials.mockRejectedValue(
        new UnauthorizedException("邮箱或密码错误，剩余尝试次数: 4"),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该在达到最大尝试次数后锁定账户", async () => {
      mockAuthHelpersService.validateCredentials.mockRejectedValue(
        new UnauthorizedException("账户已被锁定，请15分钟后再试"),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        "账户已被锁定，请15分钟后再试",
      );
    });

    it("应该在登录成功后通过 authHelpersService 验证凭据", async () => {
      mockAuthHelpersService.validateCredentials.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login(loginDto);

      expect(mockAuthHelpersService.validateCredentials).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
    });

    it("应该显示剩余尝试次数", async () => {
      mockAuthHelpersService.validateCredentials.mockRejectedValue(
        new UnauthorizedException("邮箱或密码错误，剩余尝试次数: 3"),
      );

      await expect(service.login(loginDto)).rejects.toThrow(
        "邮箱或密码错误，剩余尝试次数: 3",
      );
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("应该为存在的用户创建重置令牌", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.setWithTtl.mockResolvedValue("OK");

      await service.sendPasswordResetEmail("test@example.com");

      expect(mockRedisService.setWithTtl).toHaveBeenCalledWith(
        expect.stringContaining("auth:password_reset:"),
        mockUser.id,
        3600,
      );
    });

    it("应该静默处理不存在的用户（安全考虑）", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // 不应该抛出异常
      await expect(
        service.sendPasswordResetEmail("nonexistent@example.com"),
      ).resolves.not.toThrow();

      // 不应该创建重置令牌
      expect(mockRedisService.setWithTtl).not.toHaveBeenCalled();
    });

    it("应该使用小写邮箱查找用户", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.setWithTtl.mockResolvedValue("OK");

      await service.sendPasswordResetEmail("TEST@EXAMPLE.COM");

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });
  });

  describe("resetPassword", () => {
    it("应该成功重置密码", async () => {
      const resetToken = "valid-reset-token";
      const newPassword = "NewPassword123";

      mockRedisService.get.mockResolvedValue(mockUser.id);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hashed-password");
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: "new-hashed-password",
      });
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      await service.resetPassword(resetToken, newPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: "new-hashed-password" },
      });
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `auth:password_reset:${resetToken}`,
      );
      // 应该删除所有 refresh tokens（强制登出所有设备）
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
      });
    });

    it("应该拒绝无效的重置令牌", async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.resetPassword("invalid-token", "NewPassword123"),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.resetPassword("invalid-token", "NewPassword123"),
      ).rejects.toThrow("无效或已过期的重置令牌");
    });

    it("应该拒绝过期的重置令牌", async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.resetPassword("expired-token", "NewPassword123"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("边界情况测试", () => {
    it("应该处理超长邮箱地址", async () => {
      const longEmail = "a".repeat(200) + "@example.com";
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendPasswordResetEmail(longEmail),
      ).resolves.not.toThrow();
    });

    it("应该处理包含特殊字符的密码", async () => {
      const specialPassword = "P@ssw0rd!#$%^&*()_+-=[]{}|;':\",./<>?";
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("test-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.register({
        email: "test@example.com",
        password: specialPassword,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(specialPassword, 10);
    });

    it("应该正确处理用户昵称为 null 的情况", async () => {
      const userWithNullNickname = {
        ...mockUser,
        nickname: null,
      };

      mockAuthHelpersService.validateCredentials.mockResolvedValue(userWithNullNickname);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: "test@example.com",
        password: "Password123",
      });

      expect(result.user.nickname).toBeUndefined();
    });

    it("应该正确处理用户头像为 null 的情况", async () => {
      const userWithNullAvatar = {
        ...mockUser,
        avatar: null,
      };

      mockAuthHelpersService.validateCredentials.mockResolvedValue(userWithNullAvatar);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: "test@example.com",
        password: "Password123",
      });

      expect(result.user.avatar).toBeUndefined();
    });
  });

  describe("sendSmsCode", () => {
    it("应该成功发送验证码", async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.setWithTtl.mockResolvedValue("OK");
      mockSmsService.sendCode = jest.fn().mockResolvedValue(undefined);

      await service.sendSmsCode("13800138000");

      expect(mockRedisService.setWithTtl).toHaveBeenCalledWith("sms:code:13800138000", expect.any(String), 300000);
      expect(mockRedisService.setWithTtl).toHaveBeenCalledWith("sms:throttle:13800138000", "1", 60000);
      expect(mockSmsService.sendCode).toHaveBeenCalledWith("13800138000", expect.any(String));
    });

    it("应该在限流期内拒绝发送", async () => {
      mockRedisService.exists.mockResolvedValue(true);

      await expect(service.sendSmsCode("13800138000")).rejects.toThrow(BadRequestException);
      await expect(service.sendSmsCode("13800138000")).rejects.toThrow("发送过于频繁，请60秒后再试");
    });
  });

  describe("verifySmsCode", () => {
    it("验证码正确时应返回 true", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("sms:attempts:")) {return Promise.resolve("0");}
        if (key.startsWith("sms:code:")) {return Promise.resolve("123456");}
        return Promise.resolve(null);
      });
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.verifySmsCode("13800138000", "123456");

      expect(result).toBe(true);
      expect(mockRedisService.del).toHaveBeenCalledWith("sms:code:13800138000");
    });

    it("验证码错误时应返回 false", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("sms:attempts:")) {return Promise.resolve("0");}
        if (key.startsWith("sms:code:")) {return Promise.resolve("654321");}
        return Promise.resolve(null);
      });

      const result = await service.verifySmsCode("13800138000", "123456");

      expect(result).toBe(false);
    });

    it("验证码不存在时应返回 false", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("sms:attempts:")) {return Promise.resolve("0");}
        return Promise.resolve(null);
      });

      const result = await service.verifySmsCode("13800138000", "123456");

      expect(result).toBe(false);
    });
  });

  describe("loginWithPhone", () => {
    it("已注册用户应该成功登录", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("sms:attempts:")) {return Promise.resolve("0");}
        if (key.startsWith("sms:code:")) {return Promise.resolve("123456");}
        return Promise.resolve(null);
      });
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithPhone("13800138000", "123456");

      expect(result.accessToken).toBe("test-access-token");
      expect(result.refreshToken).toBeDefined();
    });

    it("未注册用户应该自动注册并登录", async () => {
      const newUser = { ...mockUser, phone: "13800138000" };
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("sms:attempts:")) {return Promise.resolve("0");}
        if (key.startsWith("sms:code:")) {return Promise.resolve("123456");}
        return Promise.resolve(null);
      });
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithPhone("13800138000", "123456");

      expect(result.accessToken).toBe("test-access-token");
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it("验证码无效时应该拒绝登录", async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(service.loginWithPhone("13800138000", "123456")).rejects.toThrow(UnauthorizedException);
      await expect(service.loginWithPhone("13800138000", "123456")).rejects.toThrow("验证码无效或已过期");
    });
  });

  describe("loginWithWechat", () => {
    it("已注册微信用户应该成功登录", async () => {
      const wechatUser = { ...mockUser, wechatOpenId: "test-openid" };
      mockWechatService.getAccessToken = jest.fn().mockResolvedValue({
        access_token: "test-token",
        openid: "test-openid",
        expires_in: 7200,
        refresh_token: "test-refresh",
        scope: "snsapi_userinfo",
      });
      mockPrismaService.user.findFirst.mockResolvedValue(wechatUser);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithWechat("test-code");

      expect(result.accessToken).toBe("test-access-token");
    });

    it("未注册微信用户应该自动注册", async () => {
      mockWechatService.getAccessToken = jest.fn().mockResolvedValue({
        access_token: "test-token",
        openid: "new-openid",
        expires_in: 7200,
        refresh_token: "test-refresh",
        scope: "snsapi_userinfo",
      });
      mockWechatService.getUserInfo = jest.fn().mockResolvedValue({
        openid: "new-openid",
        nickname: "微信用户",
        headimgurl: "https://example.com/avatar.jpg",
      });
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      mockPrismaService.user.create.mockResolvedValue({ ...mockUser, wechatOpenId: "new-openid" });
      mockPrismaService.userProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.loginWithWechat("test-code");

      expect(result.accessToken).toBe("test-access-token");
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it("微信授权失败时应该拒绝登录", async () => {
      mockWechatService.getAccessToken = jest.fn().mockRejectedValue(new UnauthorizedException("微信授权失败"));

      await expect(service.loginWithWechat("invalid-code")).rejects.toThrow(UnauthorizedException);
    });
  });
});

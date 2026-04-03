import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import * as bcrypt from "../../common/security/bcrypt";

import { AuthService } from "./auth.service";

// Mock bcrypt
jest.mock("../../common/security/bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
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
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBe("test-access-token");
      expect(result.refreshToken).toBeDefined();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it("应该拒绝不存在的用户", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("应该拒绝错误的密码", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该在登录时生成并保存refresh token", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
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

      // 通过login方法间接测试generateTokens
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login({ email: "test@example.com", password: "Password123" });

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        { sub: mockUser.id, email: mockUser.email },
        expect.objectContaining({
          secret: "test-jwt-secret-key",
          expiresIn: "15m",
        }),
      );
    });

    it("应该使用configService中的refresh secret", async () => {
      mockJwtService.sign.mockReturnValue("test-token");

      // 通过login方法间接测试
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login({ email: "test@example.com", password: "Password123" });

      // 验证refresh token使用了正确的secret
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
      mockRedisService.exists.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "账户已被锁定，请15分钟后再试",
      );
    });

    it("应该在密码错误时记录失败尝试", async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockRedisService.incr.mockResolvedValue(1);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockRedisService.incr).toHaveBeenCalledWith(
        expect.stringContaining("auth:login_attempts:"),
      );
    });

    it("应该在达到最大尝试次数后锁定账户", async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockRedisService.incr.mockResolvedValue(5);

      await expect(service.login(loginDto)).rejects.toThrow(
        "账户已被锁定，请15分钟后再试",
      );

      expect(mockRedisService.setWithTtl).toHaveBeenCalledWith(
        expect.stringContaining("auth:lockout:"),
        "1",
        expect.any(Number),
      );
    });

    it("应该在登录成功后重置失败尝试计数", async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      await service.login(loginDto);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        expect.stringContaining("auth:login_attempts:"),
      );
    });

    it("应该显示剩余尝试次数", async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockRedisService.incr.mockResolvedValue(2);
      mockRedisService.get.mockResolvedValue("2");

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

      mockPrismaService.user.findUnique.mockResolvedValue(userWithNullNickname);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
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

      mockPrismaService.user.findUnique.mockResolvedValue(userWithNullAvatar);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue("test-access-token");
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: "test@example.com",
        password: "Password123",
      });

      expect(result.user.avatar).toBeUndefined();
    });
  });
});

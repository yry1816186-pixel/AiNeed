/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { TokenBlacklistService } from "../services/token-blacklist.service";

import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let _tokenBlacklistService: TokenBlacklistService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: "test-jwt-secret-key-for-testing",
      };
      return config[key];
    }),
  };

  const mockTokenBlacklistService = {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    blacklistAllUserTokens: jest.fn().mockResolvedValue(undefined),
    trackUserToken: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
    _tokenBlacklistService = module.get<TokenBlacklistService>(TokenBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should be defined", () => {
      expect(strategy).toBeDefined();
    });

    it("should throw error when JWT_SECRET is not set", async () => {
      const noSecretConfig = {
        get: jest.fn((key: string) => {
          if (key === "JWT_SECRET") {return undefined;}
          return undefined;
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            JwtStrategy,
            { provide: ConfigService, useValue: noSecretConfig },
            { provide: TokenBlacklistService, useValue: mockTokenBlacklistService },
          ],
        }).compile(),
      ).rejects.toThrow("JWT_SECRET environment variable is required");
    });

    it("should read JWT_SECRET from config", () => {
      expect(configService.get).toHaveBeenCalledWith("JWT_SECRET");
    });
  });

  describe("validate", () => {
    it("should return validated user from valid payload with jti", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        jti: "token-jti-123",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
      });
    });

    it("should throw UnauthorizedException when payload has no jti", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
      };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow("Token missing identifier");
    });

    it("should throw UnauthorizedException when jti is empty string", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        jti: "",
      };

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow("Token missing identifier");
    });

    it("should throw UnauthorizedException when token is blacklisted", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        jti: "blacklisted-jti",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(true);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow("Token has been revoked");
    });

    it("should check blacklist with the correct jti", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        jti: "specific-jti-456",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      await strategy.validate(payload);

      expect(mockTokenBlacklistService.isBlacklisted).toHaveBeenCalledWith("specific-jti-456");
    });

    it("should allow valid token that is not blacklisted", async () => {
      const payload = {
        sub: "user-456",
        email: "valid@example.com",
        jti: "valid-jti-789",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: "user-456",
        email: "valid@example.com",
      });
    });

    it("should map sub to id in the returned object", async () => {
      const payload = {
        sub: "mapped-user-id",
        email: "mapped@example.com",
        jti: "some-jti",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.id).toBe("mapped-user-id");
      expect(result).not.toHaveProperty("sub");
    });

    it("should preserve email in the returned object", async () => {
      const payload = {
        sub: "user-123",
        email: "preserve@example.com",
        jti: "some-jti",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result.email).toBe("preserve@example.com");
    });

    it("should not include jti in the returned object", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        jti: "should-not-appear",
      };

      mockTokenBlacklistService.isBlacklisted.mockResolvedValue(false);

      const result = await strategy.validate(payload);

      expect(result).not.toHaveProperty("jti");
    });

    it("should not check blacklist when jti is missing (throws first)", async () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
      };

      try {
        await strategy.validate(payload);
      } catch {
        // Expected to throw
      }

      expect(mockTokenBlacklistService.isBlacklisted).not.toHaveBeenCalled();
    });
  });
});

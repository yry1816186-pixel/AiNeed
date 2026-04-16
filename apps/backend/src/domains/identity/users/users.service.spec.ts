/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { EncryptionService } from "../../../common/encryption";
import { PIIEncryptionService } from "../../../common/encryption/pii-encryption.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import * as bcrypt from "../../../common/security/bcrypt";
import { CacheService } from "../../../modules/cache/cache.service";

import { UsersService } from "./users.service";


jest.mock("../../../common/security/bcrypt");

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPhoto: { count: jest.fn() },
    virtualTryOn: { count: jest.fn() },
    favorite: { count: jest.fn() },
    order: { count: jest.fn() },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    getOrSet: jest.fn().mockImplementation(async (key, fetcher) => fetcher()),
    ttl: jest.fn(),
    exists: jest.fn(),
    refresh: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn((value: string) => `enc:${value}`),
    decrypt: jest.fn((value: string) => value.replace(/^enc:/, "")),
    isEncrypted: jest.fn((value: string) => value?.startsWith("enc:")),
    hash: jest.fn((value: string) => `hash:${value}`),
    verifyHash: jest.fn((value: string, hash: string) => hash === `hash:${value}`),
  };

  const mockPiiEncryptionService = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encryptPII: jest.fn((model: string, data: any) => data),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decryptPII: jest.fn((model: string, data: any) => data),
    isEncrypted: jest.fn(() => false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: PIIEncryptionService,
          useValue: mockPiiEncryptionService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("should return null when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById("user-1");

      expect(result).toBeNull();
    });

    it("should return user when found", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        phone: "13800138000",
        nickname: "Test User",
        avatar: null,
        gender: "male",
        birthDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById("user-1");

      expect(result).toBeDefined();
      expect(result?.email).toBe("test@example.com");
    });
  });

  describe("update", () => {
    it("should throw error when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update("user-1", { nickname: "New Name" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update user successfully", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        nickname: "Old Name",
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: "user-1",
        nickname: "New Name",
        email: "test@example.com",
        phone: null,
        avatar: null,
        gender: null,
        birthDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update("user-1", { nickname: "New Name" });

      expect(result.nickname).toBe("New Name");
    });
  });

  describe("changePassword", () => {
    it("should throw error when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword("user-1", {
          oldPassword: "old123",
          newPassword: "new123",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw error when old password is incorrect", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        password: "hashedPassword",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword("user-1", {
          oldPassword: "wrong",
          newPassword: "new123",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when new password is same as old", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        password: "hashedPassword",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword("user-1", {
          oldPassword: "same123",
          newPassword: "same123",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when new password is too short", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        password: "hashedPassword",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword("user-1", {
          oldPassword: "old123",
          newPassword: "123",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should change password successfully", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        password: "hashedOldPassword",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedNewPassword");
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.changePassword("user-1", {
        oldPassword: "Old123456",
        newPassword: "NewPass123",
      });

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith("NewPass123", 10);
    });
  });

  describe("updateAvatar", () => {
    it("should throw error when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAvatar("user-1", "https://example.com/avatar.jpg"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update avatar successfully", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        avatar: null,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: "user-1",
        avatar: "https://example.com/avatar.jpg",
        email: "test@example.com",
        phone: null,
        nickname: null,
        gender: null,
        birthDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateAvatar(
        "user-1",
        "https://example.com/avatar.jpg",
      );

      expect(result.avatar).toBe("https://example.com/avatar.jpg");
    });
  });

  describe("deactivate", () => {
    it("should throw error when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivate("user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should deactivate user successfully", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: "user-1",
        isActive: true,
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: "user-1",
        isActive: false,
      });

      const result = await service.deactivate("user-1");

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { isActive: false },
      });
    });
  });

  describe("getStats", () => {
    it("should return user statistics", async () => {
      mockPrismaService.userPhoto.count.mockResolvedValue(10);
      mockPrismaService.virtualTryOn.count.mockResolvedValue(5);
      mockPrismaService.favorite.count.mockResolvedValue(20);
      mockPrismaService.order.count.mockResolvedValue(3);

      const result = await service.getStats("user-1");

      expect(result.photosCount).toBe(10);
      expect(result.tryOnsCount).toBe(5);
      expect(result.favoritesCount).toBe(20);
      expect(result.ordersCount).toBe(3);
    });
  });
});

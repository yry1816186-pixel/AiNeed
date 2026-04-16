/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { EncryptionService } from "../../../common/encryption/encryption.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

import { AddressService } from "./address.service";

describe("AddressService", () => {
  let service: AddressService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userAddress: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEncryptionService = {
    encrypt: jest.fn((val: string | null | undefined) => (val ? `encrypted:${val}` : val)),
    decrypt: jest.fn((val: string | null | undefined) => (val ? val.replace("encrypted:", "") : val)),
    isEncrypted: jest.fn((val: string | null | undefined) => (val ? val.startsWith("encrypted:") : false)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return addresses sorted by default first", async () => {
      const mockAddresses = [
        { id: "addr-1", isDefault: true, name: "Default Address" },
        { id: "addr-2", isDefault: false, name: "Other Address" },
      ];

      mockPrismaService.userAddress.findMany.mockResolvedValue(mockAddresses);

      const result = await service.findAll("user-1");

      expect(result).toHaveLength(2);
      expect(mockPrismaService.userAddress.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
    });
  });

  describe("findOne", () => {
    it("should throw error when address not found", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "addr-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return address when found", async () => {
      const mockAddress = {
        id: "addr-1",
        name: "Test User",
        phone: "13800138000",
        province: "Beijing",
        city: "Beijing",
        district: "Chaoyang",
        address: "Test Address",
        isDefault: true,
        createdAt: new Date(),
      };

      mockPrismaService.userAddress.findFirst.mockResolvedValue(mockAddress);

      const result = await service.findOne("user-1", "addr-1");

      expect(result.id).toBe("addr-1");
    });
  });

  describe("create", () => {
    const createDto = {
      name: "Test User",
      phone: "13800138000",
      province: "Beijing",
      city: "Beijing",
      district: "Chaoyang",
      address: "Test Address",
    };

    it("should throw error when phone format is invalid", async () => {
      mockPrismaService.userAddress.count.mockResolvedValue(0);

      await expect(
        service.create("user-1", { ...createDto, phone: "12345" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw error when address limit reached", async () => {
      mockPrismaService.userAddress.count.mockResolvedValue(10);

      await expect(service.create("user-1", createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should set as default when it is first address", async () => {
      mockPrismaService.userAddress.count.mockResolvedValue(0);
      mockPrismaService.userAddress.create.mockResolvedValue({
        id: "addr-1",
        ...createDto,
        isDefault: true,
        createdAt: new Date(),
      });

      const result = await service.create("user-1", createDto);

      expect(result.isDefault).toBe(true);
    });

    it("should unset previous default when setting new default", async () => {
      mockPrismaService.userAddress.count.mockResolvedValue(2);
      mockPrismaService.userAddress.updateMany.mockResolvedValue({});
      mockPrismaService.userAddress.create.mockResolvedValue({
        id: "addr-1",
        ...createDto,
        isDefault: true,
        createdAt: new Date(),
      });

      const result = await service.create("user-1", {
        ...createDto,
        isDefault: true,
      });

      expect(mockPrismaService.userAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe("update", () => {
    it("should throw error when address not found", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "addr-1", { name: "New Name" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update address successfully", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "addr-1",
      });
      mockPrismaService.userAddress.update.mockResolvedValue({
        id: "addr-1",
        name: "New Name",
        isDefault: false,
        createdAt: new Date(),
      });

      const result = await service.update("user-1", "addr-1", {
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
    });
  });

  describe("remove", () => {
    it("should throw error when address not found", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue(null);

      await expect(service.remove("user-1", "addr-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set next address as default when removing default", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "addr-1",
        isDefault: true,
      });
      mockPrismaService.userAddress.delete.mockResolvedValue({});
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "addr-2",
      });
      mockPrismaService.userAddress.update.mockResolvedValue({});

      await service.remove("user-1", "addr-1");

      expect(mockPrismaService.userAddress.delete).toHaveBeenCalled();
    });
  });

  describe("setDefault", () => {
    it("should throw error when address not found", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue(null);

      await expect(service.setDefault("user-1", "addr-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set address as default", async () => {
      mockPrismaService.userAddress.findFirst.mockResolvedValue({
        id: "addr-1",
      });
      mockPrismaService.userAddress.updateMany.mockResolvedValue({});
      mockPrismaService.userAddress.update.mockResolvedValue({});

      await service.setDefault("user-1", "addr-1");

      expect(mockPrismaService.userAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrismaService.userAddress.update).toHaveBeenCalledWith({
        where: { id: "addr-1" },
        data: { isDefault: true },
      });
    });
  });
});

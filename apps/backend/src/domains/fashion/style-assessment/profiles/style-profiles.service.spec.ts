import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { BehaviorTrackerService } from "../../../../domains/platform/analytics/services/behavior-tracker.service";

import { StyleProfilesService } from "./style-profiles.service";

describe("StyleProfilesService", () => {
  let service: StyleProfilesService;
  let prismaService: PrismaService;
  let behaviorTracker: BehaviorTrackerService;

  const mockPrismaService = {
    styleProfile: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockBehaviorTracker = {
    getUserBehaviorProfile: jest.fn(),
  };

  const userId = "user-001";
  const profileId = "profile-001";

  const mockProfile = {
    id: profileId,
    userId,
    name: "日常通勤",
    occasion: "work",
    description: "简约干练的职场穿搭风格",
    keywords: ["简约", "干练", "职场"],
    palette: ["#000000", "#FFFFFF", "#1A1A2E"],
    confidence: 75,
    isDefault: false,
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  };

  const mockBehaviorProfile = {
    preferences: {
      styles: [
        { key: "简约", weight: 0.8 },
        { key: "优雅", weight: 0.5 },
        { key: "休闲", weight: 0.2 },
      ],
      colors: [
        { key: "#000000", weight: 0.7 },
        { key: "#1A1A2E", weight: 0.4 },
        { key: "#FF0000", weight: 0.1 },
      ],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StyleProfilesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BehaviorTrackerService, useValue: mockBehaviorTracker },
      ],
    }).compile();

    service = module.get<StyleProfilesService>(StyleProfilesService);
    prismaService = module.get<PrismaService>(PrismaService);
    behaviorTracker = module.get<BehaviorTrackerService>(BehaviorTrackerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("应该返回用户所有风格档案并按 isDefault desc 和 updatedAt desc 排序", async () => {
      const profiles = [
        { ...mockProfile, isDefault: true, updatedAt: new Date("2025-01-05") },
        { ...mockProfile, id: "profile-002", isDefault: false, updatedAt: new Date("2025-01-03") },
      ];
      mockPrismaService.styleProfile.findMany.mockResolvedValue(profiles);

      const result = await service.findAll(userId);

      expect(result).toEqual(profiles);
      expect(mockPrismaService.styleProfile.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      });
    });

    it("应该在用户没有档案时返回空数组", async () => {
      mockPrismaService.styleProfile.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("应该根据 id 和 userId 找到对应档案", async () => {
      mockPrismaService.styleProfile.findFirst.mockResolvedValue(mockProfile);

      const result = await service.findOne(userId, profileId);

      expect(result).toEqual(mockProfile);
      expect(mockPrismaService.styleProfile.findFirst).toHaveBeenCalledWith({
        where: { id: profileId, userId },
      });
    });

    it("应该在找不到档案时抛出 NotFoundException", async () => {
      mockPrismaService.styleProfile.findFirst.mockResolvedValue(null);

      await expect(service.findOne(userId, "non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(userId, "non-existent-id")).rejects.toThrow(
        "风格档案不存在",
      );
    });
  });

  describe("create", () => {
    it("应该成功创建风格档案并使用行为数据增强", async () => {
      const dto = {
        name: "日常通勤",
        occasion: "work",
        description: "简约干练的职场穿搭风格",
        keywords: ["简约", "干练", "职场"],
        palette: ["#000000", "#FFFFFF", "#1A1A2E"],
      };

      mockBehaviorTracker.getUserBehaviorProfile.mockResolvedValue(mockBehaviorProfile);
      mockPrismaService.styleProfile.create.mockResolvedValue(mockProfile);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockProfile);
      expect(mockBehaviorTracker.getUserBehaviorProfile).toHaveBeenCalledWith(userId);
      expect(mockPrismaService.styleProfile.create).toHaveBeenCalled();
    });

    it("应该在 isDefault 为 true 时先清除其他默认档案", async () => {
      const dto = {
        name: "默认风格",
        occasion: "daily",
        description: "默认穿搭",
        keywords: ["休闲"],
        palette: ["#F5F5DC"],
        isDefault: true,
      };

      mockBehaviorTracker.getUserBehaviorProfile.mockResolvedValue(mockBehaviorProfile);
      mockPrismaService.styleProfile.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.styleProfile.create.mockResolvedValue({
        ...mockProfile,
        isDefault: true,
      });

      const result = await service.create(userId, dto);

      expect(mockPrismaService.styleProfile.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });
  });

  describe("update", () => {
    it("应该成功更新风格档案", async () => {
      const dto = {
        name: "周末休闲",
        description: "轻松舒适的周末穿搭",
      };

      mockPrismaService.styleProfile.findFirst.mockResolvedValue(mockProfile);
      mockPrismaService.styleProfile.update.mockResolvedValue({
        ...mockProfile,
        ...dto,
      });

      const result = await service.update(userId, profileId, dto);

      expect(result.name).toBe("周末休闲");
      expect(mockPrismaService.styleProfile.update).toHaveBeenCalledWith({
        where: { id: profileId },
        data: dto,
      });
    });

    it("应该在更新 keywords 时使用行为数据增强", async () => {
      const dto = {
        keywords: ["运动", "活力"],
      };

      mockPrismaService.styleProfile.findFirst.mockResolvedValue(mockProfile);
      mockBehaviorTracker.getUserBehaviorProfile.mockResolvedValue(mockBehaviorProfile);
      mockPrismaService.styleProfile.update.mockResolvedValue({
        ...mockProfile,
        keywords: ["运动", "活力", "简约", "优雅"],
      });

      const result = await service.update(userId, profileId, dto);

      expect(mockBehaviorTracker.getUserBehaviorProfile).toHaveBeenCalledWith(userId);
      expect(mockPrismaService.styleProfile.update).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("应该成功删除风格档案", async () => {
      mockPrismaService.styleProfile.findFirst.mockResolvedValue(mockProfile);
      mockPrismaService.styleProfile.delete.mockResolvedValue(mockProfile);

      const result = await service.remove(userId, profileId);

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.styleProfile.delete).toHaveBeenCalledWith({
        where: { id: profileId },
      });
    });

    it("应该在删除不存在的档案时抛出 NotFoundException", async () => {
      mockPrismaService.styleProfile.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, "non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("setDefault", () => {
    it("应该将指定档案设为默认并清除其他默认", async () => {
      mockPrismaService.styleProfile.findFirst.mockResolvedValue(mockProfile);
      mockPrismaService.styleProfile.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.styleProfile.update.mockResolvedValue({
        ...mockProfile,
        isDefault: true,
      });

      const result = await service.setDefault(userId, profileId);

      expect(mockPrismaService.styleProfile.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(mockPrismaService.styleProfile.update).toHaveBeenCalledWith({
        where: { id: profileId },
        data: { isDefault: true },
      });
      expect(result.isDefault).toBe(true);
    });

    it("应该在设置默认时档案不存在抛出 NotFoundException", async () => {
      mockPrismaService.styleProfile.findFirst.mockResolvedValue(null);

      await expect(service.setDefault(userId, "non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

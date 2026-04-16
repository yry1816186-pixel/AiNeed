/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  Gender,
} from "../../../../../types/prisma-enums";

import { PrismaService } from "../../../common/prisma/prisma.service";

import { ProfileService } from "./profile.service";
import { ProfileEventEmitter } from "./services/profile-event-emitter.service";




describe("ProfileService", () => {
  let service: ProfileService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockProfileEventEmitter = {
    emitProfileUpdated: jest.fn().mockResolvedValue(undefined),
    emitQuizResultSaved: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    phone: "13800138000",
    nickname: "Test User",
    avatar: "https://example.com/avatar.jpg",
    gender: Gender.female,
    birthDate: new Date("1990-01-01"),
    createdAt: new Date(),
    profile: {
      bodyType: BodyType.hourglass,
      skinTone: SkinTone.medium,
      faceShape: FaceShape.oval,
      colorSeason: ColorSeason.summer_cool,
      height: 165,
      weight: 55,
      shoulder: 38,
      bust: 86,
      waist: 68,
      hip: 90,
      inseam: 75,
      stylePreferences: { casual: true, formal: true },
      colorPreferences: { blue: true, white: true },
    },
  };

  const mockProfile = {
    userId: "test-user-id",
    bodyType: BodyType.hourglass,
    skinTone: SkinTone.medium,
    faceShape: FaceShape.oval,
    colorSeason: ColorSeason.summer_cool,
    height: 165,
    weight: 55,
    shoulder: 38,
    bust: 86,
    waist: 68,
    hip: 90,
    inseam: 75,
    stylePreferences: { casual: true, formal: true },
    colorPreferences: { blue: true, white: true },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProfileEventEmitter,
          useValue: mockProfileEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("应该成功返回用户档案", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile("test-user-id");

      expect(result.id).toBe("test-user-id");
      expect(result.email).toBe("test@example.com");
      expect(result.profile).toBeDefined();
      expect(result.profile?.bodyType).toBe(BodyType.hourglass);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
        include: { profile: true },
      });
    });

    it("应该返回没有 profile 的用户信息", async () => {
      const userWithoutProfile = { ...mockUser, profile: null };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutProfile);

      const result = await service.getProfile("test-user-id");

      expect(result.id).toBe("test-user-id");
      expect(result.profile).toBeNull();
    });

    it("应该抛出 NotFoundException 当用户不存在时", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateProfile", () => {
    const updateDto = {
      nickname: "Updated Name",
      height: 168,
      weight: 56,
    };

    it("应该成功更新用户基本信息和形象档案", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        nickname: "Updated Name",
      });
      mockPrismaService.userProfile.upsert.mockResolvedValue({
        ...mockProfile,
        height: 168,
        weight: 56,
      });
      // 重新 mock getProfile 的返回
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        nickname: "Updated Name",
        profile: { ...mockProfile, height: 168, weight: 56 },
      });

      const result = await service.updateProfile("test-user-id", updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.userProfile.upsert).toHaveBeenCalled();
    });

    it("应该只更新用户信息（没有形象档案更新）", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        nickname: "Updated Name",
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        nickname: "Updated Name",
        profile: mockProfile,
      });

      const result = await service.updateProfile("test-user-id", {
        nickname: "Updated Name",
      });

      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it("应该抛出 NotFoundException 当用户不存在时", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile("non-existent-id", updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getBodyAnalysis", () => {
    it("应该返回体型分析结果", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getBodyAnalysis("test-user-id");

      expect(result.bodyType).toBe(BodyType.hourglass);
      expect(result.bodyTypeName).toBe("X型（沙漏）体型");
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.idealStyles).toContain("收腰设计");
    });

    it("应该返回矩形体型分析", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        bodyType: BodyType.rectangle,
      });

      const result = await service.getBodyAnalysis("test-user-id");

      expect(result.bodyType).toBe(BodyType.rectangle);
      expect(result.bodyTypeName).toBe("H型（矩形）体型");
    });

    it("应该返回梨形体型分析", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        bodyType: BodyType.triangle,
      });

      const result = await service.getBodyAnalysis("test-user-id");

      expect(result.bodyType).toBe(BodyType.triangle);
      expect(result.bodyTypeName).toBe("A型（梨形）体型");
    });

    it("应该返回空结果当没有 profile 时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.getBodyAnalysis("test-user-id");

      expect(result.bodyType).toBeNull();
      expect(result.bodyTypeName).toBe("");
      expect(result.description).toBe("请先上传照片或手动设置体型信息");
    });

    it("应该返回空结果当没有 bodyType 时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        bodyType: null,
      });

      const result = await service.getBodyAnalysis("test-user-id");

      expect(result.bodyType).toBeNull();
    });
  });

  describe("getColorAnalysis", () => {
    it("应该返回色彩分析结果", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getColorAnalysis("test-user-id");

      expect(result.colorSeason).toBe(ColorSeason.summer_cool);
      expect(result.colorSeasonName).toBe("冷夏型");
      expect(result.bestColors).toBeInstanceOf(Array);
      expect(result.neutralColors).toBeInstanceOf(Array);
      expect(result.avoidColors).toBeInstanceOf(Array);
    });

    it("应该返回暖春型分析", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        colorSeason: ColorSeason.spring_warm,
      });

      const result = await service.getColorAnalysis("test-user-id");

      expect(result.colorSeason).toBe(ColorSeason.spring_warm);
      expect(result.colorSeasonName).toBe("暖春型");
    });

    it("应该返回暖秋型分析", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        colorSeason: ColorSeason.autumn_warm,
      });

      const result = await service.getColorAnalysis("test-user-id");

      expect(result.colorSeason).toBe(ColorSeason.autumn_warm);
      expect(result.colorSeasonName).toBe("暖秋型");
    });

    it("应该返回冷冬型分析", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        colorSeason: ColorSeason.winter_cool,
      });

      const result = await service.getColorAnalysis("test-user-id");

      expect(result.colorSeason).toBe(ColorSeason.winter_cool);
      expect(result.colorSeasonName).toBe("冷冬型");
    });

    it("应该返回空结果当没有 profile 时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.getColorAnalysis("test-user-id");

      expect(result.colorSeason).toBeNull();
      expect(result.bestColors).toEqual([]);
    });
  });

  describe("getStyleRecommendations", () => {
    it("应该返回风格推荐", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getStyleRecommendations("test-user-id");

      expect(result.styles).toBeInstanceOf(Array);
      expect(result.occasions).toBeInstanceOf(Array);
      expect(result.tips).toBeInstanceOf(Array);
    });

    it("应该返回默认推荐当没有 profile 时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.getStyleRecommendations("test-user-id");

      expect(result.styles).toEqual([]);
      expect(result.occasions).toBeInstanceOf(Array);
      expect(result.tips).toContain("请先完善您的形象档案以获取个性化推荐");
    });
  });

  describe("calculateBodyMetrics", () => {
    it("应该计算 BMI、腰臀比和胸腰比", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.calculateBodyMetrics("test-user-id");

      expect(result).not.toBeNull();
      expect(result?.metrics).toBeInstanceOf(Array);
      expect(result?.metrics.length).toBe(3);
      expect(result?.hasEnoughData).toBe(true);

      const bmiMetric = result?.metrics.find((m) => m.name === "BMI指数");
      expect(bmiMetric?.value).toBeCloseTo(20.2, 0);
      expect(bmiMetric?.status).toBe("正常");

      const whrMetric = result?.metrics.find((m) => m.name === "腰臀比");
      expect(whrMetric?.value).toBeCloseTo(0.76, 1);
      expect(whrMetric?.status).toBe("理想");
    });

    it("应该返回 null 当没有 profile 时", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.calculateBodyMetrics("test-user-id");

      expect(result).toBeNull();
    });

    it("应该返回部分指标当数据不完整时", async () => {
      const incompleteProfile = {
        ...mockProfile,
        height: 165,
        weight: 55,
        waist: null,
        hip: null,
        bust: null,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(
        incompleteProfile,
      );

      const result = await service.calculateBodyMetrics("test-user-id");
      const firstMetric = result?.metrics[0];

      expect(result?.metrics.length).toBe(1);
      expect(firstMetric?.name).toBe("BMI指数");
    });

    it("应该正确计算偏瘦 BMI", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        height: 170,
        weight: 50,
      });

      const result = await service.calculateBodyMetrics("test-user-id");

      const bmiMetric = result?.metrics.find((m) => m.name === "BMI指数");
      expect(bmiMetric?.status).toBe("偏瘦");
    });

    it("应该正确计算偏胖 BMI", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        height: 160,
        weight: 65,
      });

      const result = await service.calculateBodyMetrics("test-user-id");

      const bmiMetric = result?.metrics.find((m) => m.name === "BMI指数");
      expect(bmiMetric?.status).toBe("偏胖");
    });
  });
});

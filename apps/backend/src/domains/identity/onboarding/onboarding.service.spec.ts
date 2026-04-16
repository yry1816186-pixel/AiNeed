import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { OnboardingStep, Gender } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { OnboardingService } from "./onboarding.service";

describe("OnboardingService", () => {
  let service: OnboardingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockProfile = {
    id: "profile-id",
    userId: "test-user-id",
    onboardingStep: OnboardingStep.BASIC_INFO,
    onboardingCompletedAt: null,
    skippedOnboardingSteps: [],
    height: null,
    weight: null,
    bodyType: null,
    skinTone: null,
    faceShape: null,
    colorSeason: null,
    stylePreferences: null,
    colorPreferences: null,
    priceRangeMin: null,
    priceRangeMax: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    gender: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOnboardingState", () => {
    it("应该返回 BASIC_INFO 状态和空 completedSteps", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
      });

      const result = await service.getOnboardingState("test-user-id");

      expect(result.currentStep).toBe(OnboardingStep.BASIC_INFO);
      expect(result.completedSteps).toEqual([]);
    });

    it("应该返回 PHOTO 状态和 BASIC_INFO 在 completedSteps", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
      });

      const result = await service.getOnboardingState("test-user-id");

      expect(result.currentStep).toBe(OnboardingStep.PHOTO);
      expect(result.completedSteps).toEqual([OnboardingStep.BASIC_INFO]);
    });

    it("应该返回 STYLE_TEST 状态和 BASIC_INFO, PHOTO 在 completedSteps", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
      });

      const result = await service.getOnboardingState("test-user-id");

      expect(result.currentStep).toBe(OnboardingStep.STYLE_TEST);
      expect(result.completedSteps).toEqual([
        OnboardingStep.BASIC_INFO,
        OnboardingStep.PHOTO,
      ]);
    });

    it("应该返回 COMPLETED 状态和所有步骤在 completedSteps", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.COMPLETED,
      });

      const result = await service.getOnboardingState("test-user-id");

      expect(result.currentStep).toBe(OnboardingStep.COMPLETED);
      expect(result.completedSteps).toEqual([
        OnboardingStep.BASIC_INFO,
        OnboardingStep.PHOTO,
        OnboardingStep.STYLE_TEST,
      ]);
    });

    it("应该抛出 NotFoundException 当 profile 不存在", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getOnboardingState("non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("completeBasicInfo", () => {
    const dto = {
      gender: "male",
      ageRange: "25_34",
      height: 175,
      weight: 70,
    };

    it("应该成功完成基本信息并推进到 PHOTO", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        gender: Gender.male,
      });
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
        height: 175,
        weight: 70,
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
      });

      const result = await service.completeBasicInfo("test-user-id", dto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
        data: { gender: Gender.male },
      });
      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
        data: {
          height: 175,
          weight: 70,
          onboardingStep: OnboardingStep.PHOTO,
        },
      });
      expect(result.currentStep).toBe(OnboardingStep.PHOTO);
    });

    it("应该成功完成基本信息（不含 height 和 weight）", async () => {
      const minimalDto = { gender: "female", ageRange: "18_24" };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        gender: Gender.female,
      });
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
      });

      const result = await service.completeBasicInfo("test-user-id", minimalDto);

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
        data: {
          height: undefined,
          weight: undefined,
          onboardingStep: OnboardingStep.PHOTO,
        },
      });
      expect(result.currentStep).toBe(OnboardingStep.PHOTO);
    });

    it("应该抛出 NotFoundException 当用户不存在", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);

      await expect(
        service.completeBasicInfo("non-existent-id", dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该抛出 NotFoundException 当 profile 不存在", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.completeBasicInfo("test-user-id", dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该抛出 BadRequestException 当当前步骤不是 BASIC_INFO", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
      });

      await expect(
        service.completeBasicInfo("test-user-id", dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该抛出 BadRequestException 当当前步骤是 COMPLETED", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.COMPLETED,
      });

      await expect(
        service.completeBasicInfo("test-user-id", dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("skipStep", () => {
    it("应该成功跳过 PHOTO 步骤并推进到 STYLE_TEST", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
        skippedOnboardingSteps: [],
      });
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: ["PHOTO"],
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: ["PHOTO"],
      });

      const result = await service.skipStep("test-user-id", "PHOTO");

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
        data: {
          onboardingStep: OnboardingStep.STYLE_TEST,
          onboardingCompletedAt: null,
          skippedOnboardingSteps: ["PHOTO"],
        },
      });
      expect(result.currentStep).toBe(OnboardingStep.STYLE_TEST);
    });

    it("应该成功跳过 STYLE_TEST 步骤并推进到 COMPLETED", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: ["PHOTO"],
      });
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.COMPLETED,
        skippedOnboardingSteps: ["PHOTO", "STYLE_TEST"],
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.COMPLETED,
        skippedOnboardingSteps: ["PHOTO", "STYLE_TEST"],
      });

      const result = await service.skipStep("test-user-id", "STYLE_TEST");

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith({
        where: { userId: "test-user-id" },
        data: {
          onboardingStep: OnboardingStep.COMPLETED,
          onboardingCompletedAt: null,
          skippedOnboardingSteps: ["PHOTO", "STYLE_TEST"],
        },
      });
      expect(result.currentStep).toBe(OnboardingStep.COMPLETED);
    });

    it("应该抛出 BadRequestException 当尝试跳过 BASIC_INFO", async () => {
      await expect(
        service.skipStep("test-user-id", "BASIC_INFO"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该抛出 BadRequestException 当尝试跳过无效步骤", async () => {
      await expect(
        service.skipStep("test-user-id", "INVALID_STEP"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该抛出 NotFoundException 当 profile 不存在", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.skipStep("test-user-id", "PHOTO"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该抛出 BadRequestException 当当前步骤不匹配", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
      });

      await expect(
        service.skipStep("test-user-id", "PHOTO"),
      ).rejects.toThrow(BadRequestException);
    });

    it("应该抛出 BadRequestException 当尝试跳过 STYLE_TEST 但当前是 PHOTO", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
      });

      await expect(
        service.skipStep("test-user-id", "STYLE_TEST"),
      ).rejects.toThrow(BadRequestException);
    });

    it("不应该重复添加已跳过的步骤", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
        skippedOnboardingSteps: ["PHOTO"],
      });
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: ["PHOTO"],
      });
      mockPrismaService.userProfile.findUnique.mockResolvedValueOnce({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: ["PHOTO"],
      });

      await service.skipStep("test-user-id", "PHOTO");

      expect(mockPrismaService.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            skippedOnboardingSteps: ["PHOTO"],
          }),
        }),
      );
    });
  });

  describe("getOnboardingProgress", () => {
    it("应该返回 BASIC_INFO 步骤的进度（0%）", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.BASIC_INFO,
        skippedOnboardingSteps: [],
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.percentage).toBe(0);
      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "current" },
        { step: OnboardingStep.PHOTO, status: "pending" },
        { step: OnboardingStep.STYLE_TEST, status: "pending" },
      ]);
    });

    it("应该返回 PHOTO 步骤的进度（33%）", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
        skippedOnboardingSteps: [],
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.percentage).toBe(33);
      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "completed" },
        { step: OnboardingStep.PHOTO, status: "current" },
        { step: OnboardingStep.STYLE_TEST, status: "pending" },
      ]);
    });

    it("应该返回 STYLE_TEST 步骤的进度（66%）", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: [],
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.percentage).toBe(66);
      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "completed" },
        { step: OnboardingStep.PHOTO, status: "completed" },
        { step: OnboardingStep.STYLE_TEST, status: "current" },
      ]);
    });

    it("应该返回 COMPLETED 步骤的进度（100%）", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.COMPLETED,
        onboardingCompletedAt: new Date(),
        skippedOnboardingSteps: [],
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.percentage).toBe(100);
      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "completed" },
        { step: OnboardingStep.PHOTO, status: "completed" },
        { step: OnboardingStep.STYLE_TEST, status: "completed" },
      ]);
    });

    it("应该正确标记被跳过的步骤", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.STYLE_TEST,
        skippedOnboardingSteps: ["PHOTO"],
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.percentage).toBe(66);
      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "completed" },
        { step: OnboardingStep.PHOTO, status: "skipped" },
        { step: OnboardingStep.STYLE_TEST, status: "current" },
      ]);
    });

    it("应该正确标记多个被跳过的步骤", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.COMPLETED,
        onboardingCompletedAt: null,
        skippedOnboardingSteps: ["PHOTO", "STYLE_TEST"],
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.percentage).toBe(100);
      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "completed" },
        { step: OnboardingStep.PHOTO, status: "skipped" },
        { step: OnboardingStep.STYLE_TEST, status: "skipped" },
      ]);
    });

    it("应该抛出 NotFoundException 当 profile 不存在", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getOnboardingProgress("non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("应该处理 skippedOnboardingSteps 为 null 的情况", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        ...mockProfile,
        onboardingStep: OnboardingStep.PHOTO,
        skippedOnboardingSteps: null,
      });

      const result = await service.getOnboardingProgress("test-user-id");

      expect(result.steps).toEqual([
        { step: OnboardingStep.BASIC_INFO, status: "completed" },
        { step: OnboardingStep.PHOTO, status: "current" },
        { step: OnboardingStep.STYLE_TEST, status: "pending" },
      ]);
    });
  });
});

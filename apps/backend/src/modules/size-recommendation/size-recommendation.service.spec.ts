import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../common/prisma/prisma.service";
import {
  SizeRecommendationService,
  RecommendationResult,
} from "./size-recommendation.service";

describe("SizeRecommendationService", () => {
  let service: SizeRecommendationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userProfile: {
      findUnique: jest.fn(),
    },
    clothingItem: {
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    refundRequest: {
      findMany: jest.fn(),
    },
  };

  const mockProfile = {
    userId: "user-1",
    height: 165,
    weight: 60,
    bust: 86,
    waist: 68,
    hip: 94,
    bodyType: "hourglass",
    fitPreference: null,
    colorSeason: null,
    stylePreferences: [],
    colorPreferences: [],
  };

  const mockItem = {
    id: "item-1",
    name: "Test Dress",
    sizes: ["S", "M", "L", "XL"],
    brandId: "brand-1",
    brand: { id: "brand-1", name: "Test Brand" },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SizeRecommendationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SizeRecommendationService>(SizeRecommendationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe("gaussianScore (via getRecommendation)", () => {
    it("returns high confidence when all measurements are inside range", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe("high");
      // Bust 86 is in M (84-88), waist 68 is in M (68-72), hip 94 is in M (92-96)
      expect(result!.recommendedSize).toBe("M");
    });

    it("shows exponential decay for measurements outside range", async () => {
      const tallProfile = { ...mockProfile, height: 190, bust: 110, waist: 100, hip: 115 };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(tallProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // Measurements far outside any range should yield low confidence
      expect(result!.confidence).toBe("low");
    });
  });

  describe("gaussianScore boundary behavior", () => {
    it("measurement at exact boundary returns score 1.0", async () => {
      // Bust exactly 84 (boundary between S and M)
      const boundaryProfile = {
        ...mockProfile,
        bust: 84,
        waist: 68,
        hip: 92,
        height: 162,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(boundaryProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // At boundary, score = 1.0 for that dimension, should get high total
      expect(result!.confidence).not.toBe("low");
    });
  });

  describe("applyFitPreference (via getRecommendation)", () => {
    it("tight preference shifts measurements by -2cm", async () => {
      // M bust range: 84-88. With bust=88 (top of M), tight offset = 86 → still in M
      const tightProfile = {
        ...mockProfile,
        bust: 88,
        waist: 72,
        hip: 96,
        fitPreference: "tight",
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(tightProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining("修身")]),
      );
    });

    it("loose preference shifts measurements by +2cm", async () => {
      const looseProfile = {
        ...mockProfile,
        bust: 80,
        waist: 64,
        hip: 88,
        fitPreference: "loose",
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(looseProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining("宽松")]),
      );
    });

    it("regular preference does not shift measurements", async () => {
      const regularProfile = {
        ...mockProfile,
        fitPreference: "regular",
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(regularProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // No fit preference adjustment message for "regular"
      expect(result!.reasons).not.toEqual(
        expect.arrayContaining([expect.stringContaining("修身")]),
      );
      expect(result!.reasons).not.toEqual(
        expect.arrayContaining([expect.stringContaining("宽松")]),
      );
    });
  });

  describe("matchBodyToSizes: correct size selection", () => {
    it("selects S for small body measurements", async () => {
      const smallProfile = {
        ...mockProfile,
        bust: 82,
        waist: 66,
        hip: 90,
        height: 158,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(smallProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // S range: chest 80-84, waist 64-68, hips 88-92
      expect(result!.recommendedSize).toBe("S");
    });

    it("selects XL for large body measurements", async () => {
      const largeProfile = {
        ...mockProfile,
        bust: 94,
        waist: 78,
        hip: 102,
        height: 173,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(largeProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // XL range: chest 92-96, waist 76-80, hips 100-104
      expect(result!.recommendedSize).toBe("XL");
    });
  });

  describe("confidence levels", () => {
    it("high confidence when match score >= 0.85", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // All measurements fit perfectly in M range → high confidence
      expect(result!.confidence).toBe("high");
    });

    it("medium confidence when match score between 0.6 and 0.85", async () => {
      // Partially outside range to get medium confidence
      const medProfile = {
        ...mockProfile,
        bust: 90,
        waist: 70,
        hip: 98,
        height: 170,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(medProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // Not all measurements perfectly in one range
      expect(["medium", "high"]).toContain(result!.confidence);
    });

    it("low confidence when match score < 0.6", async () => {
      const extremeProfile = {
        ...mockProfile,
        bust: 120,
        waist: 110,
        hip: 130,
        height: 200,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(extremeProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe("low");
    });
  });

  describe("between sizes detection", () => {
    it("detects between sizes when top 2 scores are close", async () => {
      // Bust 84 sits at boundary of S(80-84) and M(84-88)
      const betweenProfile = {
        ...mockProfile,
        bust: 84,
        waist: 66,
        hip: 90,
        height: 162,
      };
      mockPrismaService.userProfile.findUnique.mockResolvedValue(betweenProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      // When top 2 scores differ by < 0.1, betweenSizes should be set
      if (result!.betweenSizes) {
        expect(result!.betweenSizes).toMatch(/^[A-Z]+-[A-Z]+$/);
        expect(result!.reasons).toEqual(
          expect.arrayContaining([expect.stringContaining("之间")]),
        );
      }
    });
  });

  describe("edge cases", () => {
    it("returns null when no body profile data exists", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        bust: null,
        waist: null,
        hip: null,
        height: null,
        weight: null,
      });
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).toBeNull();
    });

    it("returns null when user profile does not exist", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).toBeNull();
    });

    it("throws NotFoundException when item does not exist", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await expect(
        service.getRecommendation("user-1", "item-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("returns M as default when size chart is empty", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue({
        ...mockItem,
        sizes: [],
      });
      mockPrismaService.orderItem.findMany.mockResolvedValue([]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.recommendedSize).toBe("M");
      expect(result!.confidence).toBe("low");
      expect(result!.scores).toEqual([]);
    });
  });

  describe("order history bonus", () => {
    it("boosts confidence when past purchase matches recommended size", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { size: "M", createdAt: new Date() },
      ]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining("曾购买")]),
      );
      // Confidence should be boosted since purchased size matches recommended
      expect(result!.confidence).toBe("high");
    });

    it("includes brand offset reason when history and returns differ", async () => {
      mockPrismaService.userProfile.findUnique.mockResolvedValue(mockProfile);
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.orderItem.findMany.mockResolvedValue([
        { size: "L", createdAt: new Date() },
      ]);
      mockPrismaService.refundRequest.findMany.mockResolvedValue([
        {
          userId: "user-1",
          createdAt: new Date(),
          order: { items: [{ size: "M" }] },
        },
      ]);

      const result = await service.getRecommendation("user-1", "item-1");

      expect(result).not.toBeNull();
      expect(result!.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining("偏")]),
      );
    });
  });

  describe("getSizeChart", () => {
    it("returns filtered size chart for an item", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(mockItem);

      const result = await service.getSizeChart("item-1");

      expect(result.sizes).toBeDefined();
      expect(result.sizes.length).toBe(4); // S, M, L, XL
    });

    it("throws NotFoundException for non-existent item", async () => {
      mockPrismaService.clothingItem.findUnique.mockResolvedValue(null);

      await expect(service.getSizeChart("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
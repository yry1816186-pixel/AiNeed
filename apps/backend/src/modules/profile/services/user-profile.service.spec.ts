import { Test, TestingModule } from "@nestjs/testing";

import { UserProfileService, UserBodyProfile, UpdateProfileDto } from "./user-profile.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { BodyImageAnalysisService } from "../../../domains/ai-core/photos/services/body-image-analysis.service";
import { SASRecService } from "../../recommendations/services/sasrec.service";
import { BehaviorTrackerService } from "../../analytics/services/behavior-tracker.service";

describe("UserProfileService", () => {
  let service: UserProfileService;
  let prisma: {
    userProfile: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    clothingItem: {
      findMany: jest.Mock;
    };
  };

  const mockProfile = {
    userId: "user-1",
    bodyType: "hourglass",
    shoulder: 40,
    bust: 36,
    waist: 28,
    hip: 38,
    height: 165,
    stylePreferences: ["casual", "elegant"],
    colorPreferences: ["black", "white"],
    priceRangeMin: 100,
    priceRangeMax: 500,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      userProfile: {
        findUnique: jest.fn().mockResolvedValue(mockProfile),
        upsert: jest.fn().mockResolvedValue(mockProfile),
        update: jest.fn().mockResolvedValue(mockProfile),
      },
      clothingItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BodyImageAnalysisService,
          useValue: {
            analyzeBodyImage: jest.fn().mockResolvedValue({
              bodyType: "hourglass",
              measurements: { shoulderWidth: 40, bustWidth: 36, waistWidth: 28, hipWidth: 38, heightEstimate: 165 },
              proportions: { shoulderToHip: 1.05, waistToHip: 0.74, waistToShoulder: 0.7 },
            }),
          },
        },
        {
          provide: SASRecService,
          useValue: { getSequenceRecommendations: jest.fn().mockResolvedValue({ recommendations: [] }) },
        },
        {
          provide: BehaviorTrackerService,
          useValue: { getBehaviorStats: jest.fn().mockResolvedValue({ totalViews: 0, totalLikes: 0, totalPurchases: 0, preferredCategories: [], preferredBrands: [] }) },
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getBodyProfile", () => {
    it("should return body profile for existing user", async () => {
      const result = await service.getBodyProfile("user-1");

      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-1");
      expect(result!.bodyType).toBe("hourglass");
    });

    it("should return null for non-existent profile", async () => {
      prisma.userProfile.findUnique.mockResolvedValueOnce(null);

      const result = await service.getBodyProfile("non-existent");

      expect(result).toBeNull();
    });

    it("should calculate proportions from measurements", async () => {
      const result = await service.getBodyProfile("user-1");

      expect(result!.proportions.shoulderToHip).toBeCloseTo(40 / 38, 2);
      expect(result!.proportions.waistToHip).toBeCloseTo(28 / 38, 2);
    });
  });

  describe("analyzeAndSaveBodyProfile", () => {
    it("should analyze image and save body profile", async () => {
      const imageBuffer = Buffer.from("fake-image");

      const result = await service.analyzeAndSaveBodyProfile("user-1", imageBuffer);

      expect(result.userId).toBe("user-1");
      expect(result.bodyType).toBe("hourglass");
      expect(prisma.userProfile.upsert).toHaveBeenCalled();
    });
  });

  describe("getPersonalizedRecommendations", () => {
    it("should return empty recommendations when no sequence recs", async () => {
      const result = await service.getPersonalizedRecommendations("user-1");

      expect(result).toEqual([]);
    });
  });
});

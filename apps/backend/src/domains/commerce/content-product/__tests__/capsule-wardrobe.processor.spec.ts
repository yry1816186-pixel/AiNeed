import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { PaymentService } from "../../payment/payment.service";
import { CapsuleWardrobeProcessor } from "../capsule-wardrobe.processor";
import { ContentProductService } from "../content-product.service";

// Mock factory for BullMQ Job
function createMockJob(data: { userId: string }, attemptsMade = 0): Job<{ userId: string }> {
  const job: Partial<Job<{ userId: string }>> = {
    data,
    id: "job-123",
    attemptsMade,
    updateProgress: jest.fn(),
    log: jest.fn(),
  };
  return job as Job<{ userId: string }>;
}

// Mock axios at module level -- factory creates jest.fn() inline
jest.mock("axios", () => {
  const post = jest.fn();
  return {
    __esModule: true,
    post,
    default: {
      post,
    },
  };
});

// Import after mock
import axios from "axios";

const mockedAxiosPost = (axios as unknown as { post: jest.Mock }).post;

describe("CapsuleWardrobeProcessor", () => {
  let processor: CapsuleWardrobeProcessor;
  let prismaService: {
    favorite: {
      findMany: jest.Mock;
    };
    contentPurchase: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const savedItems = [
    {
      id: "fav-1",
      userId: "user-1",
      section: "saved_outfit",
      item: {
        id: "item-1",
        category: "tops",
        colors: ["white"],
        tags: ["casual"],
        name: "White T-Shirt",
        mainImage: "img1.jpg",
      },
    },
    {
      id: "fav-2",
      userId: "user-1",
      section: "saved_outfit",
      item: {
        id: "item-2",
        category: "bottoms",
        colors: ["blue"],
        tags: ["denim"],
        name: "Blue Jeans",
        mainImage: "img2.jpg",
      },
    },
  ];

  const wishlistedItems = [
    {
      id: "fav-3",
      userId: "user-1",
      section: "wishlisted",
      item: {
        id: "item-3",
        category: "outerwear",
        colors: ["black"],
        tags: ["formal"],
        name: "Black Blazer",
        mainImage: "img3.jpg",
      },
    },
  ];

  const aiRecommendations = [
    {
      category: "shoes",
      color: "brown",
      style: "casual",
      name: "Brown Loafers",
      imageUrl: "rec1.jpg",
      reason: "Complements your existing tops and bottoms",
    },
    {
      category: "accessories",
      color: "gold",
      style: "minimal",
      name: "Gold Necklace",
      imageUrl: "rec2.jpg",
      reason: "Adds elegance to casual outfits",
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaService = {
      favorite: {
        findMany: jest.fn(),
      },
      contentPurchase: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const configService = {
      get: jest.fn().mockReturnValue("http://localhost:8000"),
    };

    const module = await Test.createTestingModule({
      providers: [
        CapsuleWardrobeProcessor,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    processor = module.get<CapsuleWardrobeProcessor>(CapsuleWardrobeProcessor);
  });

  describe("handleGeneration - reading user items from Prisma", () => {
    it("should call favorite.findMany twice: once for saved_outfit and once for wishlisted", async () => {
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockResolvedValueOnce({
        data: { recommendations: aiRecommendations, outfitCombinations: [] },
      });

      const job = createMockJob({ userId: "user-1" });
      await processor.handleGeneration(job);

      expect(prismaService.favorite.findMany).toHaveBeenCalledTimes(2);
      expect(prismaService.favorite.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", section: "saved_outfit" },
        include: { item: true },
      });
      expect(prismaService.favorite.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", section: "wishlisted" },
        include: { item: true },
      });
    });
  });

  describe("handleGeneration - existingCount calculation", () => {
    it("should calculate existingCount as savedItems + wishlistedItems, needed as max(0, 30 - existingCount)", async () => {
      // 2 saved + 1 wishlisted = 3 existing, needed = 27
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockResolvedValueOnce({
        data: { recommendations: aiRecommendations, outfitCombinations: [] },
      });

      const job = createMockJob({ userId: "user-1" });
      await processor.handleGeneration(job);

      // Verify the HTTP call includes the neededCount
      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            neededCount: 27, // 30 - 3 = 27
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe("handleGeneration - calls DialogEngine POST /dialog/generate", () => {
    it("should call POST /dialog/generate with userId, existingItems, neededCount, preferences", async () => {
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockResolvedValueOnce({
        data: { recommendations: aiRecommendations, outfitCombinations: [] },
      });

      const job = createMockJob({ userId: "user-1" });
      await processor.handleGeneration(job);

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        expect.stringContaining("dialog/generate"),
        expect.objectContaining({
          userId: "user-1",
          prompt: expect.stringContaining("capsule wardrobe"),
          context: expect.objectContaining({
            existingItems: expect.arrayContaining([
              expect.objectContaining({ category: "tops" }),
              expect.objectContaining({ category: "bottoms" }),
              expect.objectContaining({ category: "outerwear" }),
            ]),
            neededCount: expect.any(Number),
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe("handleGeneration - merges existing + AI into 30-piece plan", () => {
    it("should produce a capsulePlan with totalItems, existingItems, recommendedItems, outfitCombinations, reuseStats", async () => {
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockResolvedValueOnce({
        data: {
          recommendations: aiRecommendations,
          outfitCombinations: [{ occasion: "work", items: ["item-1", "item-2", "item-3"] }],
        },
      });

      const job = createMockJob({ userId: "user-1" });
      await processor.handleGeneration(job);

      const updateCall = prismaService.contentPurchase.update.mock.calls[0][0];
      const capsulePlan = updateCall.data.metadata.capsulePlan;

      expect(capsulePlan.totalItems).toBe(30);
      expect(capsulePlan.existingItems).toHaveLength(3);
      expect(capsulePlan.recommendedItems).toEqual(aiRecommendations);
      expect(capsulePlan.outfitCombinations).toHaveLength(1);
      expect(capsulePlan.reuseStats).toBeDefined();
      expect(capsulePlan.generatedAt).toBeDefined();
    });
  });

  describe("handleGeneration - stores result in ContentPurchase.metadata.capsulePlan", () => {
    it("should call contentPurchase.update with metadata containing capsulePlan and generatedAt", async () => {
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockResolvedValueOnce({
        data: { recommendations: aiRecommendations, outfitCombinations: [] },
      });

      const job = createMockJob({ userId: "user-1" });
      await processor.handleGeneration(job);

      expect(prismaService.contentPurchase.update).toHaveBeenCalledWith({
        where: {
          userId_productType: { userId: "user-1", productType: "capsule_wardrobe" },
        },
        data: {
          metadata: {
            capsulePlan: expect.objectContaining({
              totalItems: 30,
              existingItems: expect.any(Array),
              recommendedItems: expect.any(Array),
              generatedAt: expect.any(String),
            }),
          },
        },
      });
    });
  });

  describe("handleGeneration - retry behavior on AI service failure", () => {
    it("should throw on AI service failure, allowing BullMQ to retry (3 attempts configured)", async () => {
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      mockedAxiosPost.mockRejectedValueOnce(new Error("AI service unavailable"));

      const job = createMockJob({ userId: "user-1" });

      await expect(processor.handleGeneration(job)).rejects.toThrow("AI service unavailable");
    });

    it("should succeed on retry after initial failure", async () => {
      // First attempt: fails
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      mockedAxiosPost.mockRejectedValueOnce(new Error("AI service unavailable"));

      const job = createMockJob({ userId: "user-1" });
      await expect(processor.handleGeneration(job)).rejects.toThrow("AI service unavailable");

      // Second attempt: succeeds
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockResolvedValueOnce({
        data: { recommendations: aiRecommendations, outfitCombinations: [] },
      });

      const result = await processor.handleGeneration(job);
      expect(result).toBeDefined();
      expect(result.totalItems).toBe(30);
    });
  });

  describe("handleGeneration - final failure after retries stores error", () => {
    it("should store error in metadata when all retries are exhausted (attemptsMade >= 2)", async () => {
      prismaService.favorite.findMany
        .mockResolvedValueOnce(savedItems)
        .mockResolvedValueOnce(wishlistedItems);

      prismaService.contentPurchase.update.mockResolvedValueOnce({});

      mockedAxiosPost.mockRejectedValueOnce(new Error("AI service permanently down"));

      // Simulate 3rd attempt (attemptsMade = 2 means this is the 3rd try)
      const job = createMockJob({ userId: "user-1" }, 2);

      // The processor should catch the error, store it, and not re-throw
      await processor.handleGeneration(job);

      expect(prismaService.contentPurchase.update).toHaveBeenCalledWith({
        where: {
          userId_productType: { userId: "user-1", productType: "capsule_wardrobe" },
        },
        data: {
          metadata: expect.objectContaining({
            error: "AI service permanently down",
            failedAt: expect.any(String),
          }),
        },
      });
    });
  });
});

// ==========================================
// getCapsuleWardrobeResult tests
// ==========================================

describe("getCapsuleWardrobeResult", () => {
  let service: ContentProductService;
  let prismaService: {
    contentPurchase: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };
  let paymentService: {
    createPayment: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      contentPurchase: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    paymentService = {
      createPayment: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ContentProductService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
        {
          provide: "BullQueue_capsule-wardrobe-generate",
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ContentProductService>(ContentProductService);
  });

  it('should return { status: "ready", capsulePlan } when metadata.capsulePlan exists', async () => {
    const capsulePlan = {
      totalItems: 30,
      existingItems: [],
      recommendedItems: [],
      generatedAt: new Date().toISOString(),
    };

    prismaService.contentPurchase.findUnique.mockResolvedValueOnce({
      id: "purchase-1",
      userId: "user-1",
      productType: "capsule_wardrobe",
      metadata: { capsulePlan },
    });

    const result = await service.getCapsuleWardrobeResult("user-1");

    expect(result.status).toBe("ready");
    expect(result.capsulePlan).toEqual(capsulePlan);
  });

  it('should return { status: "generating" } when purchase exists but no capsulePlan', async () => {
    prismaService.contentPurchase.findUnique.mockResolvedValueOnce({
      id: "purchase-1",
      userId: "user-1",
      productType: "capsule_wardrobe",
      metadata: null,
    });

    const result = await service.getCapsuleWardrobeResult("user-1");

    expect(result.status).toBe("generating");
  });

  it('should return { status: "not_purchased" } when no ContentPurchase record', async () => {
    prismaService.contentPurchase.findUnique.mockResolvedValueOnce(null);

    const result = await service.getCapsuleWardrobeResult("user-1");

    expect(result.status).toBe("not_purchased");
  });
});

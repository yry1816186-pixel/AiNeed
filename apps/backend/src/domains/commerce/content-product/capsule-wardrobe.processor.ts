import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";

import { PrismaService } from "../../../common/prisma/prisma.service";

const CAPSULE_WARDROBE_QUEUE = "capsule-wardrobe-generate";
const TARGET_ITEM_COUNT = 30;

interface CapsuleWardrobeJobData {
  userId: string;
}

interface ExistingItem {
  id: string;
  category: string;
  colors: string[];
  tags: string[];
  name: string;
  mainImage: string | null;
}

interface AiRecommendation {
  category: string;
  color: string;
  style: string;
  name: string;
  imageUrl: string;
  reason: string;
}

interface CapsulePlan {
  totalItems: number;
  existingItems: ExistingItem[];
  recommendedItems: AiRecommendation[];
  outfitCombinations: Array<{ occasion: string; items: string[] }>;
  reuseStats: {
    averageReusePerItem: number;
    mostVersatileItems: Array<{ id: string; name: string; reuseCount: number }>;
  };
  generatedAt: string;
}

@Injectable()
@Processor(CAPSULE_WARDROBE_QUEUE, {
  concurrency: 2,
})
export class CapsuleWardrobeProcessor extends WorkerHost {
  private readonly logger = new Logger(CapsuleWardrobeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async process(job: Job<CapsuleWardrobeJobData>): Promise<unknown> {
    return this.handleGeneration(job);
  }

  async handleGeneration(job: Job<CapsuleWardrobeJobData>): Promise<CapsulePlan> {
    const { userId } = job.data;

    this.logger.log(`Starting capsule wardrobe generation for user ${userId}`);

    try {
      // Step 1: Read user's saved wardrobe items
      const savedFavorites = await this.prisma.favorite.findMany({
        where: { userId, section: "saved_outfit" },
        include: { item: true },
      });

      // Step 2: Read user's wishlisted items
      const wishlistedFavorites = await this.prisma.favorite.findMany({
        where: { userId, section: "wishlisted" },
        include: { item: true },
      });

      // Step 3: Build existing items list
      const existingItems: ExistingItem[] = [
        ...savedFavorites.map((f) => ({
          id: f.item.id,
          category: f.item.category,
          colors: f.item.colors,
          tags: f.item.tags,
          name: f.item.name,
          mainImage: f.item.mainImage,
        })),
        ...wishlistedFavorites.map((f) => ({
          id: f.item.id,
          category: f.item.category,
          colors: f.item.colors,
          tags: f.item.tags,
          name: f.item.name,
          mainImage: f.item.mainImage,
        })),
      ];

      const existingCount = existingItems.length;
      const neededCount = Math.max(0, TARGET_ITEM_COUNT - existingCount);

      // Step 4: Build context for AI
      const existingItemContext = existingItems.map((item) => ({
        category: item.category,
        color: item.colors.join(", "),
        style: item.tags.join(", "),
      }));

      // Step 5: Call Python DialogEngine POST /dialog/generate
      const dialogEngineUrl = this.configService.get<string>(
        "DIALOG_ENGINE_URL",
        "http://localhost:8000"
      );

      const aiResponse = await this.callDialogEngine(dialogEngineUrl, {
        userId,
        prompt: "Generate capsule wardrobe supplement recommendations",
        context: {
          existingItems: existingItemContext,
          neededCount,
          preferences: {
            style: existingItemContext.map((i) => i.style).filter(Boolean),
          },
        },
      });

      const aiRecommendations: AiRecommendation[] = aiResponse.recommendations ?? [];
      const outfitCombinations = aiResponse.outfitCombinations ?? [];

      // Step 6: Build capsule plan
      const capsulePlan: CapsulePlan = {
        totalItems: TARGET_ITEM_COUNT,
        existingItems,
        recommendedItems: aiRecommendations,
        outfitCombinations,
        reuseStats: this.calculateReuseStats(existingItems, outfitCombinations),
        generatedAt: new Date().toISOString(),
      };

      // Step 7: Store result in ContentPurchase metadata
      await this.prisma.contentPurchase.update({
        where: {
          userId_productType: { userId, productType: "capsule_wardrobe" },
        },
        data: {
          metadata: { capsulePlan },
        },
      });

      this.logger.log(
        `Capsule wardrobe generated for user ${userId}: ${existingCount} existing + ${aiRecommendations.length} recommended`
      );

      return capsulePlan;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // If this is the final retry attempt, store error and don't re-throw
      if (job.attemptsMade >= 2) {
        this.logger.error(
          `Capsule wardrobe generation failed permanently for user ${userId}: ${errorMessage}`
        );

        await this.prisma.contentPurchase
          .update({
            where: {
              userId_productType: { userId, productType: "capsule_wardrobe" },
            },
            data: {
              metadata: {
                error: errorMessage,
                failedAt: new Date().toISOString(),
              },
            },
          })
          .catch((storeErr: unknown) => {
            const storeMsg = storeErr instanceof Error ? storeErr.message : String(storeErr);
            this.logger.error(`Failed to store error metadata: ${storeMsg}`);
          });

        return null as unknown as CapsulePlan;
      }

      // Not the final attempt -- re-throw for BullMQ retry
      this.logger.warn(
        `Capsule wardrobe generation failed (attempt ${
          job.attemptsMade + 1
        }/3) for user ${userId}: ${errorMessage}`
      );
      throw error;
    }
  }

  private async callDialogEngine(
    baseUrl: string,
    payload: {
      userId: string;
      prompt: string;
      context: {
        existingItems: Array<{ category: string; color: string; style: string }>;
        neededCount: number;
        preferences: Record<string, string[]>;
      };
    }
  ): Promise<{ recommendations: AiRecommendation[]; outfitCombinations: unknown[] }> {
    // Dynamic import of axios to allow easy mocking in tests
    const axios = (await import("axios")).default;

    const response = await axios.post(`${baseUrl}/dialog/generate`, payload, {
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    return response.data;
  }

  private calculateReuseStats(
    existingItems: ExistingItem[],
    outfitCombinations: Array<{ occasion: string; items: string[] }>
  ): CapsulePlan["reuseStats"] {
    // Count how many outfits each item appears in
    const reuseMap = new Map<string, number>();

    for (const existingItem of existingItems) {
      let count = 0;
      for (const combo of outfitCombinations) {
        if (combo.items.includes(existingItem.id)) {
          count++;
        }
      }
      reuseMap.set(existingItem.id, count);
    }

    const totalReuse = Array.from(reuseMap.values()).reduce((sum, c) => sum + c, 0);
    const averageReusePerItem = existingItems.length > 0 ? totalReuse / existingItems.length : 0;

    // Find most versatile items (sorted by reuse count)
    const mostVersatileItems = existingItems
      .map((item) => ({
        id: item.id,
        name: item.name,
        reuseCount: reuseMap.get(item.id) ?? 0,
      }))
      .sort((a, b) => b.reuseCount - a.reuseCount)
      .slice(0, 5);

    return {
      averageReusePerItem: Math.round(averageReusePerItem * 100) / 100,
      mostVersatileItems,
    };
  }
}

export { CAPSULE_WARDROBE_QUEUE };

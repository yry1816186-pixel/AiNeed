import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { SASRecClientService } from "./sasrec-client.service";

export interface UserBehaviorSequence {
  userId: string;
  items: SequenceItem[];
  timestamps: Date[];
}

export interface SequenceItem {
  itemId: string;
  categoryId: string;
  brandId?: string;
  price?: number;
  action: "view" | "like" | "cart" | "purchase";
  timestamp: Date;
}

export interface SASRecConfig {
  hiddenSize: number;
  maxSequenceLength: number;
  numHeads: number;
  numLayers: number;
  dropout: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  maxCacheSize: number;
  cacheTTLMinutes: number;
}

export interface SASRecPrediction {
  itemId: string;
  score: number;
  rank: number;
  reason: string;
}

export interface SequenceRecommendationResult {
  recommendations: SASRecPrediction[];
  sequenceLength: number;
  modelVersion: string;
  processingTime: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable()
export class SASRecService {
  private readonly logger = new Logger(SASRecService.name);

  private readonly config: SASRecConfig = {
    hiddenSize: 64,
    maxSequenceLength: 50,
    numHeads: 2,
    numLayers: 2,
    dropout: 0.2,
    learningRate: 0.001,
    batchSize: 256,
    epochs: 10,
    maxCacheSize: 10000,
    cacheTTLMinutes: 60,
  };

  private readonly modelVersion: string = "sasrec-v2.0";

  private userSequences: Map<string, CacheEntry<SequenceItem[]>> = new Map();
  private isModelLoaded: boolean = false;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private sasrecClient: SASRecClientService
  ) {
    this.initializeModel();
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, this.config.cacheTTLMinutes * 60 * 1000);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const ttlMs = this.config.cacheTTLMinutes * 60 * 1000;

    let cleanedSequences = 0;

    for (const [key, entry] of this.userSequences.entries()) {
      if (now - entry.timestamp > ttlMs) {
        this.userSequences.delete(key);
        cleanedSequences++;
      }
    }

    if (cleanedSequences > 0) {
      this.logger.debug(`Cache cleanup: removed ${cleanedSequences} sequences`);
    }

    if (this.userSequences.size > this.config.maxCacheSize) {
      const entries = Array.from(this.userSequences.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize);
      for (const [key] of toRemove) {
        this.userSequences.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.userSequences.clear();
    this.logger.log("SASRec service destroyed, caches cleared");
  }

  private async initializeModel(): Promise<void> {
    this.logger.log("Initializing SASRec service...");

    await this.loadUserSequences();

    this.isModelLoaded = true;
    this.logger.log(
      `SASRec initialized. Users: ${this.userSequences.size}, Python endpoint: ${
        this.sasrecClient.isEnabled() ? "enabled" : "disabled"
      }`
    );
  }

  private async loadUserSequences(): Promise<void> {
    try {
      const behaviors = await this.prisma.userBehavior.findMany({
        where: {
          type: { in: ["page_view", "post_like", "add_to_cart", "purchase"] },
        },
        orderBy: { createdAt: "asc" },
        take: 100000,
        select: {
          userId: true,
          itemId: true,
          type: true,
          createdAt: true,
        },
      });

      const now = Date.now();
      const sequenceMap = new Map<string, CacheEntry<SequenceItem[]>>();

      for (const behavior of behaviors) {
        if (!sequenceMap.has(behavior.userId)) {
          sequenceMap.set(behavior.userId, { data: [], timestamp: now });
        }

        sequenceMap.get(behavior.userId)!.data.push({
          itemId: behavior.itemId || "",
          categoryId: "",
          action: behavior.type as "view" | "like" | "cart" | "purchase",
          timestamp: behavior.createdAt,
        });
      }

      this.userSequences = sequenceMap;
      this.logger.log(`Loaded sequences for ${sequenceMap.size} users`);
    } catch (error) {
      this.logger.error(`Failed to load user sequences: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get recommendations from Python SASRec /predict endpoint.
   * This is the primary recommendation path that delegates to the
   * Python SASRec service for real model inference.
   *
   * @param userId - The user ID to get recommendations for
   * @param itemIds - Historical item IDs from the user's behavior sequence
   * @param topK - Number of recommendations to return (default: 20)
   * @returns Array of item IDs sorted by SASRec score (descending)
   */
  async getRecommendations(
    userId: string,
    itemIds: string[],
    topK: number = 20
  ): Promise<string[]> {
    if (!this.sasrecClient.isEnabled()) {
      this.logger.debug("SASRec Python service is disabled, returning empty recommendations");
      return [];
    }

    try {
      const userSequence = itemIds.map((itemId, index) => ({
        itemId,
        timestamp: Date.now() - (itemIds.length - index) * 86400000,
      }));

      const recommendations = await this.sasrecClient.predict(userSequence, topK);

      if (!recommendations || recommendations.length === 0) {
        this.logger.debug(`SASRec returned no recommendations for user ${userId}`);
        return [];
      }

      // Sort by score descending and extract item IDs
      const sorted = [...recommendations]
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((rec) => rec.item_id);

      this.logger.debug(
        `SASRec returned ${sorted.length} recommendations for user ${userId} from ${itemIds.length} input items`
      );

      return sorted;
    } catch (error) {
      this.logger.warn(
        `SASRec Python service unavailable for user ${userId}: ${this.getErrorMessage(error)}`
      );
      return [];
    }
  }

  async getSequenceRecommendations(
    userId: string,
    topK: number = 10
  ): Promise<SequenceRecommendationResult> {
    const startTime = Date.now();

    // Use Python SASRec service as primary path
    if (this.sasrecClient.isEnabled()) {
      try {
        const sequenceEntry = this.userSequences.get(userId);
        const sequence = sequenceEntry?.data || [];
        const recentSequence = sequence.slice(-this.config.maxSequenceLength);

        if (recentSequence.length === 0) {
          return this.getColdStartRecommendations(userId, topK, startTime);
        }

        const itemIds = recentSequence.map((s) => s.itemId);
        const recommendations = await this.getRecommendations(userId, itemIds, topK);

        if (recommendations.length > 0) {
          return {
            recommendations: recommendations.map((itemId, index) => ({
              itemId,
              score: 1 - index * (1 / topK),
              rank: index + 1,
              reason: this.generateReason(recentSequence, 1 - index * (1 / topK)),
            })),
            sequenceLength: recentSequence.length,
            modelVersion: "sasrec-python-v2.0",
            processingTime: Date.now() - startTime,
          };
        }
      } catch (error) {
        this.logger.debug(`Python SASRec failed, falling back to cold start: ${error}`);
      }
    }

    // Fallback: cold start recommendations
    return this.getColdStartRecommendations(userId, topK, startTime);
  }

  private generateReason(sequence: SequenceItem[], score: number): string {
    if (score > 0.8) {
      return "与您的购物偏好高度匹配";
    } else if (score > 0.6) {
      return "基于您的浏览历史推荐";
    } else if (sequence.length > 5) {
      return "根据您最近的兴趣推荐";
    } else {
      return "为您推荐";
    }
  }

  private async getColdStartRecommendations(
    userId: string,
    topK: number,
    startTime: number
  ): Promise<SequenceRecommendationResult> {
    const popularItems = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: topK,
      select: { id: true },
    });

    return {
      recommendations: popularItems.map((item, index: number) => ({
        itemId: item.id,
        score: 1 - index * 0.05,
        rank: index + 1,
        reason: "热门商品推荐",
      })),
      sequenceLength: 0,
      modelVersion: this.modelVersion,
      processingTime: Date.now() - startTime,
    };
  }

  async updateSequence(userId: string, item: SequenceItem): Promise<void> {
    const now = Date.now();
    if (!this.userSequences.has(userId)) {
      this.userSequences.set(userId, { data: [item], timestamp: now });
      return;
    }

    const entry = this.userSequences.get(userId)!;
    entry.data.push(item);
    entry.timestamp = now;

    if (entry.data.length > this.config.maxSequenceLength * 2) {
      entry.data = entry.data.slice(-this.config.maxSequenceLength);
    }
  }

  async trainModel(): Promise<{ success: boolean; message: string }> {
    this.logger.log("Refreshing SASRec user sequences...");

    try {
      await this.loadUserSequences();

      this.logger.log("SASRec user sequences refreshed");
      return { success: true, message: "User sequences refreshed successfully" };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Refresh failed: ${message}`);
      return { success: false, message };
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  getModelStatus(): {
    loaded: boolean;
    usersCount: number;
    config: SASRecConfig;
    pythonEndpointEnabled: boolean;
  } {
    return {
      loaded: this.isModelLoaded,
      usersCount: this.userSequences.size,
      config: this.config,
      pythonEndpointEnabled: this.sasrecClient.isEnabled(),
    };
  }

  getConfig(): SASRecConfig {
    return { ...this.config };
  }

  setConfig(newConfig: Partial<SASRecConfig>): void {
    Object.assign(this.config, newConfig);
  }
}

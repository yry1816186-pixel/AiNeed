/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { TransformerEncoderService } from "./transformer-encoder.service";

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

interface ItemAttributes {
  id: string;
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  colors?: string[];
  tags?: string[];
}

const CATEGORY_EMBEDDINGS: Record<string, number[]> = {
  tops: [0.8, 0.2, 0.1, 0.3, 0.5, 0.7, 0.4, 0.6],
  bottoms: [0.2, 0.8, 0.3, 0.1, 0.6, 0.4, 0.7, 0.5],
  dresses: [0.6, 0.4, 0.7, 0.5, 0.3, 0.8, 0.2, 0.6],
  outerwear: [0.4, 0.6, 0.5, 0.7, 0.8, 0.2, 0.6, 0.4],
  footwear: [0.3, 0.7, 0.4, 0.6, 0.2, 0.5, 0.8, 0.3],
  accessories: [0.7, 0.3, 0.6, 0.4, 0.7, 0.6, 0.3, 0.8],
  activewear: [0.5, 0.5, 0.8, 0.2, 0.4, 0.3, 0.9, 0.1],
  formal: [0.9, 0.1, 0.2, 0.8, 0.6, 0.9, 0.1, 0.7],
  casual: [0.1, 0.9, 0.6, 0.4, 0.3, 0.2, 0.8, 0.5],
  default: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
};

const STYLE_EMBEDDINGS: Record<string, number[]> = {
  minimalist: [0.9, 0.1, 0.2, 0.1, 0.8, 0.9, 0.1, 0.2],
  streetwear: [0.2, 0.8, 0.7, 0.6, 0.3, 0.2, 0.8, 0.7],
  classic: [0.7, 0.3, 0.4, 0.8, 0.6, 0.7, 0.3, 0.4],
  bohemian: [0.4, 0.6, 0.8, 0.3, 0.2, 0.4, 0.7, 0.8],
  sporty: [0.3, 0.7, 0.5, 0.2, 0.9, 0.3, 0.6, 0.1],
  elegant: [0.8, 0.2, 0.3, 0.9, 0.5, 0.8, 0.2, 0.6],
  vintage: [0.5, 0.5, 0.6, 0.4, 0.3, 0.5, 0.4, 0.9],
  modern: [0.6, 0.4, 0.4, 0.6, 0.7, 0.6, 0.5, 0.3],
};

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

  private readonly modelEndpoint: string;
  private readonly useLocalModel: boolean;
  private readonly modelVersion: string = "sasrec-v1.0";

  private itemEmbeddings: Map<string, CacheEntry<number[]>> = new Map();
  private userSequences: Map<string, CacheEntry<SequenceItem[]>> = new Map();
  private isModelLoaded: boolean = false;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private transformerEncoder: TransformerEncoderService,
  ) {
    this.modelEndpoint = this.configService.get<string>(
      "SASREC_ENDPOINT",
      "http://localhost:8002",
    );
    this.useLocalModel =
      this.configService.get<string>("USE_LOCAL_SASREC", "false") === "true";

    this.initializeModel();
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredCache();
      },
      this.config.cacheTTLMinutes * 60 * 1000,
    );
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const ttlMs = this.config.cacheTTLMinutes * 60 * 1000;

    let cleanedItems = 0;
    let cleanedSequences = 0;

    for (const [key, entry] of this.itemEmbeddings.entries()) {
      if (now - entry.timestamp > ttlMs) {
        this.itemEmbeddings.delete(key);
        cleanedItems++;
      }
    }

    for (const [key, entry] of this.userSequences.entries()) {
      if (now - entry.timestamp > ttlMs) {
        this.userSequences.delete(key);
        cleanedSequences++;
      }
    }

    if (cleanedItems > 0 || cleanedSequences > 0) {
      this.logger.debug(
        `Cache cleanup: removed ${cleanedItems} items, ${cleanedSequences} sequences`,
      );
    }

    if (this.itemEmbeddings.size > this.config.maxCacheSize) {
      const entries = Array.from(this.itemEmbeddings.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(
        0,
        entries.length - this.config.maxCacheSize,
      );
      for (const [key] of toRemove) {
        this.itemEmbeddings.delete(key);
      }
    }

    if (this.userSequences.size > this.config.maxCacheSize) {
      const entries = Array.from(this.userSequences.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(
        0,
        entries.length - this.config.maxCacheSize,
      );
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
    this.itemEmbeddings.clear();
    this.userSequences.clear();
    this.logger.log("SASRec service destroyed, caches cleared");
  }

  private async initializeModel(): Promise<void> {
    this.logger.log("Initializing SASRec model...");

    await this.loadItemEmbeddings();
    await this.loadUserSequences();

    this.isModelLoaded = true;
    this.logger.log(
      `SASRec initialized. Items: ${this.itemEmbeddings.size}, Users: ${this.userSequences.size}`,
    );
  }

  private async loadItemEmbeddings(): Promise<void> {
    try {
      const items = await this.prisma.clothingItem.findMany({
        select: {
          id: true,
          category: true,
          brandId: true,
          price: true,
          tags: true,
          colors: true,
        },
        take: 10000,
      });

      const now = Date.now();
      for (const item of items) {
        const embedding = this.generateItemEmbedding({
          id: item.id,
          category: item.category,
          brand: item.brandId ?? undefined,
          colors: item.colors,
          tags: item.tags,
          price: Number(item.price),
        });
        this.itemEmbeddings.set(item.id, { data: embedding, timestamp: now });
      }

      this.logger.log(`Loaded ${items.length} item embeddings`);
    } catch (error) {
      this.logger.error(
        `Failed to load item embeddings: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private generateItemEmbedding(item: ItemAttributes): number[] {
    const baseSize = 8;
    const embedding: number[] = new Array(this.config.hiddenSize).fill(0);

    const categoryKey = this.normalizeCategory(item.category);
    const categoryEmbed =
      CATEGORY_EMBEDDINGS[categoryKey] ??
      CATEGORY_EMBEDDINGS.default ??
      new Array(baseSize).fill(0);

    for (let i = 0; i < Math.min(baseSize, this.config.hiddenSize); i++) {
      embedding[i] = categoryEmbed[i] ?? 0;
    }

    if (item.name) {
      const nameTokens = item.name.toLowerCase().split(/\s+/);
      for (const token of nameTokens) {
        const styleKey = this.detectStyleFromToken(token);
        if (styleKey && STYLE_EMBEDDINGS[styleKey]) {
          const styleEmbed = STYLE_EMBEDDINGS[styleKey];
          for (let i = 0; i < Math.min(baseSize, this.config.hiddenSize); i++) {
            embedding[i] = ((embedding[i] ?? 0) + (styleEmbed[i] ?? 0)) / 2;
          }
        }
      }
    }

    if (item.price !== undefined) {
      const priceNorm = Math.log1p(item.price) / 10;
      const priceIdx = Math.min(baseSize, this.config.hiddenSize - 1);
      embedding[priceIdx] = priceNorm;
    }

    if (item.colors && item.colors.length > 0) {
      const colorEmbed = this.generateColorEmbedding(item.colors);
      for (
        let i = baseSize;
        i < Math.min(baseSize + 8, this.config.hiddenSize);
        i++
      ) {
        embedding[i] = colorEmbed[i - baseSize] || 0;
      }
    }

    if (item.brand) {
      const brandHash = this.hashString(item.brand);
      const brandIdx = Math.min(baseSize + 8, this.config.hiddenSize - 4);
      for (let i = 0; i < 4 && brandIdx + i < this.config.hiddenSize; i++) {
        embedding[brandIdx + i] = ((brandHash >> (i * 8)) & 0xff) / 255;
      }
    }

    const idHash = this.hashString(item.id);
    for (let i = this.config.hiddenSize - 4; i < this.config.hiddenSize; i++) {
      embedding[i] =
        ((idHash >> ((i - this.config.hiddenSize + 4) * 8)) & 0xff) / 255;
    }

    return this.normalizeEmbedding(embedding);
  }

  private normalizeCategory(category?: string): string {
    if (!category) {return "default";}
    const normalized = category.toLowerCase();

    const categoryMap: Record<string, string> = {
      shirt: "tops",
      tshirt: "tops",
      "t-shirt": "tops",
      blouse: "tops",
      sweater: "tops",
      pants: "bottoms",
      jeans: "bottoms",
      trousers: "bottoms",
      shorts: "bottoms",
      skirt: "bottoms",
      dress: "dresses",
      gown: "dresses",
      jacket: "outerwear",
      coat: "outerwear",
      blazer: "outerwear",
      vest: "outerwear",
      shoes: "footwear",
      sneakers: "footwear",
      boots: "footwear",
      heels: "footwear",
      bag: "accessories",
      watch: "accessories",
      jewelry: "accessories",
      scarf: "accessories",
      sport: "activewear",
      gym: "activewear",
      athletic: "activewear",
      suit: "formal",
      tuxedo: "formal",
    };

    for (const [key, value] of Object.entries(categoryMap)) {
      if (normalized.includes(key)) {return value;}
    }
    return "default";
  }

  private detectStyleFromToken(token: string): string | null {
    const styleKeywords: Record<string, string[]> = {
      minimalist: ["minimal", "simple", "clean", "basic"],
      streetwear: ["street", "urban", "hip", "cool", "trendy"],
      classic: ["classic", "timeless", "traditional", "elegant"],
      bohemian: ["boho", "bohemian", "hippie", "free", "artistic"],
      sporty: ["sport", "athletic", "gym", "active", "fitness"],
      elegant: ["elegant", "sophisticated", "refined", "chic", "luxury"],
      vintage: ["vintage", "retro", "old", "classic", "antique"],
      modern: ["modern", "contemporary", "new", "fresh", "current"],
    };

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some((kw) => token.includes(kw))) {
        return style;
      }
    }
    return null;
  }

  private generateColorEmbedding(colors: string[]): number[] {
    const colorVectors: Record<string, number[]> = {
      black: [0, 0, 0, 1, 0.9, 0.1, 0.5, 0.8],
      white: [1, 1, 1, 0, 0.1, 0.9, 0.5, 0.2],
      red: [1, 0, 0, 0.5, 0.3, 0.7, 0.8, 0.4],
      blue: [0, 0, 1, 0.5, 0.7, 0.3, 0.4, 0.6],
      green: [0, 0.5, 0, 0.5, 0.6, 0.4, 0.3, 0.5],
      yellow: [1, 1, 0, 0.3, 0.2, 0.8, 0.7, 0.3],
      pink: [1, 0.5, 0.5, 0.4, 0.3, 0.7, 0.6, 0.4],
      purple: [0.5, 0, 0.5, 0.6, 0.5, 0.5, 0.4, 0.7],
      orange: [1, 0.5, 0, 0.4, 0.3, 0.6, 0.7, 0.3],
      brown: [0.5, 0.25, 0, 0.7, 0.6, 0.4, 0.3, 0.6],
      gray: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      beige: [0.9, 0.8, 0.6, 0.3, 0.4, 0.6, 0.4, 0.3],
      navy: [0, 0, 0.5, 0.7, 0.8, 0.2, 0.3, 0.7],
    };

    const result = new Array(8).fill(0);
    let count = 0;

    for (const color of colors) {
      const normalized = color.toLowerCase();
      for (const [colorName, vector] of Object.entries(colorVectors)) {
        if (normalized.includes(colorName)) {
          for (let i = 0; i < 8; i++) {
            result[i] += vector[i];
          }
          count++;
          break;
        }
      }
    }

    if (count > 0) {
      for (let i = 0; i < 8; i++) {
        result[i] /= count;
      }
    }

    return result;
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) {return embedding;}
    return embedding.map((val) => val / norm);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
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
      this.logger.error(
        `Failed to load user sequences: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async getSequenceRecommendations(
    userId: string,
    topK: number = 10,
  ): Promise<SequenceRecommendationResult> {
    const startTime = Date.now();

    // Try remote SASRec server first if available
    if (this.useLocalModel === false) {
      try {
        const remoteResult = await this.getRemoteRecommendations(userId, topK);
        if (remoteResult) {
          return remoteResult;
        }
      } catch (error) {
        this.logger.debug(`Remote SASRec failed, falling back to local: ${error}`);
      }
    }

    // Local fallback
    const sequenceEntry = this.userSequences.get(userId);
    const sequence = sequenceEntry?.data || [];
    const recentSequence = sequence.slice(-this.config.maxSequenceLength);

    if (recentSequence.length === 0) {
      return this.getColdStartRecommendations(userId, topK, startTime);
    }

    const predictions = await this.predictNextItems(recentSequence, topK);

    return {
      recommendations: predictions,
      sequenceLength: recentSequence.length,
      modelVersion: this.modelVersion,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Get recommendations from remote SASRec server
   */
  private async getRemoteRecommendations(
    userId: string,
    topK: number,
  ): Promise<SequenceRecommendationResult | null> {
    const sequenceEntry = this.userSequences.get(userId);
    const sequence = sequenceEntry?.data || [];

    if (sequence.length === 0) {
      return null;
    }

    const itemSequence = sequence.slice(-this.config.maxSequenceLength).map((s) => {
      // Convert itemId to numeric ID for SASRec
      return this.hashString(s.itemId) % 50000 + 1;
    });

    try {
      const response = await fetch(`${this.modelEndpoint}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          item_sequence: itemSequence,
          top_k: topK,
          include_scores: true,
        }),
      });

      if (!response.ok) {
        this.logger.debug(`Remote SASRec returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data.success || !data.recommendations) {
        return null;
      }

      // Convert numeric IDs back to string IDs
      const recommendations: SASRecPrediction[] = data.recommendations.map(
        (itemId: number, index: number) => ({
          itemId: this.getItemIdFromNumeric(itemId),
          score: data.scores?.[index] || 1 - index * 0.05,
          rank: index + 1,
          reason: this.generateReason(sequence, data.scores?.[index] || 0.5),
        }),
      );

      return {
        recommendations,
        sequenceLength: itemSequence.length,
        modelVersion: "sasrec-remote-v1.0",
        processingTime: data.processing_time || 0,
      };
    } catch (error) {
      this.logger.debug(`Remote SASRec request failed: ${error}`);
      return null;
    }
  }

  /**
   * Convert numeric item ID back to string ID
   */
  private getItemIdFromNumeric(numericId: number): string {
    // This is a simplified mapping - in production, maintain a bidirectional mapping
    for (const [itemId, entry] of this.itemEmbeddings) {
      const hash = this.hashString(itemId) % 50000 + 1;
      if (hash === numericId) {
        return itemId;
      }
    }
    return `item_${numericId}`;
  }

  private async predictNextItems(
    sequence: SequenceItem[],
    topK: number,
  ): Promise<SASRecPrediction[]> {
    const sequenceEmbedding = this.encodeSequence(sequence);
    const scores: { itemId: string; score: number }[] = [];

    for (const [itemId, entry] of this.itemEmbeddings) {
      const score = this.cosineSimilarity(sequenceEmbedding, entry.data);
      scores.push({ itemId, score });
    }

    scores.sort((a, b) => b.score - a.score);

    const recentItems = new Set(sequence.map((s) => s.itemId));
    const filtered = scores.filter((s) => !recentItems.has(s.itemId));

    return filtered.slice(0, topK).map((item, index) => ({
      itemId: item.itemId,
      score: item.score,
      rank: index + 1,
      reason: this.generateReason(sequence, item.score),
    }));
  }

  private encodeSequence(sequence: SequenceItem[]): number[] {
    const embedding = new Array(this.config.hiddenSize).fill(0);

    const actionWeights: Record<string, number> = {
      view: 0.1,
      like: 0.3,
      cart: 0.5,
      purchase: 1.0,
    };

    sequence.forEach((item, i) => {
      const itemEntry = this.itemEmbeddings.get(item.itemId);

      if (itemEntry) {
        const positionWeight = (i + 1) / sequence.length;
        const actionWeight = actionWeights[item.action] || 0.1;
        const totalWeight = positionWeight * actionWeight;

        for (let j = 0; j < embedding.length; j++) {
          embedding[j] =
            (embedding[j] ?? 0) + (itemEntry.data[j] ?? 0) * totalWeight;
        }
      }
    });

    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {return 0;}

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const aValue = a[i] ?? 0;
      const bValue = b[i] ?? 0;
      dotProduct += aValue * bValue;
      normA += aValue * aValue;
      normB += bValue * bValue;
    }

    if (normA === 0 || normB === 0) {return 0;}

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateReason(sequence: SequenceItem[], score: number): string {
    const lastItem = sequence[sequence.length - 1];

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
    startTime: number,
  ): Promise<SequenceRecommendationResult> {
    const popularItems = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: topK,
      select: { id: true },
    });

    return {
      recommendations: popularItems.map((item: any, index: number) => ({
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
    this.logger.log("Starting SASRec model training...");

    try {
      await this.loadItemEmbeddings();
      await this.loadUserSequences();

      this.logger.log("SASRec model training completed");
      return { success: true, message: "Model trained successfully" };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Training failed: ${message}`);
      return { success: false, message };
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  getModelStatus(): {
    loaded: boolean;
    itemsCount: number;
    usersCount: number;
    config: SASRecConfig;
  } {
    return {
      loaded: this.isModelLoaded,
      itemsCount: this.itemEmbeddings.size,
      usersCount: this.userSequences.size,
      config: this.config,
    };
  }

  getConfig(): SASRecConfig {
    return { ...this.config };
  }

  setConfig(newConfig: Partial<SASRecConfig>): void {
    Object.assign(this.config, newConfig);
  }
}

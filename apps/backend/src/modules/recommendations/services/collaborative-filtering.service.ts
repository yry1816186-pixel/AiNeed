import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

export interface UserItemInteraction {
  userId: string;
  itemId: string;
  rating: number;
  timestamp: Date;
}

export interface SimilarityScore {
  targetId: string;
  score: number;
}

export interface RecommendationResult {
  itemId: string;
  score: number;
  reasons: string[];
  confidence: number;
}

interface InteractionMatrix {
  users: Map<string, Map<string, number>>;
  items: Map<string, Set<string>>;
}

interface MatrixFactorizationModel {
  userFactors: Map<string, number[]>;
  itemFactors: Map<string, number[]>;
  userBias: Map<string, number>;
  itemBias: Map<string, number>;
  globalBias: number;
  latentFactors: number;
}

interface ALSConfig {
  latentFactors: number;
  regularization: number;
  iterations: number;
  alpha: number;
}

interface SerializedMFModel {
  userFactors: [string, number[]][];
  itemFactors: [string, number[]][];
  userBias: [string, number][];
  itemBias: [string, number][];
  globalBias: number;
  latentFactors: number;
  trainedAt: string;
}

@Injectable()
export class CollaborativeFilteringService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CollaborativeFilteringService.name);
  private readonly CACHE_TTL = 3600;
  private readonly MIN_INTERACTIONS = 5;
  private readonly SIMILARITY_THRESHOLD = 0.1;
  private readonly MODEL_CACHE_KEY = "mf:model:full";
  private readonly MODEL_META_KEY = "mf:model:metadata";
  private readonly MODEL_TTL = 86400;

  private readonly ALS_CONFIG: ALSConfig = {
    latentFactors: 50,
    regularization: 0.1,
    iterations: 20,
    alpha: 40,
  };

  private mfModel: MatrixFactorizationModel | null = null;
  private modelLastTrained: Date | null = null;
  private readonly MODEL_REFRESH_INTERVAL = 3600000;
  private saveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadModelFromCache();

    this.saveInterval = setInterval(() => {
      if (this.mfModel) {
        this.saveModelToCache().catch((err) => {
          this.logger.warn(`Periodic model save failed: ${err.message}`);
        });
      }
    }, 300000);
  }

  onModuleDestroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  private async loadModelFromCache(): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      const modelJson = await client.get(this.MODEL_CACHE_KEY);

      if (!modelJson) {
        this.logger.log("No cached MF model found, will train on first use");
        return false;
      }

      const serialized: SerializedMFModel = JSON.parse(modelJson);

      this.mfModel = {
        userFactors: new Map(serialized.userFactors),
        itemFactors: new Map(serialized.itemFactors),
        userBias: new Map(serialized.userBias),
        itemBias: new Map(serialized.itemBias),
        globalBias: serialized.globalBias,
        latentFactors: serialized.latentFactors,
      };
      this.modelLastTrained = new Date(serialized.trainedAt);

      this.logger.log(
        `Loaded MF model from cache: ${this.mfModel.userFactors.size} users, ${this.mfModel.itemFactors.size} items`,
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to load MF model from cache: ${message}`);
      return false;
    }
  }

  private async saveModelToCache(): Promise<void> {
    if (!this.mfModel) {return;}

    try {
      const client = this.redis.getClient();

      const serialized: SerializedMFModel = {
        userFactors: Array.from(this.mfModel.userFactors.entries()),
        itemFactors: Array.from(this.mfModel.itemFactors.entries()),
        userBias: Array.from(this.mfModel.userBias.entries()),
        itemBias: Array.from(this.mfModel.itemBias.entries()),
        globalBias: this.mfModel.globalBias,
        latentFactors: this.mfModel.latentFactors,
        trainedAt:
          this.modelLastTrained?.toISOString() || new Date().toISOString(),
      };

      await client.setex(
        this.MODEL_CACHE_KEY,
        this.MODEL_TTL,
        JSON.stringify(serialized),
      );

      await client.hset(this.MODEL_META_KEY, {
        lastTrained: serialized.trainedAt,
        latentFactors: serialized.latentFactors.toString(),
        globalBias: serialized.globalBias.toString(),
        userCount: serialized.userFactors.length.toString(),
        itemCount: serialized.itemFactors.length.toString(),
      });
      await client.expire(this.MODEL_META_KEY, this.MODEL_TTL);

      this.logger.debug("MF model saved to cache");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to save MF model to cache: ${message}`);
    }
  }

  async getUserBasedRecommendations(
    userId: string,
    options: { limit?: number; excludeViewed?: boolean } = {},
  ): Promise<RecommendationResult[]> {
    const { limit = 20, excludeViewed = true } = options;

    const cacheKey = `cf:user:${userId}:recommendations`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).slice(0, limit);
    }

    const interactions = await this.buildInteractionMatrix();
    const userInteractions = interactions.users.get(userId);

    if (!userInteractions || userInteractions.size < this.MIN_INTERACTIONS) {
      return this.getFallbackRecommendations(userId, limit);
    }

    const similarUsers = await this.findSimilarUsers(userId, interactions);
    const recommendations = await this.generateUserBasedRecommendations(
      userId,
      similarUsers,
      interactions,
      excludeViewed,
    );

    const results = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));

    return results;
  }

  async getItemBasedRecommendations(
    itemId: string,
    options: { limit?: number } = {},
  ): Promise<RecommendationResult[]> {
    const { limit = 10 } = options;

    const cacheKey = `cf:item:${itemId}:similar`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached).slice(0, limit);
    }

    const interactions = await this.buildInteractionMatrix();
    const similarItems = await this.findSimilarItems(itemId, interactions);

    const results = similarItems
      .filter((item) => item.targetId !== itemId)
      .slice(0, limit)
      .map((item) => ({
        itemId: item.targetId,
        score: item.score,
        reasons: ["相似商品推荐"],
        confidence: item.score,
      }));

    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));

    return results;
  }

  private async buildInteractionMatrix(): Promise<InteractionMatrix> {
    const users = new Map<string, Map<string, number>>();
    const items = new Map<string, Set<string>>();

    const behaviors = await this.prisma.userBehavior.findMany({
      where: {
        OR: [
          { type: "view" },
          { type: "like" },
          { type: "favorite" },
          { type: "purchase" },
        ],
      },
      select: {
        userId: true,
        itemId: true,
        type: true,
        createdAt: true,
      },
    });

    const ratingWeights = {
      view: 1,
      like: 2,
      favorite: 3,
      purchase: 5,
    };

    for (const behavior of behaviors) {
      if (!behavior.itemId) {continue;}

      const weight =
        ratingWeights[behavior.type as keyof typeof ratingWeights] || 1;

      if (!users.has(behavior.userId)) {
        users.set(behavior.userId, new Map());
      }

      const userItems = users.get(behavior.userId)!;
      const currentRating = userItems.get(behavior.itemId) || 0;
      userItems.set(behavior.itemId, currentRating + weight);

      if (!items.has(behavior.itemId)) {
        items.set(behavior.itemId, new Set());
      }
      items.get(behavior.itemId)!.add(behavior.userId);
    }

    return { users, items };
  }

  private async findSimilarUsers(
    userId: string,
    interactions: InteractionMatrix,
  ): Promise<SimilarityScore[]> {
    const userInteractions = interactions.users.get(userId);
    if (!userInteractions) {return [];}

    const similarities: SimilarityScore[] = [];
    const userItems = new Set(userInteractions.keys());

    for (const [otherUserId, otherInteractions] of interactions.users) {
      if (otherUserId === userId) {continue;}

      const otherItems = new Set(otherInteractions.keys());
      const similarity = this.calculateCosineSimilarity(
        userInteractions,
        otherInteractions,
        userItems,
        otherItems,
      );

      if (similarity > this.SIMILARITY_THRESHOLD) {
        similarities.push({ targetId: otherUserId, score: similarity });
      }
    }

    return similarities.sort((a, b) => b.score - a.score).slice(0, 50);
  }

  private async findSimilarItems(
    itemId: string,
    interactions: InteractionMatrix,
  ): Promise<SimilarityScore[]> {
    const itemUsers = interactions.items.get(itemId);
    if (!itemUsers) {return [];}

    const similarities: SimilarityScore[] = [];

    for (const [otherItemId, otherUsers] of interactions.items) {
      if (otherItemId === itemId) {continue;}

      const intersection = new Set(
        [...itemUsers].filter((user) => otherUsers.has(user)),
      );

      if (intersection.size === 0) {continue;}

      const union = new Set([...itemUsers, ...otherUsers]);
      const jaccardSimilarity = intersection.size / union.size;

      if (jaccardSimilarity > this.SIMILARITY_THRESHOLD) {
        similarities.push({ targetId: otherItemId, score: jaccardSimilarity });
      }
    }

    return similarities.sort((a, b) => b.score - a.score).slice(0, 100);
  }

  private calculateCosineSimilarity(
    vec1: Map<string, number>,
    vec2: Map<string, number>,
    keys1: Set<string>,
    keys2: Set<string>,
  ): number {
    const intersection = new Set([...keys1].filter((k) => keys2.has(k)));

    if (intersection.size === 0) {return 0;}

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const key of intersection) {
      const v1 = vec1.get(key) || 0;
      const v2 = vec2.get(key) || 0;
      dotProduct += v1 * v2;
    }

    for (const key of keys1) {
      const v = vec1.get(key) || 0;
      norm1 += v * v;
    }

    for (const key of keys2) {
      const v = vec2.get(key) || 0;
      norm2 += v * v;
    }

    if (norm1 === 0 || norm2 === 0) {return 0;}

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private async generateUserBasedRecommendations(
    userId: string,
    similarUsers: SimilarityScore[],
    interactions: InteractionMatrix,
    excludeViewed: boolean,
  ): Promise<RecommendationResult[]> {
    const userItems = interactions.users.get(userId);
    const viewedItems =
      excludeViewed && userItems ? new Set(userItems.keys()) : new Set();

    const itemScores = new Map<
      string,
      { score: number; reasons: Set<string> }
    >();

    for (const similarUser of similarUsers.slice(0, 20)) {
      const otherInteractions = interactions.users.get(similarUser.targetId);
      if (!otherInteractions) {continue;}

      for (const [itemId, rating] of otherInteractions) {
        if (viewedItems.has(itemId)) {continue;}

        if (!itemScores.has(itemId)) {
          itemScores.set(itemId, { score: 0, reasons: new Set() });
        }

        const item = itemScores.get(itemId)!;
        item.score += similarUser.score * rating;
        item.reasons.add("相似用户喜欢");
      }
    }

    const results: RecommendationResult[] = [];
    for (const [itemId, data] of itemScores) {
      const normalizedScore = data.score / similarUsers.length;
      results.push({
        itemId,
        score: data.score,
        reasons: Array.from(data.reasons),
        confidence: Math.min(0.95, 0.3 + normalizedScore * 0.65),
      });
    }

    return results;
  }

  private async getFallbackRecommendations(
    userId: string,
    limit: number,
  ): Promise<RecommendationResult[]> {
    const popularItems = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: limit,
      select: { id: true },
    });

    return popularItems.map((item) => ({
      itemId: item.id,
      score: 50,
      reasons: ["热门推荐"],
      confidence: 0.3,
    }));
  }

  async updateUserItemInteraction(
    userId: string,
    itemId: string,
    type: "view" | "like" | "favorite" | "purchase",
  ): Promise<void> {
    await this.redis.del(`cf:user:${userId}:recommendations`);

    this.logger.debug(`Updated interaction: ${userId} -> ${itemId} (${type})`);
  }

  async getSimilarUsers(userId: string): Promise<SimilarityScore[]> {
    const interactions = await this.buildInteractionMatrix();
    return this.findSimilarUsers(userId, interactions);
  }

  async getSimilarItems(itemId: string): Promise<SimilarityScore[]> {
    const interactions = await this.buildInteractionMatrix();
    return this.findSimilarItems(itemId, interactions);
  }

  async calculatePrediction(userId: string, itemId: string): Promise<number> {
    if (
      this.mfModel &&
      this.mfModel.userFactors.has(userId) &&
      this.mfModel.itemFactors.has(itemId)
    ) {
      return this.predictWithMF(userId, itemId);
    }

    const interactions = await this.buildInteractionMatrix();
    const userInteractions = interactions.users.get(userId);

    if (!userInteractions) {return 0;}

    const similarUsers = await this.findSimilarUsers(userId, interactions);

    let weightedSum = 0;
    let similaritySum = 0;

    for (const similarUser of similarUsers) {
      const otherInteractions = interactions.users.get(similarUser.targetId);
      if (!otherInteractions) {continue;}

      const rating = otherInteractions.get(itemId);
      if (rating === undefined) {continue;}

      weightedSum += similarUser.score * rating;
      similaritySum += similarUser.score;
    }

    if (similaritySum === 0) {return 0;}

    return weightedSum / similaritySum;
  }

  /**
   * 使用矩阵分解进行预测
   */
  private predictWithMF(userId: string, itemId: string): number {
    if (!this.mfModel) {return 0;}

    const userFactor = this.mfModel.userFactors.get(userId);
    const itemFactor = this.mfModel.itemFactors.get(itemId);
    const userBias = this.mfModel.userBias.get(userId) || 0;
    const itemBias = this.mfModel.itemBias.get(itemId) || 0;

    if (!userFactor || !itemFactor) {return 0;}

    let dotProduct = 0;
    for (let i = 0; i < userFactor.length; i++) {
      dotProduct += (userFactor[i] ?? 0) * (itemFactor[i] ?? 0);
    }

    const prediction =
      this.mfModel.globalBias + userBias + itemBias + dotProduct;
    return Math.max(0, Math.min(5, prediction));
  }

  /**
   * 训练矩阵分解模型 (ALS算法)
   */
  async trainMatrixFactorizationModel(): Promise<void> {
    this.logger.log("Training Matrix Factorization model with ALS...");

    const interactions = await this.buildInteractionMatrix();
    const userIds = Array.from(interactions.users.keys());
    const itemIds = Array.from(interactions.items.keys());

    if (userIds.length < 10 || itemIds.length < 10) {
      this.logger.warn("Not enough data for matrix factorization");
      return;
    }

    const { latentFactors, regularization, iterations, alpha } =
      this.ALS_CONFIG;

    const userFactors = new Map<string, number[]>();
    const itemFactors = new Map<string, number[]>();
    const userBias = new Map<string, number>();
    const itemBias = new Map<string, number>();

    for (const userId of userIds) {
      userFactors.set(userId, this.initializeFactors(latentFactors));
      userBias.set(userId, 0);
    }
    for (const itemId of itemIds) {
      itemFactors.set(itemId, this.initializeFactors(latentFactors));
      itemBias.set(itemId, 0);
    }

    let globalBias = 0;
    let totalRating = 0;
    let ratingCount = 0;
    for (const [, items] of interactions.users) {
      for (const [, rating] of items) {
        totalRating += rating;
        ratingCount++;
      }
    }
    if (ratingCount > 0) {
      globalBias = totalRating / ratingCount;
    }

    const confidenceMatrix = this.buildConfidenceMatrix(interactions, alpha);

    for (let iter = 0; iter < iterations; iter++) {
      for (const userId of userIds) {
        const userItems = interactions.users.get(userId);
        if (!userItems) {continue;}

        const newUserFactor = this.solveLeastSquares(
          userFactors.get(userId)!,
          itemFactors,
          userItems,
          userBias.get(userId)!,
          itemBias,
          globalBias,
          regularization,
          confidenceMatrix.get(userId) || new Map(),
        );
        userFactors.set(userId, newUserFactor);

        const newUserBias = this.updateBias(
          userId,
          userItems,
          itemFactors,
          itemBias,
          globalBias,
          regularization,
        );
        userBias.set(userId, newUserBias);
      }

      for (const itemId of itemIds) {
        const itemUsers = interactions.items.get(itemId);
        if (!itemUsers) {continue;}

        const newItemFactor = this.solveLeastSquaresForItem(
          itemFactors.get(itemId)!,
          userFactors,
          itemUsers,
          interactions.users,
          itemBias.get(itemId)!,
          userBias,
          globalBias,
          regularization,
        );
        itemFactors.set(itemId, newItemFactor);

        const newItemBias = this.updateItemBias(
          itemId,
          itemUsers,
          interactions.users,
          userFactors,
          userBias,
          globalBias,
          regularization,
        );
        itemBias.set(itemId, newItemBias);
      }

      if (iter % 5 === 0) {
        const rmse = this.calculateRMSE(
          interactions,
          userFactors,
          itemFactors,
          userBias,
          itemBias,
          globalBias,
        );
        this.logger.debug(`Iteration ${iter}, RMSE: ${rmse.toFixed(4)}`);
      }
    }

    this.mfModel = {
      userFactors,
      itemFactors,
      userBias,
      itemBias,
      globalBias,
      latentFactors,
    };
    this.modelLastTrained = new Date();

    this.logger.log("Matrix Factorization model training completed");
    await this.cacheModelFactors();
  }

  private initializeFactors(size: number): number[] {
    const factors: number[] = [];
    let current = size * 2654435761;
    for (let i = 0; i < size; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      factors.push((((current % 2000) - 1000) / 1000) * 0.05);
    }
    return factors;
  }

  private buildConfidenceMatrix(
    interactions: InteractionMatrix,
    alpha: number,
  ): Map<string, Map<string, number>> {
    const confidence = new Map<string, Map<string, number>>();

    for (const [userId, items] of interactions.users) {
      const userConfidence = new Map<string, number>();
      for (const [itemId, rating] of items) {
        userConfidence.set(itemId, 1 + alpha * rating);
      }
      confidence.set(userId, userConfidence);
    }

    return confidence;
  }

  private solveLeastSquares(
    currentFactors: number[],
    itemFactors: Map<string, number[]>,
    userItems: Map<string, number>,
    userBias: number,
    itemBias: Map<string, number>,
    globalBias: number,
    regularization: number,
    confidence: Map<string, number>,
  ): number[] {
    const k = currentFactors.length;
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < k; i++) {
      A.push(new Array(k).fill(0));
      b.push(0);
    }

    for (const [itemId, rating] of userItems) {
      const itemFactor = itemFactors.get(itemId);
      if (!itemFactor) {continue;}

      const c = confidence.get(itemId) || 1;
      const residual =
        rating - globalBias - userBias - (itemBias.get(itemId) || 0);

      for (let i = 0; i < k; i++) {
        const row = A[i];
        const itemFactorValue = itemFactor[i] ?? 0;
        if (!row) {continue;}
        for (let j = 0; j < k; j++) {
          row[j] = (row[j] ?? 0) + c * itemFactorValue * (itemFactor[j] ?? 0);
        }
        b[i] = (b[i] ?? 0) + c * itemFactorValue * residual;
      }
    }

    for (let i = 0; i < k; i++) {
      const row = A[i];
      if (!row) {continue;}
      row[i] = (row[i] ?? 0) + regularization;
    }

    return this.solveLinearSystem(A, b);
  }

  private solveLeastSquaresForItem(
    currentFactors: number[],
    userFactors: Map<string, number[]>,
    itemUsers: Set<string>,
    allUserItems: Map<string, Map<string, number>>,
    itemBias: number,
    userBias: Map<string, number>,
    globalBias: number,
    regularization: number,
  ): number[] {
    const k = currentFactors.length;
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < k; i++) {
      A.push(new Array(k).fill(0));
      b.push(0);
    }

    for (const userId of itemUsers) {
      const userFactor = userFactors.get(userId);
      const userItems = allUserItems.get(userId);
      if (!userFactor || !userItems) {continue;}

      const rating =
        userItems.get(
          Array.from(userItems.keys()).find((id) => itemUsers.has(id)) || "",
        ) || 0;
      const residual =
        rating - globalBias - itemBias - (userBias.get(userId) || 0);

      for (let i = 0; i < k; i++) {
        const row = A[i];
        const userFactorValue = userFactor[i] ?? 0;
        if (!row) {continue;}
        for (let j = 0; j < k; j++) {
          row[j] = (row[j] ?? 0) + userFactorValue * (userFactor[j] ?? 0);
        }
        b[i] = (b[i] ?? 0) + userFactorValue * residual;
      }
    }

    for (let i = 0; i < k; i++) {
      const row = A[i];
      if (!row) {continue;}
      row[i] = (row[i] ?? 0) + regularization;
    }

    return this.solveLinearSystem(A, b);
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const x = [...b];

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        const candidate = A[k]?.[i] ?? 0;
        const currentMax = A[maxRow]?.[i] ?? 0;
        if (Math.abs(candidate) > Math.abs(currentMax)) {
          maxRow = k;
        }
      }
      const rowI = A[i];
      const rowMax = A[maxRow];
      const xI = x[i] ?? 0;
      const xMax = x[maxRow] ?? 0;
      if (!rowI || !rowMax) {continue;}
      [A[i], A[maxRow]] = [rowMax, rowI];
      [x[i], x[maxRow]] = [xMax, xI];

      const pivot = A[i]?.[i] ?? 0;
      if (Math.abs(pivot) < 1e-10) {continue;}

      for (let k = i + 1; k < n; k++) {
        const rowK = A[k];
        const currentRow = A[i];
        if (!rowK || !currentRow) {continue;}
        const factor = (rowK[i] ?? 0) / (currentRow[i] ?? 1);
        for (let j = i; j < n; j++) {
          rowK[j] = (rowK[j] ?? 0) - factor * (currentRow[j] ?? 0);
        }
        x[k] = (x[k] ?? 0) - factor * (x[i] ?? 0);
      }
    }

    for (let i = n - 1; i >= 0; i--) {
      const row = A[i];
      if (!row) {continue;}
      if (Math.abs(row[i] ?? 0) < 1e-10) {
        x[i] = 0;
        continue;
      }
      for (let j = i + 1; j < n; j++) {
        x[i] = (x[i] ?? 0) - (row[j] ?? 0) * (x[j] ?? 0);
      }
      x[i] = (x[i] ?? 0) / (row[i] ?? 1);
    }

    return x;
  }

  private updateBias(
    userId: string,
    userItems: Map<string, number>,
    itemFactors: Map<string, number[]>,
    itemBias: Map<string, number>,
    globalBias: number,
    regularization: number,
  ): number {
    let sum = 0;
    let count = 0;

    for (const [itemId, rating] of userItems) {
      const itemFactor = itemFactors.get(itemId);
      if (!itemFactor) {continue;}

      sum += rating - globalBias - (itemBias.get(itemId) || 0);
      count++;
    }

    if (count === 0) {return 0;}
    return sum / (count + regularization);
  }

  private updateItemBias(
    itemId: string,
    itemUsers: Set<string>,
    allUserItems: Map<string, Map<string, number>>,
    userFactors: Map<string, number[]>,
    userBias: Map<string, number>,
    globalBias: number,
    regularization: number,
  ): number {
    let sum = 0;
    let count = 0;

    for (const userId of itemUsers) {
      const userItems = allUserItems.get(userId);
      if (!userItems) {continue;}

      const rating = userItems.get(itemId);
      if (rating === undefined) {continue;}

      sum += rating - globalBias - (userBias.get(userId) || 0);
      count++;
    }

    if (count === 0) {return 0;}
    return sum / (count + regularization);
  }

  private calculateRMSE(
    interactions: InteractionMatrix,
    userFactors: Map<string, number[]>,
    itemFactors: Map<string, number[]>,
    userBias: Map<string, number>,
    itemBias: Map<string, number>,
    globalBias: number,
  ): number {
    let sumSquaredError = 0;
    let count = 0;

    for (const [userId, items] of interactions.users) {
      const userFactor = userFactors.get(userId);
      if (!userFactor) {continue;}

      for (const [itemId, rating] of items) {
        const itemFactor = itemFactors.get(itemId);
        if (!itemFactor) {continue;}

        let prediction =
          globalBias +
          (userBias.get(userId) || 0) +
          (itemBias.get(itemId) || 0);
        for (let i = 0; i < userFactor.length; i++) {
          prediction += (userFactor[i] ?? 0) * (itemFactor[i] ?? 0);
        }

        sumSquaredError += Math.pow(rating - prediction, 2);
        count++;
      }
    }

    return count > 0 ? Math.sqrt(sumSquaredError / count) : 0;
  }

  private async cacheModelFactors(): Promise<void> {
    if (!this.mfModel) {return;}

    const client = this.redis.getClient();
    const cacheKey = "mf:model:metadata";
    const fullModelKey = "mf:model:full";

    await client.hset(cacheKey, {
      lastTrained: this.modelLastTrained?.toISOString() || "",
      latentFactors: this.mfModel.latentFactors.toString(),
      globalBias: this.mfModel.globalBias.toString(),
      userCount: this.mfModel.userFactors.size.toString(),
      itemCount: this.mfModel.itemFactors.size.toString(),
    });

    await client.expire(cacheKey, 86400);

    const serialized = {
      userFactors: Array.from(this.mfModel.userFactors.entries()),
      itemFactors: Array.from(this.mfModel.itemFactors.entries()),
      userBias: Array.from(this.mfModel.userBias.entries()),
      itemBias: Array.from(this.mfModel.itemBias.entries()),
      globalBias: this.mfModel.globalBias,
      latentFactors: this.mfModel.latentFactors,
      trainedAt:
        this.modelLastTrained?.toISOString() || new Date().toISOString(),
    };

    await client.setex(fullModelKey, 86400, JSON.stringify(serialized));

    this.logger.debug(
      `MF model cached: ${this.mfModel.userFactors.size} users, ${this.mfModel.itemFactors.size} items`,
    );
  }

  /**
   * 基于矩阵分解的推荐
   */
  async getMFRecommendations(
    userId: string,
    options: { limit?: number; excludeViewed?: boolean } = {},
  ): Promise<RecommendationResult[]> {
    const { limit = 20, excludeViewed = true } = options;

    if (!this.mfModel?.userFactors.has(userId)) {
      return this.getUserBasedRecommendations(userId, options);
    }

    const userFactor = this.mfModel.userFactors.get(userId)!;
    const userBias = this.mfModel.userBias.get(userId) || 0;

    const viewedItems = excludeViewed
      ? await this.getUserViewedItems(userId)
      : new Set<string>();

    const scores: Array<{ itemId: string; score: number; confidence: number }> =
      [];

    for (const [itemId, itemFactor] of this.mfModel.itemFactors) {
      if (viewedItems.has(itemId)) {continue;}

      let dotProduct = 0;
      for (let i = 0; i < userFactor.length; i++) {
        dotProduct += (userFactor[i] ?? 0) * (itemFactor[i] ?? 0);
      }

      const prediction =
        this.mfModel.globalBias +
        userBias +
        (this.mfModel.itemBias.get(itemId) || 0) +
        dotProduct;

      const confidence = this.calculatePredictionConfidence(
        userFactor,
        itemFactor,
      );

      scores.push({
        itemId,
        score: Math.max(0, Math.min(5, prediction)),
        confidence,
      });
    }

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, limit).map((item) => ({
      itemId: item.itemId,
      score: item.score * 20,
      reasons: ["基于您的偏好预测"],
      confidence: item.confidence,
    }));
  }

  private calculatePredictionConfidence(
    userFactor: number[],
    itemFactor: number[],
  ): number {
    let userNorm = 0;
    let itemNorm = 0;
    for (let i = 0; i < userFactor.length; i++) {
      userNorm += (userFactor[i] ?? 0) * (userFactor[i] ?? 0);
      itemNorm += (itemFactor[i] ?? 0) * (itemFactor[i] ?? 0);
    }
    userNorm = Math.sqrt(userNorm);
    itemNorm = Math.sqrt(itemNorm);

    if (userNorm < 0.1 || itemNorm < 0.1) {return 0.3;}

    return Math.min(0.95, 0.5 + (userNorm + itemNorm) / 4);
  }

  private async getUserViewedItems(userId: string): Promise<Set<string>> {
    const behaviors = await this.prisma.userBehavior.findMany({
      where: { userId },
      select: { itemId: true },
    });

    return new Set(behaviors.map((b) => b.itemId).filter(Boolean) as string[]);
  }

  /**
   * 混合推荐：结合协同过滤和矩阵分解
   */
  async getHybridRecommendations(
    userId: string,
    options: { limit?: number; excludeViewed?: boolean } = {},
  ): Promise<RecommendationResult[]> {
    const { limit = 20, excludeViewed = true } = options;

    const [cfResults, mfResults] = await Promise.all([
      this.getUserBasedRecommendations(userId, {
        limit: limit * 2,
        excludeViewed,
      }),
      this.getMFRecommendations(userId, { limit: limit * 2, excludeViewed }),
    ]);

    const mergedScores = new Map<
      string,
      { score: number; reasons: Set<string>; confidence: number }
    >();

    for (const result of cfResults) {
      mergedScores.set(result.itemId, {
        score: result.score * 0.4,
        reasons: new Set(result.reasons),
        confidence: result.confidence || 0.5,
      });
    }

    for (const result of mfResults) {
      const existing = mergedScores.get(result.itemId);
      if (existing) {
        existing.score += result.score * 0.6;
        existing.confidence = Math.max(existing.confidence, result.confidence);
        result.reasons.forEach((r) => existing.reasons.add(r));
      } else {
        mergedScores.set(result.itemId, {
          score: result.score * 0.6,
          reasons: new Set(result.reasons),
          confidence: result.confidence,
        });
      }
    }

    const results = Array.from(mergedScores.entries())
      .map(([itemId, data]) => ({
        itemId,
        score: data.score,
        reasons: Array.from(data.reasons),
        confidence: data.confidence,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * 确保模型已训练
   */
  private async ensureModelTrained(): Promise<void> {
    const now = Date.now();
    if (
      !this.mfModel ||
      !this.modelLastTrained ||
      now - this.modelLastTrained.getTime() > this.MODEL_REFRESH_INTERVAL
    ) {
      await this.trainMatrixFactorizationModel();
    }
  }
}

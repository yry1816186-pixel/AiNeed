/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { allowUnverifiedAiFallbacks } from "../../../../../../../common/config/runtime-flags";
import { PrismaService } from "../../../../../../../common/prisma/prisma.service";

interface MultimodalFeatures {
  visual: number[];
  textual: number[];
  attributes: Record<string, unknown>;
}

interface FusionConfig {
  visualWeight: number;
  textualWeight: number;
  attributeWeight: number;
}

interface CompatibilityScore {
  score: number;
  reasons: string[];
  breakdown: {
    visual: number;
    textual: number;
    attribute: number;
  };
}

@Injectable()
export class MultimodalFusionService {
  private readonly logger = new Logger(MultimodalFusionService.name);
  private aiClient: AxiosInstance;
  private aiServiceAvailable = false;
  private readonly allowFallbacks: boolean;
  private readonly aiServiceUrl: string;

  private readonly defaultConfig: FusionConfig = {
    visualWeight: 0.4,
    textualWeight: 0.35,
    attributeWeight: 0.25,
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.allowFallbacks = allowUnverifiedAiFallbacks(this.configService);

    this.aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8001",
    );

    this.aiClient = axios.create({
      baseURL: this.aiServiceUrl,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    this.checkAiServiceHealth();
  }

  private async checkAiServiceHealth(): Promise<void> {
    try {
      const response = await this.aiClient.get("/health", { timeout: 5000 });
      if (response.data?.status === "healthy") {
        this.aiServiceAvailable = true;
        this.logger.log("AI Service connected for feature extraction");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AI Service not available for multimodal embeddings (${this.aiServiceUrl}): ${errorMessage}`,
      );
      this.aiServiceAvailable = false;
    }
  }

  async extractVisualFeatures(imageUrl: string): Promise<number[]> {
    if (!this.aiServiceAvailable) {
      if (this.allowFallbacks) {
        return this.generateDeterministicEmbedding(512, imageUrl);
      }

      throw new ServiceUnavailableException(
        "AI visual embedding service is unavailable",
      );
    }

    try {
      const response = await this.aiClient.post("/api/embedding", {
        image_url: imageUrl,
      });
      if (
        response.data?.success &&
        Array.isArray(response.data.data?.embedding)
      ) {
        return response.data.data.embedding;
      }
    } catch (error: unknown) {
      this.logger.error(
        `AI visual embedding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.generateDeterministicEmbedding(512, imageUrl);
      }
      throw new ServiceUnavailableException("AI visual embedding failed");
    }

    if (this.allowFallbacks) {
      return this.generateDeterministicEmbedding(512, imageUrl);
    }

    throw new ServiceUnavailableException(
      "AI visual embedding response did not include an embedding",
    );
  }

  async extractTextualFeatures(text: string): Promise<number[]> {
    if (!this.aiServiceAvailable) {
      if (this.allowFallbacks) {
        return this.generateDeterministicEmbedding(300, text);
      }

      throw new ServiceUnavailableException(
        "AI text embedding service is unavailable",
      );
    }

    try {
      const response = await this.aiClient.post("/api/embedding/text", {
        text: text,
      });
      if (
        response.data?.success &&
        Array.isArray(response.data.data?.embedding)
      ) {
        return response.data.data.embedding;
      }
    } catch (error: unknown) {
      this.logger.error(
        `AI text embedding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.generateDeterministicEmbedding(300, text);
      }
      throw new ServiceUnavailableException("AI text embedding failed");
    }

    if (this.allowFallbacks) {
      return this.generateDeterministicEmbedding(300, text);
    }

    throw new ServiceUnavailableException(
      "AI text embedding response did not include an embedding",
    );
  }

  async extractItemFeatures(itemId: string): Promise<MultimodalFeatures> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    const visualFeatures = await this.extractVisualFeatures(
      item.images[0] ?? "",
    );

    const textContent = [
      item.name,
      item.description || "",
      ...((item.attributes as Record<string, unknown>)?.style as string[] || []),
    ].join(" ");
    const textualFeatures = await this.extractTextualFeatures(textContent);

    return {
      visual: visualFeatures,
      textual: textualFeatures,
      attributes: item.attributes as Record<string, unknown>,
    };
  }

  weightedFusion(
    features: MultimodalFeatures,
    config: FusionConfig = this.defaultConfig,
  ): number[] {
    const { visual, textual, attributes } = features;
    const { visualWeight, textualWeight, attributeWeight } = config;

    const visualNormalized = this.normalizeVector(visual);
    const textualNormalized = this.normalizeVector(textual);

    const attributeVector = this.attributesToVector(attributes);
    const attributeNormalized = this.normalizeVector(attributeVector);

    const maxLen = Math.max(
      visualNormalized.length,
      textualNormalized.length,
      attributeNormalized.length,
    );

    const fused = new Array(maxLen).fill(0);

    for (let i = 0; i < maxLen; i++) {
      const v = visualNormalized[i % visualNormalized.length] || 0;
      const t = textualNormalized[i % textualNormalized.length] || 0;
      const a = attributeNormalized[i % attributeNormalized.length] || 0;

      fused[i] = v * visualWeight + t * textualWeight + a * attributeWeight;
    }

    return this.normalizeVector(fused);
  }

  async calculateCompatibility(
    item1Features: MultimodalFeatures,
    item2Features: MultimodalFeatures,
    config?: FusionConfig,
  ): Promise<CompatibilityScore> {
    const visualScore = this.cosineSimilarity(
      item1Features.visual,
      item2Features.visual,
    );

    const textualScore = this.cosineSimilarity(
      item1Features.textual,
      item2Features.textual,
    );

    const attributeScore = this.calculateAttributeCompatibility(
      item1Features.attributes,
      item2Features.attributes,
    );

    const { visualWeight, textualWeight, attributeWeight } =
      config || this.defaultConfig;

    const totalScore =
      visualScore * visualWeight +
      textualScore * textualWeight +
      attributeScore * attributeWeight;

    const reasons = this.generateCompatibilityReasons(
      { visual: visualScore, textual: textualScore, attribute: attributeScore },
      item1Features.attributes,
      item2Features.attributes,
    );

    return {
      score: Math.max(0, Math.min(1, totalScore)),
      reasons,
      breakdown: {
        visual: visualScore,
        textual: textualScore,
        attribute: attributeScore,
      },
    };
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const len = Math.min(vec1.length, vec2.length);

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < len; i++) {
      const value1 = vec1[i] ?? 0;
      const value2 = vec2[i] ?? 0;
      dotProduct += value1 * value2;
      norm1 += value1 * value1;
      norm2 += value2 * value2;
    }

    if (norm1 === 0 || norm2 === 0) {return 0;}
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private normalizeVector(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) {return vec;}
    return vec.map((v) => v / norm);
  }

  private attributesToVector(attributes: Record<string, unknown>): number[] {
    const vector: number[] = [];

    if (attributes.style) {
      const styleEncoding = this.encodeCategory(attributes.style as string[]);
      vector.push(...styleEncoding);
    }

    if (attributes.occasions) {
      const occasionEncoding = this.encodeCategory(attributes.occasions as string[]);
      vector.push(...occasionEncoding);
    }

    if (attributes.season) {
      const seasonEncoding = this.encodeCategory(attributes.season as string[]);
      vector.push(...seasonEncoding);
    }

    if (attributes.patterns) {
      const patternEncoding = this.encodeCategory(attributes.patterns as string[]);
      vector.push(...patternEncoding);
    }

    while (vector.length < 128) {
      vector.push(0);
    }

    return vector.slice(0, 128);
  }

  private encodeCategory(items: string[]): number[] {
    const encoding = new Array(32).fill(0);
    if (!Array.isArray(items)) {return encoding;}

    items.forEach((item, index) => {
      if (index < 32) {
        const hash = this.simpleHash(item);
        encoding[index] = (hash % 1000) / 1000;
      }
    });

    return encoding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private calculateAttributeCompatibility(
    attrs1: Record<string, unknown>,
    attrs2: Record<string, unknown>,
  ): number {
    let score = 0.5;

    if (attrs1.style && attrs2.style) {
      const style1 = attrs1.style as string[];
      const style2 = attrs2.style as string[];
      const commonStyles = style1.filter((s: string) =>
        style2.includes(s),
      );
      score += commonStyles.length * 0.1;
    }

    if (attrs1.occasions && attrs2.occasions) {
      const occ1 = attrs1.occasions as string[];
      const occ2 = attrs2.occasions as string[];
      const commonOccasions = occ1.filter((o: string) =>
        occ2.includes(o),
      );
      score += commonOccasions.length * 0.05;
    }

    if (attrs1.season && attrs2.season) {
      const season1 = attrs1.season as string[];
      const season2 = attrs2.season as string[];
      const commonSeasons = season1.filter((s: string) =>
        season2.includes(s),
      );
      score += commonSeasons.length * 0.05;
    }

    return Math.min(score, 1);
  }

  private generateCompatibilityReasons(
    scores: { visual: number; textual: number; attribute: number },
    attrs1: Record<string, unknown>,
    attrs2: Record<string, unknown>,
  ): string[] {
    const reasons: string[] = [];

    if (scores.visual > 0.7) {
      reasons.push("视觉风格高度匹配");
    }

    if (scores.textual > 0.7) {
      reasons.push("描述语义相似");
    }

    if (attrs1.style && attrs2.style) {
      const style1 = attrs1.style as string[];
      const style2 = attrs2.style as string[];
      const commonStyles = style1.filter((s: string) =>
        style2.includes(s),
      );
      if (commonStyles.length > 0) {
        reasons.push(`共同风格: ${commonStyles.join(", ")}`);
      }
    }

    if (attrs1.occasions && attrs2.occasions) {
      const occ1 = attrs1.occasions as string[];
      const occ2 = attrs2.occasions as string[];
      const commonOccasions = occ1.filter((o: string) =>
        occ2.includes(o),
      );
      if (commonOccasions.length > 0) {
        reasons.push(`适合场合: ${commonOccasions.join(", ")}`);
      }
    }

    if (reasons.length === 0) {
      reasons.push("风格互补搭配");
    }

    return reasons.slice(0, 3);
  }

  private generateDeterministicEmbedding(dim: number, seed: string): number[] {
    const embedding: number[] = [];
    const hash = this.simpleHash(seed);
    let current = hash;

    for (let i = 0; i < dim; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      embedding.push(((current % 2000) - 1000) / 1000);
    }

    return embedding;
  }

  async batchExtractFeatures(
    itemIds: string[],
  ): Promise<Map<string, MultimodalFeatures>> {
    const featuresMap = new Map<string, MultimodalFeatures>();

    await Promise.all(
      itemIds.map(async (id) => {
        const features = await this.extractItemFeatures(id);
        featuresMap.set(id, features);
      }),
    );

    return featuresMap;
  }

  async findCompatibleItems(
    queryItemId: string,
    candidateIds: string[],
    topK: number = 10,
  ): Promise<Array<{ itemId: string; score: CompatibilityScore }>> {
    const queryFeatures = await this.extractItemFeatures(queryItemId);
    const candidatesFeatures = await this.batchExtractFeatures(candidateIds);

    const results = await Promise.all(
      candidateIds.map(async (id) => {
        const features = candidatesFeatures.get(id);
        if (!features) {return null;}

        const score = await this.calculateCompatibility(
          queryFeatures,
          features,
        );
        return { itemId: id, score };
      }),
    );

    return results
      .filter(
        (r): r is { itemId: string; score: CompatibilityScore } => r !== null,
      )
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, topK);
  }
}

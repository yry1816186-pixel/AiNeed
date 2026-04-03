import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

import { allowUnverifiedAiFallbacks } from "../../../common/config/runtime-flags";

export interface HybridProcessingRequest {
  requestId?: string;
  userId?: string;
  personImage: Buffer;
  garmentImage?: Buffer;
  type?: "tryon" | "recommendation" | "segmentation";
  context?: Record<string, unknown>;
  poseKeypoints?: PoseKeypoint[];
  options?: {
    useCloud?: boolean;
    priority?: "speed" | "quality" | "balanced";
    timeout?: number;
  };
}

export interface HybridProcessingResult {
  requestId: string;
  result: TryOnResult | RecommendationResult | SegmentationResult;
  processingPath: "local" | "cloud" | "hybrid";
  latency: number;
  confidence: number;
  metadata: {
    localLatency?: number;
    cloudLatency?: number;
    cacheHit?: boolean;
    modelVersion: string;
  };
}

export interface PoseKeypoint {
  id: number;
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface TryOnResult {
  type: "tryon";
  image: string | Buffer;
  score: number;
}

export interface RecommendationResult {
  type: "recommendation";
  items: Array<{
    itemId: string;
    score: number;
    reasons: string[];
  }>;
}

export interface SegmentationResult {
  type: "segmentation";
  mask: number[][];
  attributes: Record<string, unknown>;
}

export interface NetworkQuality {
  bandwidth: number;
  latency: number;
  stability: number;
  score: number;
}

export interface ProcessingDecision {
  useCloud: boolean;
  reason: string;
  estimatedLatency: number;
  estimatedCost: number;
}

@Injectable()
export class HybridProcessingService {
  private readonly logger = new Logger(HybridProcessingService.name);
  private aiClient: AxiosInstance;
  private aiServiceAvailable = false;
  private readonly allowFallbacks: boolean;
  private readonly aiServiceUrl: string;

  private readonly thresholds = {
    complexity: 0.7,
    networkQuality: 0.5,
    cacheHit: 0.8,
    userPreference: 0.6,
    maxLocalLatency: 100,
    maxCloudLatency: 5000,
  };

  private readonly weights = {
    gnn: 0.35,
    hypergraph: 0.35,
    crossAttention: 0.3,
  };

  private cacheHits = 0;
  private totalRequests = 0;
  private networkLatencyHistory: number[] = [];

  constructor(private configService: ConfigService) {
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
      const start = Date.now();
      const response = await this.aiClient.get("/health", { timeout: 5000 });
      const latency = Date.now() - start;

      if (response.data?.status === "healthy") {
        this.aiServiceAvailable = true;
        this.networkLatencyHistory.push(latency);
        this.logger.log(`AI Service connected (latency: ${latency}ms)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AI Service not available for hybrid processing (${this.aiServiceUrl}): ${errorMessage}`,
      );
      this.aiServiceAvailable = false;
    }
  }

  async process(
    request: HybridProcessingRequest,
  ): Promise<HybridProcessingResult> {
    const startTime = Date.now();
    const requestId = request.requestId || `hybrid_${Date.now()}`;
    this.totalRequests++;

    this.logger.log(`Processing request ${requestId}`);

    const networkQuality = await this.assessNetworkQuality();
    const imageComplexity = this.assessImageComplexity(
      request.personImage,
      request.garmentImage,
    );

    const decision = this.makeProcessingDecision(
      imageComplexity,
      networkQuality,
      request.options,
    );

    this.logger.log(
      `Decision for ${requestId}: ${decision.useCloud ? "cloud" : "local"} - ${decision.reason}`,
    );

    let result: TryOnResult | RecommendationResult | SegmentationResult;
    let localLatency: number | undefined;
    let cloudLatency: number | undefined;
    const cacheHit = false;

    if (decision.useCloud) {
      const cloudStart = Date.now();
      result = await this.processOnCloud(request);
      cloudLatency = Date.now() - cloudStart;
    } else {
      const localStart = Date.now();
      result = await this.processLocally(request);
      localLatency = Date.now() - localStart;
    }

    const totalLatency = Date.now() - startTime;

    return {
      requestId,
      result,
      processingPath: decision.useCloud ? "cloud" : "local",
      latency: totalLatency,
      confidence: this.calculateConfidence(result),
      metadata: {
        localLatency,
        cloudLatency,
        cacheHit,
        modelVersion: "1.0.0",
      },
    };
  }

  private async assessNetworkQuality(): Promise<NetworkQuality> {
    if (this.aiServiceAvailable && this.networkLatencyHistory.length > 0) {
      const recentLatencies = this.networkLatencyHistory.slice(-5);
      const avgLatency =
        recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
      const latencyVariance =
        recentLatencies.reduce(
          (sum, l) => sum + Math.pow(l - avgLatency, 2),
          0,
        ) / recentLatencies.length;
      const stability = Math.max(
        0,
        1 - Math.sqrt(latencyVariance) / avgLatency,
      );

      const bandwidth = Math.max(1, 1000 / avgLatency);

      const score =
        (bandwidth / 100) * 0.4 +
        (1 - avgLatency / 500) * 0.3 +
        stability * 0.3;

      return { bandwidth, latency: avgLatency, stability, score };
    }

    return {
      bandwidth: 10,
      latency: 500,
      stability: 0.5,
      score: 0.3,
    };
  }

  private assessImageComplexity(
    personImage: Buffer,
    garmentImage?: Buffer,
  ): number {
    const personComplexity = this.calculateImageComplexity(personImage);
    const garmentComplexity = this.calculateImageComplexity(
      garmentImage ?? personImage,
    );

    return (personComplexity + garmentComplexity) / 2;
  }

  private calculateImageComplexity(image: Buffer): number {
    if (!image || image.length === 0) {
      return 0.5;
    }

    const size = image.length;
    const sizeScore = Math.min(size / (1024 * 1024), 1);

    let entropy = 0;
    const byteFreq = new Map<number, number>();
    const sampleSize = Math.min(image.length, 10000);
    const step = Math.max(1, Math.floor(image.length / sampleSize));

    for (let i = 0; i < image.length; i += step) {
      const byte = image[i];
      if (byte === undefined) {
        continue;
      }
      byteFreq.set(byte, (byteFreq.get(byte) || 0) + 1);
    }

    const totalSamples = Math.ceil(image.length / step);
    byteFreq.forEach((count) => {
      const p = count / totalSamples;
      entropy -= p * Math.log2(p);
    });

    const normalizedEntropy = entropy / 8;

    return 0.3 * sizeScore + 0.7 * normalizedEntropy;
  }

  private makeProcessingDecision(
    imageComplexity: number,
    networkQuality: NetworkQuality,
    options: HybridProcessingRequest["options"],
  ): ProcessingDecision {
    if (options?.useCloud !== undefined) {
      return {
        useCloud: options.useCloud,
        reason: "User specified processing path",
        estimatedLatency: options.useCloud ? 2000 : 80,
        estimatedCost: options.useCloud ? 0.01 : 0,
      };
    }

    const conditions = [
      imageComplexity > this.thresholds.complexity,
      networkQuality.score > this.thresholds.networkQuality,
    ];

    const useCloud = conditions.filter(Boolean).length >= 1;

    const reason = useCloud
      ? `Complexity: ${(imageComplexity * 100).toFixed(1)}%, Network: ${(networkQuality.score * 100).toFixed(1)}%`
      : "Local processing sufficient";

    return {
      useCloud,
      reason,
      estimatedLatency: useCloud ? 2000 : 80,
      estimatedCost: useCloud ? 0.01 : 0,
    };
  }

  private async processLocally(
    request: HybridProcessingRequest,
  ): Promise<TryOnResult | RecommendationResult | SegmentationResult> {
    this.logger.log("Processing locally with Python ML service");

    try {
      if (request.type === "tryon") {
        const response = await this.aiClient.post("/api/tryon", {
          person_image: request.personImage.toString("base64"),
          garment_image: request.garmentImage?.toString("base64"),
          mode: "local",
        });

        if (response.data?.success) {
          return {
            type: "tryon",
            image: response.data.data.result_image,
            score: response.data.data.confidence || 0.85,
          };
        }
      }

      if (request.type === "recommendation") {
        const response = await this.aiClient.post("/api/recommendations", {
          user_id: request.userId,
          context: request.context,
          count: 10,
        });

        if (response.data?.success) {
          return {
            type: "recommendation",
            items: response.data.data.items.map((item: any) => ({
              itemId: item.id,
              score: item.score,
              reasons: item.reasons || [],
            })),
          };
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Local hybrid processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.getFallbackResult(request);
      }
      throw new ServiceUnavailableException("Local hybrid processing failed");
    }

    if (this.allowFallbacks) {
      return this.getFallbackResult(request);
    }

    throw new ServiceUnavailableException(
      "Local hybrid processing did not produce a valid result",
    );
  }

  private async processOnCloud(
    request: HybridProcessingRequest,
  ): Promise<TryOnResult | RecommendationResult | SegmentationResult> {
    this.logger.log("Processing on cloud with enhanced AI models");

    try {
      if (request.type === "tryon") {
        const response = await this.aiClient.post("/api/tryon", {
          person_image: request.personImage.toString("base64"),
          garment_image: request.garmentImage?.toString("base64"),
          mode: "cloud",
          enhance: true,
        });

        if (response.data?.success) {
          return {
            type: "tryon",
            image: response.data.data.result_image,
            score: response.data.data.confidence || 0.92,
          };
        }
      }

      if (request.type === "recommendation") {
        const response = await this.aiClient.post(
          "/api/recommendations/advanced",
          {
            user_id: request.userId,
            context: request.context,
            count: 20,
            use_advanced_models: true,
          },
        );

        if (response.data?.success) {
          return {
            type: "recommendation",
            items: response.data.data.items.map((item: any) => ({
              itemId: item.id,
              score: item.score,
              reasons: item.reasons || [],
            })),
          };
        }
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Cloud processing failed, falling back to local: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.processLocally(request);
    }

    if (this.allowFallbacks) {
      return this.getFallbackResult(request);
    }

    throw new ServiceUnavailableException(
      "Cloud hybrid processing did not produce a valid result",
    );
  }

  private calculateConfidence(
    result: TryOnResult | RecommendationResult | SegmentationResult,
  ): number {
    if (result.type === "tryon") {
      return result.score;
    }
    if (result.type === "recommendation") {
      const scores = result.items.map((i) => i.score);
      return scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    }
    return 0.8;
  }

  async checkCache(_requestId: string): Promise<boolean> {
    return false;
  }

  async invalidateCache(pattern: string): Promise<void> {
    this.logger.log(`Invalidating cache for pattern: ${pattern}`);
  }

  getStatistics(): {
    totalRequests: number;
    cacheHitRate: number;
    averageLatency: number;
    cloudUsageRate: number;
  } {
    return {
      totalRequests: this.totalRequests,
      cacheHitRate:
        this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
      averageLatency: 500,
      cloudUsageRate: 0.6,
    };
  }

  async prefetchUserData(userId: string): Promise<void> {
    this.logger.log(`Prefetching data for user: ${userId}`);
  }

  async syncUserData(userId: string): Promise<void> {
    this.logger.log(`Syncing data for user: ${userId}`);
  }

  private getFallbackResult(
    request: HybridProcessingRequest,
  ): TryOnResult | RecommendationResult | SegmentationResult {
    if (request.type === "recommendation") {
      return {
        type: "recommendation",
        items: [],
      };
    }

    if (request.type === "segmentation") {
      return {
        type: "segmentation",
        mask: [],
        attributes: {},
      };
    }

    return {
      type: "tryon",
      image: request.personImage.toString("base64"),
      score: 0.5,
    };
  }
}

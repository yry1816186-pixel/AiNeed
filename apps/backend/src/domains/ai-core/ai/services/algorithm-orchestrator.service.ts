/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

import {
  CloudCommunicationService,
  CloudTask,
} from "./cloud-communication.service";
import {
  HybridProcessingService,
  HybridProcessingRequest,
} from "./hybrid-processing.service";
import {
  UNetSegmentationService,
  SegmentationResult,
} from "./unet-segmentation.service";

export interface AlgorithmPipelineConfig {
  enableLocalProcessing: boolean;
  enableCloudProcessing: boolean;
  preferQuality: boolean;
  maxLatency: number;
  cacheResults: boolean;
}

export interface PipelineResult {
  success: boolean;
  data: unknown;
  algorithm: string;
  processingPath: "local" | "cloud" | "hybrid";
  latency: number;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface TryOnPipelineInput {
  userId: string;
  personImage: Buffer;
  garmentImage: Buffer;
  category: string;
  options?: Partial<AlgorithmPipelineConfig>;
}

export interface RecommendationPipelineInput {
  userId: string;
  context: {
    currentItemId?: string;
    category?: string;
    season?: string;
    occasion?: string;
  };
  options?: Partial<AlgorithmPipelineConfig>;
}

export interface SegmentationPipelineInput {
  image: Buffer;
  category: string;
  options?: Partial<AlgorithmPipelineConfig>;
}

export interface CompatibilityPipelineInput {
  items: Array<{
    id: string;
    features: number[];
    category: string;
  }>;
  options?: Partial<AlgorithmPipelineConfig>;
}

@Injectable()
export class AlgorithmOrchestratorService {
  private readonly logger = new Logger(AlgorithmOrchestratorService.name);

  private readonly defaultConfig: AlgorithmPipelineConfig = {
    enableLocalProcessing: true,
    enableCloudProcessing: true,
    preferQuality: false,
    maxLatency: 10000,
    cacheResults: true,
  };

  constructor(
    private unetSegmentation: UNetSegmentationService,
    private hybridProcessing: HybridProcessingService,
    private cloudCommunication: CloudCommunicationService,
  ) {}

  async executeTryOnPipeline(
    input: TryOnPipelineInput,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...input.options };

    this.logger.log(`Starting try-on pipeline for user ${input.userId}`);

    try {
      const segmentationResult = await this.unetSegmentation.segmentClothing(
        input.personImage,
      );

      const hybridRequest: HybridProcessingRequest = {
        requestId: `tryon_${Date.now()}`,
        userId: input.userId,
        personImage: input.personImage,
        garmentImage: input.garmentImage,
        poseKeypoints: this.extractPoseKeypoints(segmentationResult),
        options: {
          useCloud: config.enableCloudProcessing && config.preferQuality,
          priority: config.preferQuality ? "quality" : "balanced",
          timeout: config.maxLatency,
        },
      };

      const hybridResult = await this.hybridProcessing.process(hybridRequest);

      const latency = Date.now() - startTime;

      return {
        success: true,
        data: hybridResult.result,
        algorithm: "diffusion_tryon",
        processingPath: hybridResult.processingPath,
        latency,
        confidence: hybridResult.confidence,
        metadata: {
          segmentationConfidence: segmentationResult.confidence,
          ...hybridResult.metadata,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error("Try-on pipeline failed:", error);

      return {
        success: false,
        data: null,
        algorithm: "diffusion_tryon",
        processingPath: "local",
        latency,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async executeRecommendationPipeline(
    input: RecommendationPipelineInput,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...input.options };

    this.logger.log(
      `Starting recommendation pipeline for user ${input.userId}`,
    );

    try {
      const taskType: CloudTask["type"] = "recommendation";

      if (config.enableCloudProcessing) {
        const taskId = await this.cloudCommunication.submitTask(
          taskType,
          {
            userId: input.userId,
            context: input.context,
          },
          "normal",
        );

        const result = await this.cloudCommunication.getTaskResult(
          taskId,
          config.maxLatency,
        );

        const latency = Date.now() - startTime;

        return {
          success: true,
          data: result,
          algorithm: "gnn_hypergraph_compatibility",
          processingPath: "cloud",
          latency,
          confidence: result?.confidence || 0.8,
          metadata: { taskId },
        };
      }

      throw new Error(
        "Recommendation pipeline requires cloud processing or a verified local recommender",
      );
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error("Recommendation pipeline failed:", error);

      return {
        success: false,
        data: null,
        algorithm: "gnn_hypergraph_compatibility",
        processingPath: "local",
        latency,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async executeSegmentationPipeline(
    input: SegmentationPipelineInput,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...input.options };

    this.logger.log(
      `Starting segmentation pipeline for category ${input.category}`,
    );

    try {
      const result = await this.unetSegmentation.segmentClothing(input.image);

      const latency = Date.now() - startTime;

      return {
        success: true,
        data: {
          mask: result.mask,
          attributes: result.attributes,
          boundingBox: result.boundingBox,
        },
        algorithm: "unet_eca_attention",
        processingPath: "local",
        latency,
        confidence: result.confidence,
        metadata: {
          maskSize: result.mask.length,
        },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error("Segmentation pipeline failed:", error);

      return {
        success: false,
        data: null,
        algorithm: "unet_eca_attention",
        processingPath: "local",
        latency,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  async executeCompatibilityPipeline(
    input: CompatibilityPipelineInput,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...input.options };

    this.logger.log(
      `Starting compatibility pipeline for ${input.items.length} items`,
    );

    try {
      if (config.enableCloudProcessing) {
        const taskId = await this.cloudCommunication.submitTask(
          "compatibility",
          {
            items: input.items,
          },
          "normal",
        );

        const result = await this.cloudCommunication.getTaskResult(
          taskId,
          config.maxLatency,
        );

        const latency = Date.now() - startTime;

        return {
          success: true,
          data: result,
          algorithm: "gnn_hypergraph",
          processingPath: "cloud",
          latency,
          confidence: result?.confidence || 0.85,
          metadata: { taskId, itemCount: input.items.length },
        };
      }

      const compatibilityScore = this.calculateLocalCompatibility(input.items);

      const latency = Date.now() - startTime;

      return {
        success: true,
        data: { score: compatibilityScore, pairs: [] },
        algorithm: "gnn_hypergraph",
        processingPath: "local",
        latency,
        confidence: 0.7,
        metadata: { itemCount: input.items.length, mode: "local_heuristic" },
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error("Compatibility pipeline failed:", error);

      return {
        success: false,
        data: null,
        algorithm: "gnn_hypergraph",
        processingPath: "local",
        latency,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private extractPoseKeypoints(segmentationResult: SegmentationResult): Array<{
    id: number;
    x: number;
    y: number;
    z: number;
    visibility: number;
  }> {
    const keypoints: Array<{
      id: number;
      x: number;
      y: number;
      z: number;
      visibility: number;
    }> = [];

    if (segmentationResult.boundingBox) {
      const { x, y, width, height } = segmentationResult.boundingBox;

      keypoints.push(
        { id: 0, x: x + width / 2, y: y, z: 0, visibility: 0.9 },
        { id: 1, x: x + width / 2, y: y + height / 3, z: 0, visibility: 0.9 },
        {
          id: 2,
          x: x + width / 2,
          y: y + (height * 2) / 3,
          z: 0,
          visibility: 0.9,
        },
        { id: 3, x: x + width / 2, y: y + height, z: 0, visibility: 0.9 },
        { id: 4, x: x, y: y + height / 2, z: 0, visibility: 0.8 },
        { id: 5, x: x + width, y: y + height / 2, z: 0, visibility: 0.8 },
      );
    }

    return keypoints;
  }

  private calculateLocalCompatibility(
    items: CompatibilityPipelineInput["items"],
  ): number {
    if (items.length < 2) {return 1.0;}

    let totalScore = 0;
    let pairCount = 0;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const currentItem = items[i];
        const compareItem = items[j];
        if (!currentItem || !compareItem) {
          continue;
        }
        const similarity = this.cosineSimilarity(
          currentItem.features,
          compareItem.features,
        );
        const categoryBonus =
          currentItem.category !== compareItem.category ? 0.1 : -0.1;
        totalScore += similarity + categoryBonus;
        pairCount++;
      }
    }

    return Math.max(0, Math.min(1, totalScore / pairCount));
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {return 0;}

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      const value1 = vec1[i] ?? 0;
      const value2 = vec2[i] ?? 0;
      dotProduct += value1 * value2;
      norm1 += value1 * value1;
      norm2 += value2 * value2;
    }

    if (norm1 === 0 || norm2 === 0) {return 0;}

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  async getSystemStatus(): Promise<{
    algorithms: Record<string, { status: string; lastUsed: Date | null }>;
    cloudConnection: boolean;
    queueStats: Record<string, number>;
  }> {
    const connectionStatus = this.cloudCommunication.getConnectionStatus();
    const queueStats = this.cloudCommunication.getQueueStats();

    return {
      algorithms: {
        unet_segmentation: { status: "ready", lastUsed: null },
        diffusion_tryon: { status: "ready", lastUsed: null },
        gnn_compatibility: { status: "ready", lastUsed: null },
        hypergraph_outfit: { status: "ready", lastUsed: null },
      },
      cloudConnection: connectionStatus.connected,
      queueStats: {
        total: queueStats.total,
        pending: queueStats.pending,
        processing: queueStats.processing,
        completed: queueStats.completed,
        failed: queueStats.failed,
      },
    };
  }

  async prefetchUserData(userId: string): Promise<void> {
    await this.cloudCommunication.prefetchUserData(userId);
    this.logger.log(`Prefetched data for user ${userId}`);
  }

  async batchProcess(
    tasks: Array<{
      type: "tryon" | "recommendation" | "segmentation" | "compatibility";
      input: TryOnPipelineInput | RecommendationPipelineInput | SegmentationPipelineInput | CompatibilityPipelineInput;
    }>,
  ): Promise<PipelineResult[]> {
    const results: PipelineResult[] = [];

    for (const task of tasks) {
      let result: PipelineResult;

      switch (task.type) {
        case "tryon":
          result = await this.executeTryOnPipeline(task.input as TryOnPipelineInput);
          break;
        case "recommendation":
          result = await this.executeRecommendationPipeline(task.input as RecommendationPipelineInput);
          break;
        case "segmentation":
          result = await this.executeSegmentationPipeline(task.input as SegmentationPipelineInput);
          break;
        case "compatibility":
          result = await this.executeCompatibilityPipeline(task.input as CompatibilityPipelineInput);
          break;
        default:
          result = {
            success: false,
            data: null,
            algorithm: "unknown",
            processingPath: "local",
            latency: 0,
            confidence: 0,
            metadata: { error: "Unknown task type" },
          };
      }

      results.push(result);
    }

    return results;
  }
}

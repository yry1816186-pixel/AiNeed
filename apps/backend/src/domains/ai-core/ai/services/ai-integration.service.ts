import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClothingCategory, Prisma } from "@prisma/client";
import axios, { AxiosInstance } from "axios";

import { allowUnverifiedAiFallbacks } from "../../../../common/config/runtime-flags";
import { PrismaService } from "../../../../common/prisma/prisma.service";

export interface AIAnalysisResult {
  success: boolean;
  category: string;
  style: string[];
  colors: string[];
  occasions: string[];
  seasons: string[];
  confidence: number;
  embedding?: number[];
  error?: string;
}

export interface BodyAnalysisResult {
  success: boolean;
  bodyType: string;
  skinTone: string;
  colorSeason: string;
  recommendations: {
    suitable: string[];
    avoid: string[];
    tips: string[];
  };
  error?: string;
}

export interface SimilarItem {
  itemId: string;
  score: number;
  category: string;
  style: string[];
  colors: string[];
  reasons: string[];
}

export interface OutfitRecommendation {
  [category: string]: SimilarItem[];
}

export interface ColorRecommendation {
  bestColors: string[];
  avoidColors: string[];
  metalTone: string;
}

export interface AIStats {
  totalItems: number;
  totalEmbeddings: number;
  lastUpdateTime: string;
  modelVersion: string;
  [key: string]: unknown;
}

@Injectable()
export class AIIntegrationService implements OnModuleInit {
  private readonly logger = new Logger(AIIntegrationService.name);
  private aiClient!: AxiosInstance;
  private readonly aiServiceUrl: string;
  private readonly allowFallbacks: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.allowFallbacks = allowUnverifiedAiFallbacks(this.configService);
    this.aiServiceUrl = this.configService.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:8001",
    );
  }

  async onModuleInit() {
    this.aiClient = axios.create({
      baseURL: this.aiServiceUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    await this.checkConnection();
  }

  private async checkConnection(): Promise<boolean> {
    try {
      const response = await this.aiClient.get("/health");
      this.logger.log(`AI服务连接成功: ${response.data.status}`);
      return true;
    } catch {
      this.logger.warn("AI服务未启动，已禁用未验证 fallback");
      return false;
    }
  }

  async analyzeImage(imagePath: string): Promise<AIAnalysisResult> {
    try {
      const response = await this.aiClient.post("/api/analyze/path", {
        image_path: imagePath,
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `图像分析失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.getFallbackAnalysis();
      }
      throw new ServiceUnavailableException("图像分析服务不可用");
    }
  }

  async analyzeImageBuffer(imageBuffer: Buffer): Promise<AIAnalysisResult> {
    try {
      const base64 = imageBuffer.toString("base64");

      const response = await this.aiClient.post("/api/analyze/path", {
        image_base64: base64,
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `图像分析失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.getFallbackAnalysis();
      }
      throw new ServiceUnavailableException("图像分析服务不可用");
    }
  }

  async analyzeBody(imagePath: string): Promise<BodyAnalysisResult> {
    try {
      const response = await this.aiClient.post("/api/body-analysis", {
        image_path: imagePath,
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `体型分析失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.getFallbackBodyAnalysis();
      }
      throw new ServiceUnavailableException("体型分析服务不可用");
    }
  }

  async analyzeBodyBuffer(imageBuffer: Buffer): Promise<BodyAnalysisResult> {
    try {
      const response = await this.aiClient.post("/api/body-analysis", {
        image_base64: imageBuffer.toString("base64"),
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `体型分析失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.getFallbackBodyAnalysis();
      }
      throw new ServiceUnavailableException("体型分析服务不可用");
    }
  }

  async findSimilarItems(
    imagePath: string,
    topK: number = 10,
    categoryFilter?: ClothingCategory,
  ): Promise<SimilarItem[]> {
    try {
      const response = await this.aiClient.post("/api/similar", {
        image_path: imagePath,
        top_k: topK,
        category_filter: categoryFilter,
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `相似搜索失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return [];
      }
      throw new ServiceUnavailableException("相似搜索服务不可用");
    }
  }

  async findSimilarItemsBuffer(
    imageBuffer: Buffer,
    topK: number = 10,
    categoryFilter?: ClothingCategory,
  ): Promise<SimilarItem[]> {
    try {
      const response = await this.aiClient.post("/api/similar", {
        image_base64: imageBuffer.toString("base64"),
        top_k: topK,
        category_filter: categoryFilter,
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(`相似搜索失败: ${this.getErrorMessage(error)}`);
      if (this.allowFallbacks) {
        return [];
      }
      throw new ServiceUnavailableException("相似搜索服务不可用");
    }
  }

  async findSimilarItemsForItem(
    itemId: string,
    topK: number = 10,
    categoryFilter?: ClothingCategory,
  ): Promise<SimilarItem[]> {
    const item = await this.prisma.clothingItem.findUnique({
      where: { id: itemId },
      select: { images: true },
    });

    if (!item?.images?.length) {
      this.logger.warn(`商品 ${itemId} 缺少可用于相似搜索的图片`);
      return [];
    }

    return this.findSimilarItems(item.images[0]!, topK, categoryFilter);
  }

  async recommendOutfit(
    baseItemId: string,
    userBodyType?: string,
    occasion?: string,
    topK: number = 5,
  ): Promise<OutfitRecommendation> {
    try {
      const response = await this.aiClient.post("/api/outfit", {
        base_item_id: baseItemId,
        user_body_type: userBodyType,
        occasion,
        top_k: topK,
      });

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `搭配推荐失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return {};
      }
      throw new ServiceUnavailableException("搭配推荐服务不可用");
    }
  }

  async getColorRecommendations(
    colorSeason: string,
    category?: string,
  ): Promise<ColorRecommendation> {
    try {
      const response = await this.aiClient.get(
        `/api/colors/${encodeURIComponent(colorSeason)}`,
        {
          params: {
            category,
          },
        },
      );

      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(
        `色彩推荐失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (this.allowFallbacks) {
        return this.getFallbackColorRecommendations(colorSeason);
      }
      throw new ServiceUnavailableException("色彩推荐服务不可用");
    }
  }

  async getItemEmbedding(itemId: string): Promise<number[] | null> {
    try {
      const response = await this.aiClient.get(`/api/items/${itemId}`);
      return response.data.data?.embedding || null;
    } catch (error: unknown) {
      this.logger.error(`获取嵌入向量失败: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async getStats(): Promise<AIStats | null> {
    try {
      const response = await this.aiClient.get("/api/stats");
      return response.data.data;
    } catch (error: unknown) {
      this.logger.error(`获取统计信息失败: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  async enrichItemWithAI(itemId: string, imagePath: string): Promise<void> {
    try {
      const analysis = await this.analyzeImage(imagePath);

      if (analysis.success) {
        await this.prisma.clothingItem.update({
          where: { id: itemId },
          data: {
            attributes: {
              style: analysis.style,
              occasions: analysis.occasions,
              seasons: analysis.seasons,
              colors: analysis.colors,
              confidence: analysis.confidence,
            },
          },
        });

        this.logger.log(`商品 ${itemId} 已更新AI分析结果`);
      }
    } catch (error: unknown) {
      this.logger.error(`商品AI增强失败: ${this.getErrorMessage(error)}`);
    }
  }

  async batchEnrichItems(limit: number = 100): Promise<number> {
    const items = await this.prisma.clothingItem.findMany({
      where: {
        OR: [{ attributes: { equals: {} } }, { attributes: { equals: Prisma.DbNull } }],
      },
      take: limit,
    });

    let enriched = 0;

    for (const item of items) {
      if (item.images && item.images.length > 0) {
        await this.enrichItemWithAI(item.id, item.images[0]!);
        enriched++;
      }
    }

    this.logger.log(`批量增强完成: ${enriched}/${items.length}`);
    return enriched;
  }

  private getFallbackAnalysis(): AIAnalysisResult {
    return {
      success: false,
      category: "tops",
      style: ["casual"],
      colors: ["unknown"],
      occasions: ["daily"],
      seasons: ["spring", "summer", "autumn", "winter"],
      confidence: 0.5,
      error: "AI服务不可用",
    };
  }

  private getFallbackBodyAnalysis(): BodyAnalysisResult {
    return {
      success: false,
      bodyType: "rectangle",
      skinTone: "medium",
      colorSeason: "summer",
      recommendations: {
        suitable: ["fitted", "structured"],
        avoid: ["oversized"],
        tips: ["选择合身的款式"],
      },
      error: "AI服务不可用",
    };
  }

  private getFallbackColorRecommendations(colorSeason: string): ColorRecommendation {
    const defaultRecommendation: ColorRecommendation = {
      bestColors: ["lavender", "soft pink", "powder blue"],
      avoidColors: ["bright orange", "mustard"],
      metalTone: "silver",
    };

    const recommendations: Record<string, ColorRecommendation> = {
      spring: {
        bestColors: ["coral", "peach", "golden yellow", "cream"],
        avoidColors: ["black", "burgundy"],
        metalTone: "gold",
      },
      summer: defaultRecommendation,
      autumn: {
        bestColors: ["rust", "olive", "camel", "mustard"],
        avoidColors: ["bright pink", "pure white"],
        metalTone: "gold",
      },
      winter: {
        bestColors: ["pure white", "black", "true red", "royal blue"],
        avoidColors: ["orange", "beige"],
        metalTone: "silver",
      },
    };

    return recommendations[colorSeason] ?? defaultRecommendation;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.aiClient.get("/health");
      return response.data.status === "healthy";
    } catch {
      return false;
    }
  }

  /**
   * 检查 Body Analysis 服务健康状态
   */
  async isBodyAnalysisHealthy(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await this.aiClient.get("/health/body-analysis");
      return {
        available: response.data.status === "healthy",
        error: response.data.error,
      };
    } catch (error) {
      return {
        available: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

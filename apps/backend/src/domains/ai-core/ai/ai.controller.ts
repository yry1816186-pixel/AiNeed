/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ClothingCategory } from "@prisma/client";

import { Public } from "../../platform/auth/decorators/public.decorator";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";

import { AIIntegrationService } from "./services/ai-integration.service";

/** 文件上传配置：10MB 大小限制 + 图片 MIME 白名单 */
const IMAGE_UPLOAD_OPTIONS = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter(
    _req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new BadRequestException("仅支持 JPEG、PNG 和 WebP 格式的图片"), false);
    }
  },
};

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIIntegrationService) {}

  @Get("health")
  @Public()
  @ApiOperation({ summary: "AI服务健康检查", description: "检查AI服务的连接状态" })
  @ApiResponse({ status: 200, description: "健康状态" })
  async checkHealth() {
    const isHealthy = await this.aiService.isHealthy();
    return {
      status: isHealthy ? "healthy" : "degraded",
      aiService: isHealthy ? "connected" : "disconnected",
    };
  }

  @Get("health/body-analysis")
  @Public()
  @ApiOperation({ summary: "Body Analysis服务健康检查", description: "检查人体数据分析ML服务的连接状态" })
  @ApiResponse({ status: 200, description: "Body Analysis服务健康状态" })
  async checkBodyAnalysisHealth() {
    const health = await this.aiService.isBodyAnalysisHealthy();
    return {
      status: health.available ? "healthy" : "unavailable",
      ...health,
    };
  }

  @Post("analyze")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("image", IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "图像分析", description: "上传图片进行AI内容分析，支持 JPEG、PNG、WebP 格式，最大 10MB。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: { type: "string", format: "binary", description: "待分析的图片文件" },
      },
      required: ["image"],
    },
  })
  @ApiResponse({ status: 200, description: "分析结果" })
  @ApiResponse({ status: 400, description: "请上传图像文件" })
  @ApiResponse({ status: 401, description: "未授权" })
  async analyzeImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("请上传图像文件");
    }

    const result = await this.aiService.analyzeImageBuffer(file.buffer);

    return {
      success: result.success,
      data: result,
      error: result.error ?? null,
    };
  }

  @Post("analyze/:itemId")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "商品图像分析", description: "分析指定商品的图像，获取AI分析结果。" })
  @ApiParam({ name: "itemId", description: "商品ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "分析结果" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async analyzeItem(@Param("itemId") itemId: string) {
    const result = await this.aiService.analyzeImage(`items/${itemId}`);

    return {
      success: result.success,
      data: result,
      error: result.error ?? null,
    };
  }

  @Post("body-analysis")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("image", IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "身体分析", description: "上传用户照片进行身体数据分析，支持 JPEG、PNG、WebP 格式，最大 10MB。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: { type: "string", format: "binary", description: "用户照片文件" },
      },
      required: ["image"],
    },
  })
  @ApiResponse({ status: 200, description: "身体分析结果" })
  @ApiResponse({ status: 400, description: "请上传图像文件" })
  @ApiResponse({ status: 401, description: "未授权" })
  async analyzeBody(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("请上传图像文件");
    }

    const result = await this.aiService.analyzeBodyBuffer(file.buffer);

    return {
      success: result.success,
      data: result,
      error: result.error ?? null,
    };
  }

  @Post("similar")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("image", IMAGE_UPLOAD_OPTIONS))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "相似商品搜索", description: "上传图片搜索视觉相似的商品，支持 JPEG、PNG、WebP 格式，最大 10MB。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        image: { type: "string", format: "binary", description: "搜索参考图片文件" },
      },
      required: ["image"],
    },
  })
  @ApiQuery({ name: "topK", required: false, type: Number, description: "返回数量，默认10", example: 10 })
  @ApiQuery({ name: "category", required: false, enum: ClothingCategory, description: "服装分类筛选" })
  @ApiResponse({ status: 200, description: "相似商品列表" })
  @ApiResponse({ status: 400, description: "请上传图像文件" })
  @ApiResponse({ status: 401, description: "未授权" })
  async findSimilar(
    @UploadedFile() file: Express.Multer.File,
    @Query("topK") topK?: string,
    @Query("category") category?: ClothingCategory,
  ) {
    if (!file) {
      throw new BadRequestException("请上传图像文件");
    }

    const k = topK ? parseInt(topK, 10) : 10;
    const results = await this.aiService.findSimilarItemsBuffer(
      file.buffer,
      k,
      category,
    );

    return {
      success: true,
      data: results,
    };
  }

  @Get("similar/:itemId")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "商品相似推荐", description: "根据指定商品ID获取相似商品推荐。" })
  @ApiParam({ name: "itemId", description: "商品ID", type: String, format: "uuid" })
  @ApiQuery({ name: "topK", required: false, type: Number, description: "返回数量，默认10", example: 10 })
  @ApiQuery({ name: "category", required: false, enum: ClothingCategory, description: "服装分类筛选" })
  @ApiResponse({ status: 200, description: "相似商品列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async findSimilarByItemId(
    @Param("itemId") itemId: string,
    @Query("topK") topK?: string,
    @Query("category") category?: ClothingCategory,
  ) {
    const k = topK ? parseInt(topK, 10) : 10;
    const results = await this.aiService.findSimilarItemsForItem(
      itemId,
      k,
      category,
    );

    return {
      success: true,
      data: results,
    };
  }

  @Post("outfit")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "穿搭推荐", description: "基于指定商品推荐搭配组合，可指定体型、场合等偏好。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        baseItemId: { type: "string", description: "基础商品ID", format: "uuid" },
        userBodyType: { type: "string", description: "用户体型（如：slim、average、athletic）" },
        occasion: { type: "string", description: "场合（如：daily、work、party）" },
        topK: { type: "number", description: "返回数量，默认5", example: 5 },
      },
      required: ["baseItemId"],
    },
  })
  @ApiResponse({ status: 200, description: "穿搭推荐结果" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async recommendOutfit(
    @Body()
    body: {
      baseItemId: string;
      userBodyType?: string;
      occasion?: string;
      topK?: number;
    },
  ) {
    const { baseItemId, userBodyType, occasion, topK = 5 } = body;

    const results = await this.aiService.recommendOutfit(
      baseItemId,
      userBodyType,
      occasion,
      topK,
    );

    return {
      success: true,
      data: results,
    };
  }

  @Get("colors/:season")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "色彩推荐", description: "根据色彩季型（如春、夏、秋、冬）获取推荐颜色。" })
  @ApiParam({ name: "season", description: "色彩季型", type: String, example: "spring" })
  @ApiQuery({ name: "category", required: false, type: String, description: "服装分类筛选" })
  @ApiResponse({ status: 200, description: "色彩推荐结果" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getColorRecommendations(
    @Param("season") season: string,
    @Query("category") category?: string,
  ) {
    const results = await this.aiService.getColorRecommendations(
      season,
      category,
    );

    return {
      success: true,
      data: results,
    };
  }

  @Get("stats")
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: "AI服务统计", description: "获取AI服务使用统计信息" })
  @ApiResponse({ status: 200, description: "统计信息" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getStats() {
    const stats = await this.aiService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Post("enrich/:itemId")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "商品AI增强", description: "为指定商品添加AI分析结果，包括标签、颜色、风格等属性。" })
  @ApiParam({ name: "itemId", description: "商品ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "增强成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "商品不存在" })
  async enrichItem(@Param("itemId") itemId: string) {
    await this.aiService.enrichItemWithAI(itemId, `items/${itemId}`);

    return {
      success: true,
      message: `商品 ${itemId} 已更新AI分析结果`,
    };
  }

  @Post("batch-enrich")
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @ApiOperation({ summary: "批量商品AI增强", description: "批量为商品添加AI分析结果，按限制数量处理。" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "处理数量限制，默认100", example: 100 },
      },
    },
  })
  @ApiResponse({ status: 200, description: "批量增强结果" })
  @ApiResponse({ status: 401, description: "未授权" })
  async batchEnrichItems(@Body() body: { limit?: number }) {
    const { limit = 100 } = body;
    const enriched = await this.aiService.batchEnrichItems(limit);

    return {
      success: true,
      data: {
        enriched,
        message: `成功增强 ${enriched} 个商品`,
      },
    };
  }

}

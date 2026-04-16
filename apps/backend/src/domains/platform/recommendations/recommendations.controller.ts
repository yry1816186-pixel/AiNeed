/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Controller, Get, Post, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ClothingCategory } from "@prisma/client";

import { CacheKey, CacheTTL } from "../../../common/decorators/cache.decorators";
import { CurrentUser } from "../../identity/auth/decorators/current-user.decorator";
import { Public } from "../../identity/auth/decorators/public.decorator";
import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";
import { OptionalAuthGuard } from "../../identity/auth/guards/optional-auth.guard";

import {
  GetRecommendationsQueryDto,
  GetAdvancedRecommendationsQueryDto,
  GetOccasionRecommendationsQueryDto,
  GetTrendingQueryDto,
  GetDiscoverQueryDto,
  GetFeedDto,
  SubmitFeedbackDto,
  SubmitBatchFeedbackDto,
} from "./dto";
import { RecommendationsService } from "./recommendations.service";
import { AdvancedRecommendationService } from "./services/advanced-recommendation.service";
import {
  BehaviorTrackingService,
  type BehaviorAction,
} from "./services/behavior-tracking.service";
import { OutfitCompletionService } from "./services/outfit-completion.service";
import { RecommendationFeedService } from "./services/recommendation-feed.service";

/**
 * 服装项响应
 */
class ClothingItemDto {
  id!: string;
  name!: string;
  category!: ClothingCategory;
  imageUrl!: string;
  price?: number;
  brand?: string;
  tags?: string[];
}

/**
 * 推荐列表响应
 */
class RecommendationsResponseDto {
  items!: ClothingItemDto[];
  total!: number;
}

/**
 * 高级推荐响应
 */
class AdvancedRecommendationsResponseDto {
  items!: ClothingItemDto[];
  strategies!: string[];
  metadata?: {
    userProfile?: Record<string, unknown>;
    context?: Record<string, unknown>;
  };
}

/**
 * 每日穿搭响应
 */
class DailyOutfitResponseDto {
  outfit!: {
    id: string;
    name: string;
    items: ClothingItemDto[];
    occasion: string;
    weather?: string;
    reasoning: string;
  };
  alternatives?: Array<{
    id: string;
    name: string;
    items: ClothingItemDto[];
  }>;
}

/**
 * 场合推荐响应
 */
class OccasionRecommendationsResponseDto {
  occasion!: string;
  items!: ClothingItemDto[];
  tips?: string[];
}

/**
 * 热门趋势响应
 */
class TrendingResponseDto {
  items!: ClothingItemDto[];
  trends!: Array<{
    name: string;
    description: string;
    itemCount: number;
  }>;
}

/**
 * 风格指南响应
 */
class StyleGuideResponseDto {
  styleProfile!: {
    primaryStyle: string;
    secondaryStyles: string[];
    preferences: Record<string, unknown>;
  };
  recommendations!: ClothingItemDto[];
  tips!: string[];
}

/**
 * 发现页面响应
 */
class DiscoverResponseDto {
  items!: ClothingItemDto[];
  categories?: Array<{
    name: string;
    items: ClothingItemDto[];
  }>;
  personalized!: boolean;
}

@ApiTags("recommendations")
@Controller("recommendations")
export class RecommendationsController {
  constructor(
    private recommendationsService: RecommendationsService,
    private advancedRecommendationService: AdvancedRecommendationService,
    private outfitCompletionService: OutfitCompletionService,
    private behaviorTrackingService: BehaviorTrackingService,
    private feedService: RecommendationFeedService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @CacheKey("recommendations:personalized")
  @CacheTTL(180)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取个性化推荐",
    description:
      "根据用户画像和行为数据，返回个性化服装推荐。支持按分类、场合、季节筛选。",
  })
  @ApiQuery({
    name: "category",
    required: false,
    enum: ClothingCategory,
    description: "服装分类筛选",
  })
  @ApiQuery({
    name: "occasion",
    required: false,
    type: String,
    description: "场合筛选（如：daily、work、party、date）",
    example: "daily",
  })
  @ApiQuery({
    name: "season",
    required: false,
    type: String,
    description: "季节筛选（spring、summer、autumn、winter）",
    example: "spring",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认20",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: RecommendationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getRecommendations(
    @CurrentUser("id") userId: string,
    @Query("category") category?: ClothingCategory,
    @Query("occasion") occasion?: string,
    @Query("season") season?: string,
    @Query("limit") limit?: string,
  ) {
    const result = await this.recommendationsService.getPersonalizedRecommendations(
      userId,
      {
        category,
        occasion,
        season,
        limit: limit ? parseInt(limit) : 20,
      },
    );
    return { items: result, total: result.length };
  }

  @UseGuards(JwtAuthGuard)
  @Get("feed")
  @CacheKey("recommendations:feed")
  @CacheTTL(180)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取推荐 Feed（分页）",
    description:
      "获取分页推荐 Feed，支持 daily/occasion/trending/explore 四种分类。返回包含 colorHarmony 和 matchReason 的 FeedItem。",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  async getFeed(
    @CurrentUser("id") userId: string,
    @Query() dto: GetFeedDto,
  ) {
    return this.feedService.getFeed(
      userId,
      (dto.category as "daily" | "occasion" | "trending" | "explore") || "daily",
      dto.subCategory,
      dto.page || 1,
      dto.pageSize || 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("advanced")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取高级个性化推荐（多策略融合）",
    description:
      "使用多种推荐策略（协同过滤、内容推荐、热门推荐等）融合生成推荐结果，提供更精准的个性化推荐。",
  })
  @ApiQuery({
    name: "occasion",
    required: false,
    type: String,
    description: "场合筛选",
    example: "work",
  })
  @ApiQuery({
    name: "season",
    required: false,
    type: String,
    description: "季节筛选",
    example: "spring",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认20",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: AdvancedRecommendationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getAdvancedRecommendations(
    @CurrentUser("id") userId: string,
    @Query("occasion") occasion?: string,
    @Query("season") season?: string,
    @Query("limit") limit?: string,
  ) {
    return this.advancedRecommendationService.getPersonalizedRecommendations(
      userId,
      { occasion, season },
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("daily")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取每日穿搭推荐" })
  @ApiResponse({ status: 200, description: "每日穿搭推荐" })
  async getDailyOutfit(@CurrentUser("id") userId: string) {
    return this.advancedRecommendationService.getDailyOutfitRecommendation(
      userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("occasion")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取场合推荐",
    description:
      "根据特定场合（面试、约会、派对等）返回适合的服装推荐和穿搭建议。",
  })
  @ApiQuery({
    name: "type",
    required: true,
    type: String,
    description: "场合类型（daily、interview、date、party、workout、travel）",
    example: "interview",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认10",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: OccasionRecommendationsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getOccasionRecommendations(
    @CurrentUser("id") userId: string,
    @Query("type") occasion: string,
    @Query("limit") limit?: string,
  ) {
    return this.advancedRecommendationService.getOccasionRecommendations(
      userId,
      occasion || "daily",
      limit ? parseInt(limit) : 10,
    );
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get("trending")
  @CacheKey("recommendations:trending")
  @CacheTTL(180)
  @ApiOperation({
    summary: "获取热门趋势推荐",
    description:
      "获取当前热门服装趋势和流行单品，无需登录即可访问。数据基于全平台用户行为统计。",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认20",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: TrendingResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁，每分钟最多20次",
  })
  async getTrendingRecommendations(@Query("limit") limit?: string) {
    return this.advancedRecommendationService.getTrendingRecommendations(
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("style-guide")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取风格指南",
    description:
      "根据用户画像生成个人风格指南，包含风格分析、推荐单品和穿搭技巧。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: StyleGuideResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getStyleGuide(@CurrentUser("id") userId: string) {
    return this.recommendationsService.getStyleGuide(userId);
  }

  @UseGuards(OptionalAuthGuard)
  @Get("discover")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "发现页面推荐",
    description:
      "发现页面推荐接口。已登录用户返回个性化推荐，未登录用户返回热门推荐。",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认20",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: DiscoverResponseDto,
  })
  async getDiscoverRecommendations(
    @CurrentUser("id") userId?: string,
    @Query("limit") limit?: string,
  ) {
    // 如果用户已登录，返回个性化推荐
    // 否则返回热门推荐
    if (userId) {
      return this.advancedRecommendationService.getPersonalizedRecommendations(
        userId,
        {},
        limit ? parseInt(limit) : 20,
      );
    } else {
      return this.advancedRecommendationService.getTrendingRecommendations(
        limit ? parseInt(limit) : 20,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("complete-the-look/:clothingId")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取搭配推荐（Complete the Look）",
    description:
      "基于选中的服装，推荐互补的搭配单品（上装/下装/鞋/配饰），包含色彩和谐度评分。",
  })
  @ApiResponse({
    status: 200,
    description: "搭配推荐结果",
  })
  async getCompleteTheLook(
    @CurrentUser("id") userId: string,
    @Param("clothingId") clothingId: string,
  ) {
    return this.outfitCompletionService.getCompleteTheLook(clothingId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("feedback")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "提交推荐反馈",
    description:
      "用户对推荐结果进行反馈（like/dislike/ignore），反馈将用于改进后续推荐质量。",
  })
  @ApiResponse({
    status: 200,
    description: "反馈已记录",
  })
  async submitFeedback(
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    const actionMap: Record<string, BehaviorAction> = {
      like: "post_like",
      dislike: "click",
      ignore: "click",
    };

    await this.behaviorTrackingService.track({
      userId,
      action: actionMap[dto.action] || "click",
      clothingId: dto.clothingId,
      context: {
        recommendationId: dto.recommendationId,
        source: "recommendation_feedback",
      },
    });

    return { success: true, message: "反馈已记录" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("feedback/batch")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "批量提交推荐反馈",
    description: "批量提交多条推荐反馈，适用于滑动推荐等场景。",
  })
  @ApiResponse({
    status: 200,
    description: "批量反馈已记录",
  })
  async submitBatchFeedback(
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitBatchFeedbackDto,
  ) {
    const actionMap: Record<string, BehaviorAction> = {
      like: "post_like",
      dislike: "click",
      ignore: "click",
    };

    await this.behaviorTrackingService.trackBatch(
      dto.items.map((item) => ({
        userId,
        action: actionMap[item.action] || "click" as BehaviorAction,
        clothingId: item.clothingId,
        context: {
          recommendationId: item.recommendationId,
          source: "recommendation_feedback_batch",
        },
      })),
    );

    return { success: true, message: `已记录 ${dto.items.length} 条反馈` };
  }

  @UseGuards(JwtAuthGuard)
  @Get("cold-start")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取冷启动推荐",
    description:
      "为新用户提供的推荐接口，基于 onboarding style quiz 结果生成初始推荐，无需历史行为数据。",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "返回数量，默认20",
  })
  async getColdStartRecommendations(
    @CurrentUser("id") userId: string,
    @Query("limit") limit?: string,
  ) {
    return this.recommendationsService.getPersonalizedRecommendations(
      userId,
      { limit: limit ? parseInt(limit) : 20 },
    );
  }
}

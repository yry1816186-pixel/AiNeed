import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { AIIntegrationService } from "../../ai-core/ai/services/ai-integration.service";
import { TryOnService } from "../../ai-core/try-on/try-on.service";
import { ClothingService } from "../../fashion/clothing/clothing.service";
import { RecommendationOrchestrator } from "../recommendations/orchestrator/recommendation.orchestrator";

import { PartnerAuthGuard } from "./guards/partner-auth.guard";
import { PartnerRateLimitGuard } from "./guards/partner-rate-limit.guard";
import { PartnerApiLogService } from "./services/partner-api-log.service";
import {
  PartnerRecommendationDto,
  PartnerTryOnDto,
  PartnerBodyAnalysisDto,
  PartnerColorAnalysisDto,
  PartnerWardrobeTaggingDto,
} from "./dto/partner-api.dto";

import type { Request } from "express";

@ApiTags("partner")
@Controller("partner")
@UseGuards(PartnerAuthGuard, PartnerRateLimitGuard)
export class PartnerApiController {
  constructor(
    private readonly orchestrator: RecommendationOrchestrator,
    private readonly tryOnService: TryOnService,
    private readonly aiIntegration: AIIntegrationService,
    private readonly clothingService: ClothingService,
    private readonly logService: PartnerApiLogService
  ) {}

  @Post("recommendation")
  @HttpCode(HttpStatus.OK)
  async recommendation(@Body() dto: PartnerRecommendationDto, @Req() req: Request) {
    const keyData = (req as any)["partnerApiKey"];
    const startTime = Date.now();
    let statusCode = HttpStatus.OK;
    try {
      const result = await this.orchestrator.getRecommendations({
        userId: dto.userId,
        context: { occasion: dto.occasion, season: dto.season },
        options: { limit: dto.limit || 20 },
      });
      return result;
    } catch (error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      throw error;
    } finally {
      await this.logService.logCall({
        keyId: keyData.id,
        endpoint: "partner/recommendation",
        statusCode,
        responseTime: Date.now() - startTime,
        ip: req.ip,
      });
    }
  }

  @Post("try-on")
  @HttpCode(HttpStatus.OK)
  async tryOn(@Body() dto: PartnerTryOnDto, @Req() req: Request) {
    const keyData = (req as any)["partnerApiKey"];
    const startTime = Date.now();
    let statusCode = HttpStatus.OK;
    try {
      const result = await this.tryOnService.createTryOnRequest(
        dto.userId,
        dto.photoId,
        dto.itemId
      );
      return result;
    } catch (error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      throw error;
    } finally {
      await this.logService.logCall({
        keyId: keyData.id,
        endpoint: "partner/try-on",
        statusCode,
        responseTime: Date.now() - startTime,
        ip: req.ip,
      });
    }
  }

  @Post("body-analysis")
  @HttpCode(HttpStatus.OK)
  async bodyAnalysis(@Body() dto: PartnerBodyAnalysisDto, @Req() req: Request) {
    const keyData = (req as any)["partnerApiKey"];
    const startTime = Date.now();
    let statusCode = HttpStatus.OK;
    try {
      const buffer = Buffer.from(dto.imageBase64, "base64");
      const result = await this.aiIntegration.analyzeBodyBuffer(buffer);
      return result;
    } catch (error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      throw error;
    } finally {
      await this.logService.logCall({
        keyId: keyData.id,
        endpoint: "partner/body-analysis",
        statusCode,
        responseTime: Date.now() - startTime,
        ip: req.ip,
      });
    }
  }

  @Post("color-analysis")
  @HttpCode(HttpStatus.OK)
  async colorAnalysis(@Body() dto: PartnerColorAnalysisDto, @Req() req: Request) {
    const keyData = (req as any)["partnerApiKey"];
    const startTime = Date.now();
    let statusCode = HttpStatus.OK;
    try {
      const buffer = Buffer.from(dto.imageBase64, "base64");
      const result = await this.aiIntegration.performColorSeasonAnalysis(buffer);
      return result;
    } catch (error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      throw error;
    } finally {
      await this.logService.logCall({
        keyId: keyData.id,
        endpoint: "partner/color-analysis",
        statusCode,
        responseTime: Date.now() - startTime,
        ip: req.ip,
      });
    }
  }

  @Post("wardrobe/tagging")
  @HttpCode(HttpStatus.OK)
  async wardrobeTagging(@Body() dto: PartnerWardrobeTaggingDto, @Req() req: Request) {
    const keyData = (req as any)["partnerApiKey"];
    const startTime = Date.now();
    let statusCode = HttpStatus.OK;
    try {
      const result = await this.clothingService.search(dto.query, {
        category: dto.category as any,
      });
      return result;
    } catch (error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      throw error;
    } finally {
      await this.logService.logCall({
        keyId: keyData.id,
        endpoint: "partner/wardrobe/tagging",
        statusCode,
        responseTime: Date.now() - startTime,
        ip: req.ip,
      });
    }
  }
}

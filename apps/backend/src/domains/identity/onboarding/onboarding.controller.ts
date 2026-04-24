import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { CompleteBasicInfoDto, FirstOutfitsDto, SkipStepDto } from "./dto/onboarding.dto";
import { OnboardingService } from "./onboarding.service";

import { ColdStartService } from "../../platform/recommendations/services/cold-start.service";

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

@ApiTags("onboarding")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("onboarding")
export class OnboardingController {
  constructor(
    private onboardingService: OnboardingService,
    private coldStartService: ColdStartService
  ) {}

  @Get("state")
  @ApiOperation({
    summary: "获取引导状态",
    description: "获取当前用户的引导流程状态，包括当前步骤和已完成步骤。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权",
  })
  @ApiResponse({
    status: 404,
    description: "用户画像不存在",
  })
  async getState(@Request() req: AuthenticatedRequest) {
    return this.onboardingService.getOnboardingState(req.user.id);
  }

  @Post("basic-info")
  @ApiOperation({
    summary: "完成基本信息填写",
    description: "填写性别、年龄段等基本信息，完成后推进到照片上传步骤。",
  })
  @ApiResponse({
    status: 200,
    description: "基本信息填写成功",
  })
  @ApiResponse({
    status: 400,
    description: "当前步骤不是基本信息填写",
  })
  @ApiResponse({
    status: 401,
    description: "未授权",
  })
  async completeBasicInfo(@Request() req: AuthenticatedRequest, @Body() dto: CompleteBasicInfoDto) {
    return this.onboardingService.completeBasicInfo(req.user.id, dto);
  }

  @Post("skip/:step")
  @ApiOperation({
    summary: "跳过引导步骤",
    description: "跳过照片上传或风格测试步骤（基本信息不可跳过）。",
  })
  @ApiResponse({
    status: 200,
    description: "跳过成功",
  })
  @ApiResponse({
    status: 400,
    description: "无效的跳过步骤或当前步骤不匹配",
  })
  @ApiResponse({
    status: 401,
    description: "未授权",
  })
  async skipStep(@Request() req: AuthenticatedRequest, @Param("step") step: string) {
    return this.onboardingService.skipStep(req.user.id, step);
  }

  @Get("progress")
  @ApiOperation({
    summary: "获取引导进度",
    description: "获取引导流程的完成百分比和各步骤状态。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权",
  })
  @ApiResponse({
    status: 404,
    description: "用户画像不存在",
  })
  async getProgress(@Request() req: AuthenticatedRequest) {
    return this.onboardingService.getOnboardingProgress(req.user.id);
  }

  @Post("first-outfits")
  @ApiOperation({
    summary: "生成首次穿搭推荐",
    description:
      "根据用户引导数据（场景、风格、服装偏好）生成3套穿搭推荐方案。使用 ColdStartService 的 profile-based 策略。",
  })
  @ApiResponse({
    status: 201,
    description: "推荐生成成功",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          imageUrl: { type: "string" },
          matchScore: { type: "number" },
          reason: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                imageUrl: { type: "string" },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: "请求参数无效" })
  @ApiResponse({ status: 401, description: "未授权" })
  async generateFirstOutfits(@Request() req: AuthenticatedRequest, @Body() dto: FirstOutfitsDto) {
    const strategy = await this.coldStartService.handleNewUser(req.user.id, {
      primaryScenarios: dto.primaryScenarios,
      styleExpression: dto.styleExpression,
      garmentPreference: dto.garmentPreference,
      bodyType: dto.bodyType,
    });

    // Convert ColdStartRecommendation[] to outfit-like recommendations
    const topThree = strategy.recommendations.slice(0, 3);

    const outfitNames = ["日常休闲风", "通勤精致风", "轻松约会风"];

    return topThree.map((rec, index) => ({
      id: rec.itemId,
      name: outfitNames[index] ?? `推荐搭配 ${index + 1}`,
      imageUrl: "",
      matchScore: Math.round(rec.score),
      reason: rec.reason,
      items: [
        { name: "上衣", category: "tops", imageUrl: "" },
        { name: "下装", category: "bottoms", imageUrl: "" },
        { name: "鞋履", category: "shoes", imageUrl: "" },
      ],
      strategy: rec.strategy,
    }));
  }
}

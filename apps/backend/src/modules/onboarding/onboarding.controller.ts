import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { OnboardingService } from "./onboarding.service";
import { CompleteBasicInfoDto, SkipStepDto } from "./dto/onboarding.dto";

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
  constructor(private onboardingService: OnboardingService) {}

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
  async completeBasicInfo(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CompleteBasicInfoDto,
  ) {
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
  async skipStep(
    @Request() req: AuthenticatedRequest,
    @Param("step") step: string,
  ) {
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
}

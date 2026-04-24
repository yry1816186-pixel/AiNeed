import { Controller, Get, Patch, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RequestWithUser } from "../../../common/types/common.types";
import { AuthGuard } from "../auth/guards/auth.guard";

import { RecommendationSettingsDto } from "./dto/preferences.dto";

@ApiTags("preferences")
@ApiBearerAuth()
@Controller("preferences")
@UseGuards(AuthGuard)
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("recommendation-settings")
  @ApiOperation({
    summary: "获取推荐设置",
    description: "获取当前用户的个性化推荐设置状态",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getRecommendationSettings(@Request() req: RequestWithUser) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: req.user.id },
    });

    const settings = (profile?.preferences as Record<string, any>) || {};

    return {
      personalizationEnabled: settings.personalizationEnabled !== false,
    };
  }

  @Patch("recommendation-settings")
  @ApiOperation({
    summary: "更新推荐设置",
    description: "开启或关闭个性化推荐。关闭后使用通用推荐，不使用用户画像数据。",
  })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async updateRecommendationSettings(
    @Request() req: RequestWithUser,
    @Body() dto: RecommendationSettingsDto
  ) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: req.user.id },
    });

    const existingPreferences = (profile?.preferences as Record<string, any>) || {};

    await this.prisma.userProfile.upsert({
      where: { userId: req.user.id },
      update: {
        preferences: {
          ...existingPreferences,
          personalizationEnabled: dto.personalizationEnabled,
        },
      },
      create: {
        userId: req.user.id,
        preferences: {
          personalizationEnabled: dto.personalizationEnabled,
        },
      },
    });

    return { personalizationEnabled: dto.personalizationEnabled };
  }
}

import { Controller, Get, Put, Body, Request, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { AuthenticatedRequest } from "../../../common/types/auth.types";
import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";
import { ProfileService, UpdateProfileDto } from "../../identity/profile/profile.service";

@ApiTags("User (Mobile)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("user")
export class MobileUserController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("profile")
  @ApiOperation({ summary: "获取用户画像" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getProfile(@Request() req: AuthenticatedRequest) {
    const data = await this.profileService.getProfile(req.user.id);
    return { success: true, data };
  }

  @Put("profile")
  @ApiOperation({ summary: "更新用户画像" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async updateProfile(@Request() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    const data = await this.profileService.updateProfile(req.user.id, dto);
    return { success: true, data };
  }

  @Get("body-analysis")
  @ApiOperation({ summary: "获取体型分析报告" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getBodyAnalysis(@Request() req: AuthenticatedRequest) {
    const data = await this.profileService.getBodyAnalysis(req.user.id);
    return { success: true, data };
  }

  @Get("color-analysis")
  @ApiOperation({ summary: "获取色彩分析报告" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getColorAnalysis(@Request() req: AuthenticatedRequest) {
    const data = await this.profileService.getColorAnalysis(req.user.id);
    return { success: true, data };
  }
}

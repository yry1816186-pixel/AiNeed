/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Put, Post, Body, UseGuards, UseInterceptors, Request, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { SensitiveDataInterceptor } from "../../../../common/interceptors/sensitive-data.interceptor";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  UpdateProfileDto,
  UserProfileResponseDto,
  BodyAnalysisResultDto,
  ColorAnalysisResultDto,
  UpdateStylePreferencesDto,
  UpdateColorPreferencesDto,
  UpdatePriceRangeDto,
  UserPreferencesResponseDto,
} from "./dto";
import { ProfileService, UpdateProfileDto as ServiceUpdateProfileDto } from "./profile.service";
import { ProfileCompletenessService } from "./services/profile-completeness.service";
import { SharePosterService } from "./services/share-poster.service";
import { UserProfileService, UpdateProfileDto as UserUpdateProfileDto } from "./services/user-profile.service";

/**
 * 认证请求接口
 * @description 包含已认证用户信息的请求对象
 */
interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * 成功响应 DTO
 */
class SuccessResponseDto {
  success!: boolean;
}

@ApiTags("profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(SensitiveDataInterceptor)
@Controller("profile")
export class ProfileController {
  constructor(
    private profileService: ProfileService,
    private userProfileService: UserProfileService,
    private completenessService: ProfileCompletenessService,
    private sharePosterService: SharePosterService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "获取用户形象档案",
    description: "获取当前用户的完整形象档案信息，包括基本信息、体型数据、风格偏好等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "用户不存在",
  })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.profileService.getProfile(req.user.id);
  }

  @Put()
  @ApiOperation({
    summary: "更新用户形象档案",
    description: "更新当前用户的形象档案信息，包括基本资料、体型数据、风格偏好等。",
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ServiceUpdateProfileDto,
  ) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Get("body-analysis")
  @ApiOperation({
    summary: "获取体型分析报告",
    description: "根据用户的体型数据生成详细的体型分析报告，包括体型类型、穿搭建议、适合风格等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: BodyAnalysisResultDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getBodyAnalysis(@Request() req: AuthenticatedRequest) {
    return this.profileService.getBodyAnalysis(req.user.id);
  }

  @Get("color-analysis")
  @ApiOperation({
    summary: "获取色彩分析报告",
    description: "根据用户的肤色数据生成详细的色彩分析报告，包括色彩季节、最佳颜色、避免颜色等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: ColorAnalysisResultDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getColorAnalysis(@Request() req: AuthenticatedRequest) {
    return this.profileService.getColorAnalysis(req.user.id);
  }

  @Post("body-analysis/upload")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "上传体型分析照片",
    description:
      "通过 multipart/form-data 上传用户照片进行体型分析。支持 JPEG、PNG 格式，最大 10MB。MVP 阶段返回占位分析结果。",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "体型分析照片（JPEG/PNG，最大 10MB）",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "体型分析完成",
    type: BodyAnalysisResultDto,
  })
  @ApiResponse({
    status: 400,
    description: "文件格式不支持或文件过大",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async uploadBodyAnalysis(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("请选择要上传的照片");
    }

    const allowedMimeTypes = ["image/jpeg", "image/png"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "不支持的文件格式，仅支持 JPEG、PNG 格式",
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException("文件大小不能超过 10MB");
    }

    // MVP placeholder: return a basic body analysis structure
    // TODO: integrate with external ML analysis API for real results
    return {
      bodyType: "rectangle",
      bodyTypeName: "矩形体型",
      description: "基于上传照片的体型分析结果（MVP 占位）",
      recommendations: [
        {
          category: "上衣",
          advice: "建议选择有层次感的搭配",
          examples: ["V领衬衫", "修身西装外套"],
        },
        {
          category: "下装",
          advice: "建议选择直筒或微喇裤型",
          examples: ["直筒牛仔裤", "微喇西裤"],
        },
      ],
      idealStyles: ["casual", "business", "minimalist"],
      avoidStyles: ["oversized"],
    };
  }

  @Post("color-analysis/upload")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "上传色彩分析照片",
    description:
      "通过 multipart/form-data 上传用户照片进行色彩季节分析。支持 JPEG、PNG 格式，最大 10MB。MVP 阶段返回占位分析结果。",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "色彩分析照片（JPEG/PNG，最大 10MB）",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "色彩分析完成",
    type: ColorAnalysisResultDto,
  })
  @ApiResponse({
    status: 400,
    description: "文件格式不支持或文件过大",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async uploadColorAnalysis(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("请选择要上传的照片");
    }

    const allowedMimeTypes = ["image/jpeg", "image/png"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "不支持的文件格式，仅支持 JPEG、PNG 格式",
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException("文件大小不能超过 10MB");
    }

    // MVP placeholder: return a basic color analysis structure
    // TODO: integrate with external ML analysis API for real results
    return {
      colorSeason: "autumn_warm",
      colorSeasonName: "暖秋型",
      bestColors: ["深棕色", "橄榄绿", "酒红色", "焦糖色", "芥末黄"],
      neutralColors: ["米白", "驼色", "深灰", "藏青"],
      avoidColors: ["荧光粉", "冰蓝", "亮紫色"],
      metalPreference: "金色",
    };
  }

  @Get("style-recommendations")
  @ApiOperation({
    summary: "获取风格推荐",
    description: "根据用户的形象档案生成个性化的风格推荐。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getStyleRecommendations(@Request() req: AuthenticatedRequest) {
    return this.profileService.getStyleRecommendations(req.user.id);
  }

  @Get("body-metrics")
  @ApiOperation({
    summary: "获取身体指标计算",
    description: "根据用户的身高、体重等数据计算身体指标，如 BMI、腰臀比等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getBodyMetrics(@Request() req: AuthenticatedRequest) {
    return this.profileService.calculateBodyMetrics(req.user.id);
  }

  // ========== 用户画像 API ==========

  @Get("summary")
  @ApiOperation({
    summary: "获取用户画像摘要",
    description: "获取当前用户的画像摘要信息，包括偏好、行为特征等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getProfileSummary(@Request() req: AuthenticatedRequest) {
    return this.userProfileService.getUserProfileSummary(req.user.id);
  }

  @Get("preferences")
  @ApiOperation({
    summary: "获取用户偏好设置",
    description: "获取当前用户的偏好设置，包括风格偏好、颜色偏好、价格区间等。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserPreferencesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getPreferences(@Request() req: AuthenticatedRequest) {
    const profile = await this.userProfileService.getBodyProfile(req.user.id);
    const summary = await this.userProfileService.getUserProfileSummary(
      req.user.id,
    );

    return {
      styles: profile?.stylePreferences || [],
      colors: profile?.colorPreferences || [],
      priceRange: profile?.priceRange || { min: null, max: null },
      behaviorPreferences: summary.preferences,
    };
  }

  @Put("preferences")
  @ApiOperation({
    summary: "更新用户偏好设置",
    description: "更新当前用户的偏好设置。",
  })
  @ApiResponse({
    status: 200,
    description: "更新成功",
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UserUpdateProfileDto,
  ) {
    return this.userProfileService.updateProfile(req.user.id, dto);
  }

  @Put("preferences/styles")
  @ApiOperation({
    summary: "更新风格偏好",
    description: "更新当前用户的风格偏好列表。",
  })
  @ApiBody({ type: UpdateStylePreferencesDto })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updateStylePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateStylePreferencesDto,
  ) {
    await this.userProfileService.updateStylePreferences(
      req.user.id,
      body.styles,
    );
    return { success: true };
  }

  @Put("preferences/colors")
  @ApiOperation({
    summary: "更新颜色偏好",
    description: "更新当前用户的颜色偏好列表。",
  })
  @ApiBody({ type: UpdateColorPreferencesDto })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updateColorPreferences(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateColorPreferencesDto,
  ) {
    await this.userProfileService.updateColorPreferences(
      req.user.id,
      body.colors,
    );
    return { success: true };
  }

  @Put("preferences/price-range")
  @ApiOperation({
    summary: "更新价格区间偏好",
    description: "更新当前用户的价格区间偏好。",
  })
  @ApiBody({ type: UpdatePriceRangeDto })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async updatePriceRange(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdatePriceRangeDto,
  ) {
    await this.userProfileService.updatePriceRange(
      req.user.id,
      body.min ?? null,
      body.max ?? null,
    );
    return { success: true };
  }

  @Post("refresh-from-behavior")
  @ApiOperation({
    summary: "从用户行为刷新画像",
    description: "根据用户的历史行为数据重新计算和更新用户画像。",
  })
  @ApiResponse({
    status: 200,
    description: "刷新成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async refreshFromBehavior(@Request() req: AuthenticatedRequest) {
    await this.userProfileService.updateProfileFromBehavior(req.user.id);
    return { success: true };
  }

  // ========== Plan 03: Profile completeness and share poster endpoints ==========

  @Get("completeness")
  @ApiOperation({
    summary: "获取用户画像完整度",
    description: "计算用户画像的完成百分比和缺失字段列表。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getCompleteness(@Request() req: AuthenticatedRequest) {
    const profile = await this.profileService.getProfile(req.user.id);
    const result = this.completenessService.calculateCompleteness({
      gender: profile.gender,
      birthDate: profile.birthDate ? new Date(profile.birthDate) : null,
      nickname: profile.nickname,
      height: profile.profile?.height ?? null,
      weight: profile.profile?.weight ?? null,
      bodyType: profile.profile?.bodyType ?? null,
      colorSeason: profile.profile?.colorSeason ?? null,
      styleProfiles: profile.profile?.stylePreferences as unknown[] ?? [],
      stylePreferences: profile.profile?.stylePreferences as unknown[] ?? [],
      colorPreferences: (profile.profile?.colorPreferences ?? []) as unknown[],
      photos: [],
    });
    return { data: { percentage: result.percentage, missingFields: result.missingFields } };
  }

  @Post("share-poster")
  @ApiOperation({
    summary: "生成分享海报",
    description: "根据用户画像和最新风格测试结果生成分享海报图片。",
  })
  @ApiResponse({
    status: 200,
    description: "海报生成成功",
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async generateSharePoster(@Request() req: AuthenticatedRequest) {
    const profile = await this.profileService.getProfile(req.user.id);
    const imageUrl = await this.sharePosterService.generatePoster(req.user.id, {
      nickname: profile.nickname ?? "用户",
      avatar: profile.avatar ?? undefined,
      styleTypeName: profile.profile?.bodyType ?? undefined,
      colorPalette: (profile.profile?.colorPreferences as string[]) ?? [],
    });
    return { data: { imageUrl } };
  }
}

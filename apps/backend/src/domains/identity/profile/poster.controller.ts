import { Controller, Get, Post, Param, UseGuards, UseInterceptors, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { SensitiveDataInterceptor } from "../../../../common/interceptors/sensitive-data.interceptor";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { GeneratePosterResponseDto } from "./dto/poster.dto";
import { PosterGeneratorService } from "./services/poster-generator.service";

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

@ApiTags("poster")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(SensitiveDataInterceptor)
@Controller("poster")
export class PosterController {
  constructor(private posterGeneratorService: PosterGeneratorService) {}

  @Post("poster")
  @ApiOperation({
    summary: "生成用户画像海报",
    description: "根据当前用户的画像信息生成分享海报图片，同一天内重复请求返回缓存结果。",
  })
  @ApiResponse({
    status: 201,
    description: "海报生成成功",
    type: GeneratePosterResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "用户不存在",
  })
  async generatePoster(@Request() req: AuthenticatedRequest): Promise<GeneratePosterResponseDto> {
    return this.posterGeneratorService.generateProfilePoster(req.user.id);
  }

  @Get("poster/:id")
  @ApiOperation({
    summary: "获取已生成的海报",
    description: "根据海报 ID 获取已生成的用户画像分享海报。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: GeneratePosterResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  @ApiResponse({
    status: 404,
    description: "海报不存在",
  })
  async getPoster(
    @Request() req: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<GeneratePosterResponseDto> {
    return this.posterGeneratorService.getPoster(req.user.id, id);
  }
}

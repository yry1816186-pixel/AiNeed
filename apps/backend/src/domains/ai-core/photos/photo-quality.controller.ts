/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Body,
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { SensitiveDataInterceptor } from "../../../common/interceptors/sensitive-data.interceptor";
import { CurrentUser } from "../../platform/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../platform/auth/guards/jwt-auth.guard";

import { EnhanceRequestDto } from "./dto/quality-report.dto";
import { PhotoQualityService } from "./services/photo-quality.service";

@ApiTags("photo-quality")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(SensitiveDataInterceptor)
@Controller("photo-quality")
export class PhotoQualityController {
  private readonly logger = new Logger(PhotoQualityController.name);

  constructor(private readonly photoQualityService: PhotoQualityService) {}

  @Post("quality-check")
  @ApiOperation({ summary: "上传图片质量检测", description: "上传照片进行质量分析，返回清晰度、亮度、构图等维度的评分和改进建议。" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "待检测的照片文件" },
      },
      required: ["file"],
    },
  })
  @ApiResponse({ status: 200, description: "质量检测成功，返回各维度评分" })
  @ApiResponse({ status: 400, description: "请上传图片文件" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @UseInterceptors(FileInterceptor("file"))
  async qualityCheck(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.log(`Quality check requested by user ${userId}`);
    return this.photoQualityService.analyzeQuality(file.buffer);
  }

  @Post("enhance")
  @ApiOperation({ summary: "自动增强照片质量", description: "上传照片进行自动增强处理，可指定需要修复的问题（如亮度、对比度、锐度等）。" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "待增强的照片文件" },
        issues: { type: "array", items: { type: "string" }, description: "需要修复的问题列表" },
      },
      required: ["file"],
    },
  })
  @ApiResponse({ status: 200, description: "增强处理成功，返回增强后的图片数据" })
  @ApiResponse({ status: 400, description: "请上传图片文件" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @UseInterceptors(FileInterceptor("file"))
  async enhance(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("issues") issues?: string[],
  ) {
    this.logger.log(`Enhance requested by user ${userId}`);
    const parsedIssues = typeof issues === "string" ? JSON.parse(issues) : issues;
    return this.photoQualityService.autoEnhance(file.buffer, parsedIssues);
  }
}

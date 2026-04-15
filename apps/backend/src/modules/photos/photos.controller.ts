import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Res,
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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PhotoType } from "@prisma/client";
import type { Response } from "express";

import { SensitiveDataInterceptor } from "../../common/interceptors/sensitive-data.interceptor";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  PhotoUploadResultDto,
  PhotoResponseDto,
  SuccessResponseDto,
} from "./dto";
import { PhotosService } from "./photos.service";
import { PhotoQualityValidator } from "./services/photo-quality-validator.service";

@ApiTags("photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(SensitiveDataInterceptor)
@Controller("photos")
export class PhotosController {
  private readonly logger = new Logger(PhotosController.name);

  constructor(
    private readonly photosService: PhotosService,
    private readonly photoQualityValidator: PhotoQualityValidator,
  ) {}

  @Post("upload")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "上传用户照片", description: "上传用户照片，支持正面照、侧面照、全身照、半身照、面部照。上传后自动触发 AI 体型和面部分析。" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary", description: "照片文件" },
        type: {
          type: "string",
          enum: ["front", "side", "full_body", "half_body", "face"],
          description: "照片类型",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "上传成功", type: PhotoUploadResultDto })
  @ApiResponse({ status: 400, description: "文件格式不支持或文件过大" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @UseInterceptors(FileInterceptor("file"))
  async uploadPhoto(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("type") type: PhotoType,
  ) {
    // Photo quality validation before storage
    const qualityReport = await this.photoQualityValidator.validateQuality(file.buffer);
    if (!qualityReport.passed) {
      this.logger.warn(`Photo quality insufficient for user ${userId}: overall=${qualityReport.overall}`);
      throw new HttpException(
        {
          error: "Photo quality insufficient",
          details: {
            clarity: qualityReport.clarity,
            brightness: qualityReport.brightness,
            composition: qualityReport.composition,
            overall: qualityReport.overall,
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.photosService.uploadPhoto(
      userId,
      file,
      type || PhotoType.full_body,
    );
  }

  @Get()
  @ApiOperation({ summary: "获取用户照片列表", description: "获取当前用户的所有照片，可按类型筛选。" })
  @ApiQuery({ name: "type", description: "按照片类型筛选", enum: PhotoType, required: false })
  @ApiResponse({ status: 200, description: "获取成功", type: [PhotoResponseDto] })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async getUserPhotos(
    @CurrentUser("id") userId: string,
    @Query("type") type?: PhotoType,
  ) {
    return this.photosService.getUserPhotos(userId, type);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取照片详情", description: "根据照片 ID 获取单张照片的详细信息。" })
  @ApiParam({ name: "id", description: "照片 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "获取成功", type: PhotoResponseDto })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "照片不存在" })
  async getPhotoById(
    @CurrentUser("id") userId: string,
    @Param("id") photoId: string,
  ) {
    return this.photosService.getPhotoById(photoId, userId);
  }

  @Get(":id/asset")
  @ApiOperation({ summary: "获取照片原图", description: "获取照片的原始文件资源。" })
  @ApiParam({ name: "id", description: "照片 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "获取成功，返回图片二进制流" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "照片不存在" })
  async getPhotoAsset(
    @CurrentUser("id") userId: string,
    @Param("id") photoId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Serving original photo asset for ${photoId}`);
    const asset = await this.photosService.getPhotoAsset(
      photoId,
      userId,
      "original",
    );

    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Cache-Control", asset.cacheControl);
    res.send(asset.body);
  }

  @Get(":id/thumbnail")
  @ApiOperation({ summary: "获取照片缩略图", description: "获取照片的缩略图资源。" })
  @ApiParam({ name: "id", description: "照片 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "获取成功，返回缩略图二进制流" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  @ApiResponse({ status: 404, description: "照片不存在" })
  async getPhotoThumbnail(
    @CurrentUser("id") userId: string,
    @Param("id") photoId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Serving photo thumbnail asset for ${photoId}`);
    const asset = await this.photosService.getPhotoAsset(
      photoId,
      userId,
      "thumbnail",
    );

    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Cache-Control", asset.cacheControl);
    res.send(asset.body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除照片", description: "删除指定照片及其关联的存储文件。" })
  @ApiParam({ name: "id", description: "照片 ID", format: "uuid" })
  @ApiResponse({ status: 200, description: "删除成功", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "照片不存在" })
  @ApiResponse({ status: 401, description: "未授权，需要提供有效的 Access Token" })
  async deletePhoto(
    @CurrentUser("id") userId: string,
    @Param("id") photoId: string,
  ) {
    await this.photosService.deletePhoto(photoId, userId);
    return { success: true };
  }
}

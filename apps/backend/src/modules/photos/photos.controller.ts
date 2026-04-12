import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiTags,
} from "@nestjs/swagger";
import { PhotoType } from "@prisma/client";
import type { Response } from "express";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SensitiveDataInterceptor } from "../../common/interceptors/sensitive-data.interceptor";

import { PhotosService } from "./photos.service";

@ApiTags("photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(SensitiveDataInterceptor)
@Controller("photos")
export class PhotosController {
  private readonly logger = new Logger(PhotosController.name);

  constructor(private readonly photosService: PhotosService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a user photo" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        type: {
          type: "string",
          enum: ["front", "side", "full_body", "half_body", "face"],
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadPhoto(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("type") type: PhotoType,
  ) {
    return this.photosService.uploadPhoto(
      userId,
      file,
      type || PhotoType.full_body,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get user photos" })
  async getUserPhotos(
    @CurrentUser("id") userId: string,
    @Query("type") type?: PhotoType,
  ) {
    return this.photosService.getUserPhotos(userId, type);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get photo detail" })
  async getPhotoById(
    @CurrentUser("id") userId: string,
    @Param("id") photoId: string,
  ) {
    return this.photosService.getPhotoById(photoId, userId);
  }

  @Get(":id/asset")
  @ApiOperation({ summary: "Get photo original asset" })
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
  @ApiOperation({ summary: "Get photo thumbnail asset" })
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
  @ApiOperation({ summary: "Delete photo" })
  async deletePhoto(
    @CurrentUser("id") userId: string,
    @Param("id") photoId: string,
  ) {
    await this.photosService.deletePhoto(photoId, userId);
    return { success: true };
  }
}

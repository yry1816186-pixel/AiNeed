import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import { AuthenticatedRequest } from "../../../common/types/auth.types";
import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";
import { StorageService } from "../../../common/storage/storage.service";
import { TryOnService } from "../../ai-core/try-on/try-on.service";

class MobileTryOnProcessDto {
  @ApiProperty({ description: "照片ID" })
  @IsString()
  photoId!: string;

  @ApiProperty({ description: "商品ID" })
  @IsString()
  itemId!: string;
}

@ApiTags("TryOn (Mobile)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tryon")
export class MobileTryOnController {
  constructor(
    private readonly tryOnService: TryOnService,
    private readonly storageService: StorageService
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("photo"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "上传试衣照片" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["photo"],
      properties: {
        photo: {
          type: "string",
          format: "binary",
          description: "试衣照片（JPEG/PNG）",
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "上传成功" })
  @ApiResponse({ status: 400, description: "文件格式不支持" })
  @ApiResponse({ status: 401, description: "未授权" })
  async uploadPhoto(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("请选择要上传的照片");
    }

    const allowedMimeTypes = ["image/jpeg", "image/png"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("不支持的文件格式，仅支持 JPEG、PNG 格式");
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("文件大小不能超过 10MB");
    }

    const { url } = await this.storageService.uploadImage(file, "tryon-photos");
    const photoId = url;
    return { success: true, data: { photoId } };
  }

  @Post("process")
  @ApiOperation({ summary: "创建虚拟试衣任务" })
  @ApiBody({ type: MobileTryOnProcessDto })
  @ApiResponse({ status: 201, description: "试衣任务创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async processTryOn(@Request() req: AuthenticatedRequest, @Body() body: MobileTryOnProcessDto) {
    const data = await this.tryOnService.createTryOnRequest(req.user.id, body.photoId, body.itemId);
    return { success: true, data };
  }

  @Get("result/:id")
  @ApiOperation({ summary: "获取试衣结果" })
  @ApiParam({ name: "id", description: "试衣记录ID", type: String, format: "uuid" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "试衣记录不存在" })
  async getResult(@Request() req: AuthenticatedRequest, @Param("id") id: string) {
    const data = await this.tryOnService.getTryOnStatus(id, req.user.id);
    return { success: true, data };
  }
}

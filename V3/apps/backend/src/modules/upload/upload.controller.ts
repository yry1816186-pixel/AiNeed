import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiBearerAuth, ApiTags, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import type { UploadType } from './upload.service';
import {
  UploadResponseDto,
  BatchUploadResponseDto,
} from './dto/upload-response.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const VALID_UPLOAD_TYPES = ['avatar', 'clothing', 'design', 'post', 'outfit-image'] as const;

@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: '上传单张图片', description: '上传单张图片到MinIO，支持JPEG/PNG/WebP格式，最大10MB' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'type', required: false, enum: ['avatar', 'clothing', 'design', 'post', 'outfit-image'], description: '上传类型(默认post)' })
  @ApiResponse({ status: 201, description: '上传成功', type: UploadResponseDto })
  @ApiResponse({ status: 400, description: '文件类型不支持或文件过大' })
  @ApiResponse({ status: 401, description: '未认证' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const uploadType: UploadType = VALID_UPLOAD_TYPES.includes(type as UploadType)
      ? (type as UploadType)
      : 'post';
    return this.uploadService.uploadImage(file, uploadType);
  }

  @Post('images')
  @ApiOperation({ summary: '批量上传图片', description: '批量上传最多9张图片到MinIO，支持JPEG/PNG/WebP格式，单张最大10MB' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'type', required: false, enum: ['avatar', 'clothing', 'design', 'post', 'outfit-image'], description: '上传类型(默认post)' })
  @ApiResponse({ status: 201, description: '上传成功', type: BatchUploadResponseDto })
  @ApiResponse({ status: 400, description: '文件类型不支持或文件过大' })
  @ApiResponse({ status: 401, description: '未认证' })
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('type') type?: string,
  ): Promise<BatchUploadResponseDto> {
    const uploadType: UploadType = VALID_UPLOAD_TYPES.includes(type as UploadType)
      ? (type as UploadType)
      : 'post';
    return this.uploadService.uploadImages(files, uploadType);
  }

  @Delete(':key')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '删除已上传文件(管理员)', description: '根据文件key删除MinIO中的文件，仅管理员可用' })
  @ApiParam({ name: 'key', description: '文件key' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '文件不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deleteFile(@Param('key') key: string): Promise<{ success: boolean }> {
    await this.uploadService.deleteFile(key);
    return { success: true };
  }
}

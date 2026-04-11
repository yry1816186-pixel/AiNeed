import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import type { UploadType } from './upload.service';
import type {
  UploadResponseDto,
  BatchUploadResponseDto,
} from './dto/upload-response.dto';

const VALID_UPLOAD_TYPES = ['avatar', 'clothing', 'design', 'post'] as const;

@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Upload multiple images (max 9)' })
  @ApiConsumes('multipart/form-data')
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
  @ApiOperation({ summary: 'Delete an uploaded file' })
  async deleteFile(@Param('key') key: string): Promise<{ success: boolean }> {
    await this.uploadService.deleteFile(key);
    return { success: true };
  }
}

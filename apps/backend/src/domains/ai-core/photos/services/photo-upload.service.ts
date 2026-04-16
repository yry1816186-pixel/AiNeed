import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../../../common/prisma/prisma.service';
import { stripExifFromBuffer } from '../../../../common/security/image-sanitizer';
import { MalwareScannerService } from '../../../../common/security/malware-scanner.service';
import { validateImageFile } from '../../../../common/security/upload-validator';
import { ImageProcessingService, GeneratedImage } from '../../../../common/services/image-processing.service';
import { StorageService } from '../../../../common/storage/storage.service';
import { ImageSizeName, DEFAULT_SIZES, getStoragePath } from '../../../../common/utils/image-sizes';

export interface MultiSizeUploadResult {
  id: string;
  urls: Record<ImageSizeName, string>;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
    contentType: string;
  };
}

@Injectable()
export class PhotoUploadService {
  private readonly logger = new Logger(PhotoUploadService.name);

  constructor(
    private readonly imageProcessing: ImageProcessingService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly malwareScanner: MalwareScannerService,
  ) {}

  async uploadMultiSize(
    userId: string,
    file: Express.Multer.File,
    sizes: ImageSizeName[] = DEFAULT_SIZES,
  ): Promise<MultiSizeUploadResult> {
    validateImageFile(file);

    const scanResult = await this.malwareScanner.scanImageBuffer(file.buffer, file.originalname);
    if (!scanResult.safe) {
      throw new BadRequestException(`文件安全扫描未通过: ${scanResult.threats.join(', ')}`);
    }

    const sanitizedBuffer = await stripExifFromBuffer(file.buffer);

    const metadata = await this.imageProcessing.getMetadata(sanitizedBuffer);

    const generatedImages = await this.imageProcessing.generateSizes(sanitizedBuffer, sizes);

    const photoId = uuidv4();

    const urls = await this.uploadSizesToStorage(userId, photoId, generatedImages);

    return {
      id: photoId,
      urls,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        size: metadata.size,
        format: metadata.format,
        contentType: metadata.contentType,
      },
    };
  }

  async deleteMultiSize(userId: string, photoId: string, urls: Record<ImageSizeName, string>): Promise<void> {
    const deletePromises = Object.values(urls).map(url =>
      this.storage.delete(url).catch(err =>
        this.logger.warn(`Failed to delete ${url}: ${err instanceof Error ? err.message : String(err)}`)
      )
    );
    await Promise.all(deletePromises);
  }

  private async uploadSizesToStorage(
    userId: string,
    photoId: string,
    images: GeneratedImage[],
  ): Promise<Record<ImageSizeName, string>> {
    const urls: Partial<Record<ImageSizeName, string>> = {};

    const uploadPromises = images.map(async (image) => {
      const storagePath = getStoragePath(userId, photoId, image.size, image.format);

      await this.storage.uploadBuffer(storagePath, image.buffer, image.contentType);

      const url = await this.storage.getFileUrl(storagePath);
      urls[image.size] = url;
    });

    await Promise.all(uploadPromises);

    return urls as Record<ImageSizeName, string>;
  }
}

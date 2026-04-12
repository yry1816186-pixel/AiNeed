import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import type { IStorageProvider } from './providers/storage-provider.interface';
import { STORAGE_PROVIDER_TOKEN } from './providers/storage-provider.interface';
import { UploadResponseDto, BatchUploadResponseDto } from './dto/upload-response.dto';

export type UploadType = 'avatar' | 'clothing' | 'design' | 'post' | 'outfit-image';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BATCH_COUNT = 9;

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: IStorageProvider,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    type: UploadType = 'post',
  ): Promise<UploadResponseDto> {
    this.validateFile(file);

    const key = this.generateKey(type, file.originalname);
    const result = await this.storageProvider.upload(
      file.buffer,
      key,
      file.mimetype,
    );

    const dimensions = await this.extractDimensions(file.buffer);

    return {
      url: result.url,
      key: result.key,
      size: file.size,
      mimeType: file.mimetype,
      ...dimensions,
    };
  }

  async uploadImages(
    files: Express.Multer.File[],
    type: UploadType = 'post',
  ): Promise<BatchUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    if (files.length > MAX_BATCH_COUNT) {
      throw new BadRequestException(
        `Maximum ${MAX_BATCH_COUNT} files allowed, got ${files.length}`,
      );
    }

    const items = await Promise.all(
      files.map((file) => this.uploadImage(file, type)),
    );

    return { items };
  }

  async deleteFile(key: string): Promise<void> {
    await this.storageProvider.delete(key);
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    mimeType: string,
    _type: UploadType = 'post',
  ): Promise<UploadResponseDto> {
    const result = await this.storageProvider.upload(buffer, key, mimeType);
    const dimensions = await this.extractDimensions(buffer);

    return {
      url: result.url,
      key: result.key,
      size: buffer.length,
      mimeType,
      ...dimensions,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }

    this.validateMagicBytes(file);
  }

  private validateMagicBytes(file: Express.Multer.File): void {
    const expectedBytes = MAGIC_BYTES[file.mimetype];
    if (!expectedBytes || !file.buffer || file.buffer.length < expectedBytes.length) {
      throw new BadRequestException('File content does not match declared type');
    }

    for (let i = 0; i < expectedBytes.length; i++) {
      if (file.buffer[i] !== expectedBytes[i]) {
        throw new BadRequestException('File content does not match declared type');
      }
    }
  }

  private generateKey(type: UploadType, originalName: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const ext = this.extractExtension(originalName);
    const uuid = uuidv4();

    return `${type}/${year}/${month}/${day}/${uuid}.${ext}`;
  }

  private extractExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length < 2) {
      return 'jpg';
    }
    const ext = parts[parts.length - 1].toLowerCase();
    if (ext === 'jpeg') {
      return 'jpg';
    }
    return ext;
  }

  private async extractDimensions(
    buffer: Buffer,
  ): Promise<{ width: number; height: number }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to extract image dimensions: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { width: 0, height: 0 };
    }
  }
}

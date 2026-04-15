import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

import { IMAGE_SIZES, ImageSizeConfig, ImageSizeName, DEFAULT_SIZES } from '../utils/image-sizes';

export interface GeneratedImage {
  size: ImageSizeName;
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  contentType: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  format: string;
  contentType: string;
  density?: number;
  hasAlpha: boolean;
}

export interface OptimizeOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  fit?: 'cover' | 'inside' | 'outside';
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  async generateSizes(buffer: Buffer, sizes: ImageSizeName[] = DEFAULT_SIZES): Promise<GeneratedImage[]> {
    const metadata = await sharp(buffer).metadata();
    const results: GeneratedImage[] = [];

    for (const sizeName of sizes) {
      const config = IMAGE_SIZES[sizeName];
      try {
        const generated = await this.generateSize(buffer, config, metadata);
        results.push(generated);
      } catch (error) {
        this.logger.error(`Failed to generate size '${sizeName}': ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    return results;
  }

  private async generateSize(buffer: Buffer, config: ImageSizeConfig, metadata: sharp.Metadata): Promise<GeneratedImage> {
    let pipeline = sharp(buffer);

    if (config.name === 'original') {
      // original: keep original dimensions, just re-encode
    } else {
      pipeline = pipeline.resize(config.width, config.height, {
        fit: config.fit,
        withoutEnlargement: true,
        ...(config.fit === 'cover' ? { position: sharp.strategy.attention } : {}),
      });
    }

    const webpBuffer = await pipeline
      .webp({ quality: config.quality, effort: 4 })
      .toBuffer();

    const outputMetadata = await sharp(webpBuffer).metadata();

    return {
      size: config.name,
      buffer: webpBuffer,
      width: outputMetadata.width ?? (config.name === 'original' ? metadata.width ?? 0 : config.width),
      height: outputMetadata.height ?? (config.name === 'original' ? metadata.height ?? 0 : config.height),
      format: 'webp',
      contentType: 'image/webp',
    };
  }

  async optimize(buffer: Buffer, options: OptimizeOptions = {}): Promise<Buffer> {
    const { quality = 80, format = 'webp', width, height, fit = 'inside' } = options;

    let pipeline = sharp(buffer);

    if (width || height) {
      pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true });
    }

    switch (format) {
      case 'webp':
        return pipeline.webp({ quality, effort: 4 }).toBuffer();
      case 'jpeg':
        return pipeline.jpeg({ quality }).toBuffer();
      case 'png':
        return pipeline.png({ quality }).toBuffer();
      default:
        return pipeline.webp({ quality, effort: 4 }).toBuffer();
    }
  }

  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(buffer).metadata();

    const formatMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
      tiff: 'image/tiff',
    };

    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      size: metadata.size ?? buffer.length,
      format: metadata.format ?? 'unknown',
      contentType: formatMap[metadata.format ?? ''] ?? 'application/octet-stream',
      density: metadata.density,
      hasAlpha: metadata.hasAlpha ?? false,
    };
  }
}

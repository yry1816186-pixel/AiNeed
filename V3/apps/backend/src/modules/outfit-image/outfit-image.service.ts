import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../stylist/services/llm.service';
import { UploadService } from '../upload/upload.service';
import { GenerateOutfitImageDto, OutfitImageStatus } from './dto/generate-outfit-image.dto';
import { OutfitImageQueryDto } from './dto/outfit-image-query.dto';
import { buildOutfitPrompt } from './prompt-builder';
import type { OutfitImageResponseDto, PaginatedOutfitImageResponseDto } from './dto/outfit-image-response.dto';

type InputJson = import('@prisma/client').Prisma.InputJsonValue;

const IMAGE_COST_FEN = 1;

@Injectable()
export class OutfitImageService {
  private readonly logger = new Logger(OutfitImageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly uploadService: UploadService,
  ) {}

  async generate(userId: string, dto: GenerateOutfitImageDto): Promise<OutfitImageResponseDto> {
    const prompt = buildOutfitPrompt(dto.items, dto.occasion, dto.styleTips);

    const outfitData = {
      items: dto.items,
      occasion: dto.occasion,
      styleTips: dto.styleTips,
    };

    const record = await this.prisma.outfitImage.create({
      data: {
        userId,
        outfitData: outfitData as unknown as InputJson,
        prompt,
        status: OutfitImageStatus.PENDING,
        cost: 0,
      },
    });

    this.processImageGeneration(record.id, prompt).catch((err) => {
      this.logger.error(`Background image generation failed for ${record.id}: ${err instanceof Error ? err.message : String(err)}`);
    });

    return this.serialize(record);
  }

  async getById(id: string, userId: string): Promise<OutfitImageResponseDto> {
    const record = await this.prisma.outfitImage.findUnique({
      where: { id },
    });

    if (!record || record.userId !== userId) {
      throw new NotFoundException('穿搭效果图不存在');
    }

    return this.serialize(record);
  }

  async history(userId: string, query: OutfitImageQueryDto): Promise<PaginatedOutfitImageResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.outfitImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.outfitImage.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async processImageGeneration(recordId: string, prompt: string): Promise<void> {
    try {
      await this.prisma.outfitImage.update({
        where: { id: recordId },
        data: { status: OutfitImageStatus.PROCESSING },
      });

      const imageResponse = await this.llmService.generateImage(prompt, {
        size: '768x1024',
        quality: 'hd',
      });

      const imageUrl = await this.persistImage(imageResponse.url, recordId);

      await this.prisma.outfitImage.update({
        where: { id: recordId },
        data: {
          status: OutfitImageStatus.COMPLETED,
          imageUrl,
          cost: IMAGE_COST_FEN,
          metadata: {
            model: 'glm-5',
            generatedAt: new Date().toISOString(),
          } as unknown as InputJson,
        },
      });

      this.logger.log(`Image generation completed for ${recordId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Image generation failed for ${recordId}: ${message}`);

      await this.prisma.outfitImage.update({
        where: { id: recordId },
        data: {
          status: OutfitImageStatus.FAILED,
          metadata: {
            error: message,
            failedAt: new Date().toISOString(),
          } as unknown as InputJson,
        },
      });
    }
  }

  private async persistImage(remoteUrl: string, recordId: string): Promise<string> {
    try {
      const response = await fetch(remoteUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to download image from ${remoteUrl}, using remote URL directly`);
        return remoteUrl;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') ?? 'image/png';
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';

      const key = this.buildStorageKey(recordId, ext);

      const result = await this.uploadService.uploadBuffer(buffer, key, contentType, 'outfit-image');

      return result.url;
    } catch (error) {
      this.logger.warn(`Failed to persist image: ${error instanceof Error ? error.message : String(error)}, using remote URL`);
      return remoteUrl;
    }
  }

  private buildStorageKey(recordId: string, ext: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `outfit-image/${year}/${month}/${day}/${recordId}.${ext}`;
  }

  private serialize(record: {
    id: string;
    userId: string;
    outfitData: unknown;
    prompt: string | null;
    imageUrl: string | null;
    status: string;
    cost: number;
    metadata: unknown;
    createdAt: Date;
  }): OutfitImageResponseDto {
    const outfitData = record.outfitData as {
      items?: Array<{ name: string; color: string; category: string }>;
      occasion?: string;
      styleTips?: string;
    };

    return {
      id: record.id,
      userId: record.userId,
      items: outfitData?.items ?? [],
      occasion: outfitData?.occasion,
      styleTips: outfitData?.styleTips,
      prompt: record.prompt ?? undefined,
      imageUrl: record.imageUrl ?? undefined,
      status: record.status,
      cost: record.cost,
      metadata: (record.metadata as Record<string, unknown>) ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { AnalysisStatus, PhotoType } from "../../../../types/prisma-enums";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { stripExifFromBuffer } from "../../../common/security/image-sanitizer";
import { MalwareScannerService } from "../../../common/security/malware-scanner.service";
import { validateImageFile as sharedValidateImageFile } from "../../../common/security/upload-validator";
import { StorageService } from "../../../common/storage/storage.service";
import { OnboardingService } from "../../identity/onboarding/onboarding.service";
import { QueueService } from "../../platform/queue/queue.service";

import { AiAnalysisService } from "./services/ai-analysis.service";
import "multer"; // 引入 Express.Multer.File 类型声明

export interface PhotoUploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailDataUri?: string;
  type: PhotoType;
  status: AnalysisStatus;
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly ANALYSIS_TIMEOUT_MS = 120000; // 2 minutes
  private readonly MAX_RETRIES = 2;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private aiAnalysis: AiAnalysisService,
    private configService: ConfigService,
    private malwareScanner: MalwareScannerService,
    private queueService: QueueService,
    @Optional() private onboardingService: OnboardingService | null,
  ) {}

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
    type: PhotoType,
  ): Promise<PhotoUploadResult> {
    this.validateImageFile(file);

    const scanResult = await this.malwareScanner.scanImageBuffer(file.buffer, file.originalname);
    if (!scanResult.safe) {
      throw new BadRequestException(`文件安全扫描未通过: ${scanResult.threats.join(", ")}`);
    }

    const sanitizedBuffer = await stripExifFromBuffer(file.buffer);
    const sanitizedFile = { ...file, buffer: sanitizedBuffer };

    const { url, thumbnailUrl } = await this.storage.uploadEncrypted(
      userId,
      sanitizedFile,
      "photos",
    );

    const photo = await this.prisma.userPhoto.create({
      data: {
        userId,
        type,
        url,
        thumbnailUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        analysisStatus: AnalysisStatus.pending,
      },
    });

    // 使用 BullMQ 队列异步分析照片
    await this.queueService.addImageAnalysisTask(userId, url, 'full');

    // 推进 onboarding 步骤：照片上传完成后从 PHOTO 推进到 STYLE_TEST
    if (this.onboardingService) {
      try {
        await this.onboardingService.skipStep(userId, "PHOTO");
      } catch {
        // 用户可能不在 PHOTO 步骤，忽略错误
      }
    }

    return {
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl ?? undefined,
      type: photo.type,
      status: photo.analysisStatus,
    };
  }

  async getUserPhotos(userId: string, type?: PhotoType) {
    const where: { userId: string; type?: PhotoType } = { userId };
    if (type) {
      where.type = type;
    }

    const photos = await this.prisma.userPhoto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        type: true,
        url: true,
        thumbnailUrl: true,
        originalName: true,
        mimeType: true,
        size: true,
        analysisResult: true,
        analysisStatus: true,
        analyzedAt: true,
        createdAt: true,
      },
    });

    // 批量处理所有 thumbnailDataUri，并行请求
    const photosWithDataUri = await Promise.all(
      photos.map(async (photo: { id: string; url: string | null; thumbnailUrl: string | null; thumbnailDataUri: string | null; analyzedAt: Date | null; createdAt: Date }) => {
        const previewAssetUrl = photo.thumbnailUrl ?? photo.url;

        if (!previewAssetUrl) {
          return { ...photo, thumbnailDataUri: undefined };
        }

        try {
          return {
            ...photo,
            thumbnailDataUri:
              await this.storage.fetchRemoteAssetDataUri(previewAssetUrl),
          };
        } catch (error) {
          this.logger.warn(
            `Failed to build inline thumbnail for ${photo.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return { ...photo, thumbnailDataUri: undefined };
        }
      }),
    );

    return photosWithDataUri;
  }

  async getPhotoById(photoId: string, userId: string) {
    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, userId },
    });

    if (!photo) {
      return photo;
    }

    const previewAssetUrl = photo.thumbnailUrl ?? photo.url;

    if (!previewAssetUrl) {
      return photo;
    }

    try {
      return {
        ...photo,
        thumbnailDataUri:
          await this.storage.fetchRemoteAssetDataUri(previewAssetUrl),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to build inline thumbnail for ${photo.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return photo;
    }
  }

  async getPhotoAsset(
    photoId: string,
    userId: string,
    variant: "original" | "thumbnail",
  ): Promise<{
    body: Buffer;
    contentType: string;
    cacheControl: string;
  }> {
    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, userId },
      select: {
        url: true,
        thumbnailUrl: true,
      },
    });

    if (!photo) {
      throw new NotFoundException("照片不存在");
    }

    const assetUrl =
      variant === "thumbnail" ? photo.thumbnailUrl ?? photo.url : photo.url;

    if (!assetUrl) {
      throw new NotFoundException("照片资产不存在");
    }

    return this.storage.fetchRemoteAsset(assetUrl);
  }

  async deletePhoto(photoId: string, userId: string): Promise<void> {
    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, userId },
    });

    if (!photo) {
      throw new BadRequestException("照片不存在");
    }

    const filename = this.extractFilename(photo.url);
    if (filename) {
      await this.storage.deleteFile(filename);
      if (photo.thumbnailUrl) {
        const thumbnailFilename = this.extractFilename(photo.thumbnailUrl);
        if (thumbnailFilename) {
          await this.storage.deleteFile(thumbnailFilename);
        }
      }
    }

    await this.prisma.userPhoto.delete({ where: { id: photoId } });
  }

  private async analyzePhotoAsync(
    photoId: string,
    imageBuffer: Buffer,
  ): Promise<void> {
    const startTime = Date.now();
    let retryCount = 0;

    const updateStatus = async (
      status: AnalysisStatus,
      result?: Record<string, unknown>,
    ) => {
      await this.prisma.userPhoto.update({
        where: { id: photoId },
        data: {
          analysisStatus: status,
          ...(result && { analysisResult: JSON.parse(JSON.stringify(result)) }),
          ...(status === AnalysisStatus.completed && {
            analyzedAt: new Date(),
          }),
        },
      });
    };

    const analyzeWithTimeout = async (): Promise<Record<string, unknown>> => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(
            new Error(`Analysis timeout after ${this.ANALYSIS_TIMEOUT_MS}ms`),
          );
        }, this.ANALYSIS_TIMEOUT_MS);

        this.aiAnalysis
          .analyzeBodyAndFace(imageBuffer)
          .then((result) => {
            clearTimeout(timeoutId);
            resolve(result as unknown as Record<string, unknown>);
          })
          .catch((error: unknown) => {
            clearTimeout(timeoutId);
            reject(error instanceof Error ? error : new Error(String(error)));
          });
      });
    };

    while (retryCount <= this.MAX_RETRIES) {
      try {
        await updateStatus(AnalysisStatus.processing);

        const imageHash = this.generateImageHash(imageBuffer);

        const cachedResult = await this.prisma.aIAnalysisCache.findUnique({
          where: { imageHash },
        });

        let analysisResult: Record<string, unknown>;

        if (cachedResult && cachedResult.expiresAt > new Date()) {
          analysisResult = cachedResult.result as Record<string, unknown>;
          await this.prisma.aIAnalysisCache.update({
            where: { id: cachedResult.id },
            data: { hitCount: { increment: 1 } },
          });
        } else {
          analysisResult = await analyzeWithTimeout();

          await this.prisma.aIAnalysisCache
            .create({
              data: {
                imageHash,
                analysisType: "body_face",
                result: JSON.parse(JSON.stringify(analysisResult)),
                confidence: (analysisResult.confidence as number) || 0.8,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            })
            .catch((err: Error) =>
              this.logger.warn(`Failed to cache result: ${err.message}`),
            );
        }

        await updateStatus(
          AnalysisStatus.completed,
          JSON.parse(JSON.stringify(analysisResult)),
        );

        await this.updateUserProfile(photoId, analysisResult);

        const duration = Date.now() - startTime;
        this.logger.log(
          `Photo analysis completed for ${photoId} in ${duration}ms`,
        );
        return;
      } catch (error: unknown) {
        retryCount++;
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("timeout") &&
          retryCount <= this.MAX_RETRIES
        ) {
          this.logger.warn(
            `Photo analysis timeout for ${photoId}, retry ${retryCount}/${this.MAX_RETRIES}`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount),
          );
          continue;
        }

        this.logger.error(
          `Photo analysis failed for ${photoId} after ${duration}ms: ${errorMessage}`,
        );
        await updateStatus(AnalysisStatus.failed, { error: errorMessage });
        return;
      }
    }
  }

  private async updateUserProfile(
    photoId: string,
    analysisResult: Record<string, unknown>,
  ) {
    const photo = await this.prisma.userPhoto.findUnique({
      where: { id: photoId },
      select: { userId: true },
    });

    if (!photo) {
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (analysisResult.bodyType) {
      updateData.bodyType = analysisResult.bodyType;
    }
    if (analysisResult.skinTone) {
      updateData.skinTone = analysisResult.skinTone;
    }
    if (analysisResult.faceShape) {
      updateData.faceShape = analysisResult.faceShape;
    }
    if (analysisResult.colorSeason) {
      updateData.colorSeason = analysisResult.colorSeason;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.userProfile.upsert({
        where: { userId: photo.userId },
        create: {
          userId: photo.userId,
          ...updateData,
        },
        update: updateData,
      });
    }
  }

  private validateImageFile(file: Express.Multer.File): void {
    sharedValidateImageFile(file);
  }

  private generateImageHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  private extractFilename(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split("/");
      return parts.slice(-2).join("/");
    } catch (error) {
      this.logger.warn(
        `Failed to extract filename from URL '${url.substring(0, 100)}': ${error instanceof Error ? error.message : String(error)}. Using original value as fallback.`,
      );
      return url; // Return original URL as fallback instead of null
    }
  }

  /**
   * Recovery cron: retry photos stuck in "processing" status for over 10 minutes.
   * Runs every 10 minutes. Resets stuck photos to "pending" so they can be re-analyzed.
   */
  @Cron("*/10 * * * *")
  async recoverStuckAnalyses(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const stuckPhotos = await this.prisma.userPhoto.findMany({
      where: {
        analysisStatus: AnalysisStatus.processing,
        createdAt: { lt: tenMinutesAgo },
      },
      take: 20,
    });

    if (stuckPhotos.length === 0) {return;}

    this.logger.warn(`Found ${stuckPhotos.length} photos stuck in processing, resetting to pending`);

    await this.prisma.userPhoto.updateMany({
      where: {
        id: { in: stuckPhotos.map((p: any) => p.id) },
      },
      data: {
        analysisStatus: AnalysisStatus.pending,
      },
    });
  }
}

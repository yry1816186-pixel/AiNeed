import crypto from "crypto";

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AnalysisStatus, PhotoType } from "@prisma/client";

import { PrismaService } from "../../common/prisma/prisma.service";
import { StorageService } from "../../common/storage/storage.service";

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
  ) {}

  async uploadPhoto(
    userId: string,
    file: Express.Multer.File,
    type: PhotoType,
  ): Promise<PhotoUploadResult> {
    this.validateImageFile(file);

    const { url, thumbnailUrl } = await this.storage.uploadImage(
      file,
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

    this.analyzePhotoAsync(photo.id, file.buffer);

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
      photos.map(async (photo) => {
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
      throw new NotFoundException("鐓х墖涓嶅瓨鍦?");
    }

    const assetUrl =
      variant === "thumbnail" ? photo.thumbnailUrl ?? photo.url : photo.url;

    if (!assetUrl) {
      throw new NotFoundException("鐓х墖璧勪骇涓嶅瓨鍦?");
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
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
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
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("仅支持 JPEG、PNG 和 WebP 格式的图片");
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("图片大小不能超过 10MB");
    }

    if (!this.validateMagicBytes(file.buffer)) {
      throw new BadRequestException("文件内容与声明类型不匹配，可能存在安全风险");
    }
  }

  private validateMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 4) {
      return false;
    }

    const jpegSignature = [0xff, 0xd8, 0xff];
    const pngSignature = [0x89, 0x50, 0x4e, 0x47];
    const webpSignature = [0x52, 0x49, 0x46, 0x46];

    const firstBytes = Array.from(buffer.slice(0, 4));

    const isJpeg = jpegSignature.every((byte, index) => firstBytes[index] === byte);
    const isPng = pngSignature.every((byte, index) => firstBytes[index] === byte);
    const isWebpRiff = webpSignature.every((byte, index) => firstBytes[index] === byte);

    if (isWebpRiff && buffer.length >= 12) {
      const webpMarker = buffer.slice(8, 12).toString("ascii");
      if (webpMarker === "WEBP") {
        return true;
      }
    }

    return isJpeg || isPng;
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
}

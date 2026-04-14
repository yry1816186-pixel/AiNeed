import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { NotificationService } from "../../common/gateway/notification.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StorageService } from "../../common/storage/storage.service";
import { TryOnOrchestratorService } from "../try-on/services/tryon-orchestrator.service";
import { ContentModerationService } from "../community/content-moderation.service";

import { QUEUE_NAMES, JOB_STATUS } from "./queue.constants";
import { QueueName } from "./queue-config";
import { generateStableCacheKey } from "../try-on/services/ai-tryon-provider.interface";

interface VirtualTryOnJobData {
  jobId: string;
  userId: string;
  type: "virtual_tryon";
  photoId: string;
  userPhotoUrl: string;
  itemId: string;
  clothingImageUrl: string;
  category?: string;
  createdAt: string;
}

interface StyleAnalysisJobData {
  jobId: string;
  userId: string;
  type: "style_analysis";
  userInput: string;
  userProfile?: Record<string, unknown>;
  createdAt: string;
}

interface WardrobeMatchJobData {
  jobId: string;
  userId: string;
  type: "wardrobe_match";
  wardrobeItems: string[];
  targetStyle?: string;
  occasion?: string;
  season?: string;
  createdAt: string;
}

function mapTryOnCategory(
  category?: string,
): "upper_body" | "lower_body" | "full_body" | "dress" | undefined {
  const normalized = (category ?? "").trim().toLowerCase();

  switch (normalized) {
    case "tops":
    case "outerwear":
    case "upper_body":
      return "upper_body";
    case "bottoms":
    case "lower_body":
      return "lower_body";
    case "dresses":
    case "dress":
      return "dress";
    case "activewear":
    case "swimwear":
    case "full_body":
      return "full_body";
    default:
      return undefined;
  }
}

@Processor(QUEUE_NAMES.AI_TASKS, { concurrency: 1 })
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing AI task job ${job.id}`);
    return { jobId: job.id, status: "completed" };
  }
}

@Processor(QUEUE_NAMES.STYLE_ANALYSIS, { concurrency: 2 })
export class StyleAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(StyleAnalysisProcessor.name);

  async process(job: Job<StyleAnalysisJobData>): Promise<unknown> {
    this.logger.log(`Processing style analysis job ${job.data.jobId}`);
    return { jobId: job.data.jobId, status: "completed" };
  }
}

const VIRTUAL_TRYON_TIMEOUT = 30000;

@Processor(QUEUE_NAMES.VIRTUAL_TRYON, {
  concurrency: 3,
})
export class VirtualTryOnProcessor extends WorkerHost {
  private readonly logger = new Logger(VirtualTryOnProcessor.name);

  constructor(
    private notificationService: NotificationService,
    private tryOnOrchestratorService: TryOnOrchestratorService,
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<VirtualTryOnJobData>): Promise<unknown> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Virtual try-on timed out after 30s")),
        VIRTUAL_TRYON_TIMEOUT,
      ),
    );

    return Promise.race([this.executeTryOnFlow(job), timeoutPromise]);
  }

  private async executeTryOnFlow(
    job: Job<VirtualTryOnJobData>,
  ): Promise<unknown> {
    const { jobId, userId, photoId, userPhotoUrl, clothingImageUrl, itemId } =
      job.data;

    this.logger.log(`Processing virtual try-on job ${jobId}`);

    const tryOnRecord = await this.prisma.virtualTryOn.findFirst({
      where: {
        userId,
        photoId,
        itemId,
        status: { in: ["pending", "processing"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!tryOnRecord) {
      this.logger.warn(
        `No pending VirtualTryOn record found for job ${jobId}`,
      );
      throw new Error(
        `No pending VirtualTryOn record for userId=${userId}, photoId=${photoId}, itemId=${itemId}`,
      );
    }

    await this.prisma.virtualTryOn.update({
      where: { id: tryOnRecord.id },
      data: { status: "processing" },
    });

    await this.notificationService.notifyTryOnProgress(
      userId,
      tryOnRecord.id,
      10,
      "processing",
    );

    await job.updateProgress(10);

    if (!userPhotoUrl || !clothingImageUrl) {
      throw new Error(
        "userPhotoUrl and clothingImageUrl are required for virtual try-on",
      );
    }

    const category = mapTryOnCategory(job.data.category);
    const cacheKey = generateStableCacheKey(photoId, itemId, category);

    await this.notificationService.notifyTryOnProgress(
      userId,
      tryOnRecord.id,
      30,
      "generating",
    );
    await job.updateProgress(30);

    const result = await this.tryOnOrchestratorService.executeTryOn(
      {
        personImageUrl: userPhotoUrl,
        garmentImageUrl: clothingImageUrl,
        category,
      },
      cacheKey,
    );

    await this.notificationService.notifyTryOnProgress(
      userId,
      tryOnRecord.id,
      70,
      "generating",
    );
    await job.updateProgress(70);

    await this.prisma.virtualTryOn.update({
      where: { id: tryOnRecord.id },
      data: {
        status: "completed",
        resultImageUrl: result.resultImageUrl,
        completedAt: new Date(),
        provider: result.provider,
        processingTime: result.processingTime,
        confidence: result.confidence,
      },
    });

    // Generate watermarked version asynchronously (non-blocking)
    this.storageService.generateWatermarkedImage(
      result.resultImageUrl,
      "寻裳 AI 试衣",
    ).then(async (watermarkedUrl) => {
      await this.prisma.virtualTryOn.update({
        where: { id: tryOnRecord.id },
        data: { watermarkedImageUrl: watermarkedUrl },
      });
      this.logger.debug(`Watermarked image saved for try-on ${tryOnRecord.id}`);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to generate watermark for ${tryOnRecord.id}: ${msg}`);
    });

    await this.notificationService.notifyTryOnProgress(
      userId,
      tryOnRecord.id,
      90,
      "processing",
    );
    await job.updateProgress(90);

    return {
      jobId,
      tryOnId: tryOnRecord.id,
      resultImageUrl: result.resultImageUrl,
      provider: result.provider,
      confidence: result.confidence,
      processingTime: result.processingTime,
    };
  }

  @OnWorkerEvent("completed")
  async onCompleted(job: Job<VirtualTryOnJobData>) {
    const { jobId, userId } = job.data;
    const result = job.returnvalue as { tryOnId: string; resultImageUrl: string };

    this.logger.log(`Virtual try-on job ${jobId} completed`);

    await this.notificationService.notifyTryOnComplete(
      userId,
      result.tryOnId,
      result.resultImageUrl,
    );

    // Auto-archive completed try-on to inspiration wardrobe
    try {
      const tryOn = await this.prisma.virtualTryOn.findUnique({
        where: { id: result.tryOnId },
        select: { resultImageUrl: true, watermarkedImageUrl: true },
      });

      if (tryOn?.resultImageUrl) {
        const existingCollection = await this.prisma.wardrobeCollection.findFirst({
          where: { userId, name: "AI试衣效果" },
        });

        const collection = existingCollection
          ? existingCollection
          : await this.prisma.wardrobeCollection.create({
              data: { userId, name: "AI试衣效果", icon: "sparkles", isDefault: false },
            });

        const alreadyArchived = await this.prisma.wardrobeCollectionItem.findFirst({
          where: { collectionId: collection.id, itemType: "try_on", itemId: result.tryOnId },
        });

        if (!alreadyArchived) {
          await this.prisma.wardrobeCollectionItem.create({
            data: { userId, collectionId: collection.id, itemType: "try_on", itemId: result.tryOnId },
          });
          this.logger.log(`Auto-archived try-on ${result.tryOnId} to wardrobe for user ${userId}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to auto-archive try-on ${result.tryOnId}: ${msg}`);
    }
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<VirtualTryOnJobData>, error: Error) {
    const { jobId, userId, photoId, itemId } = job.data;

    this.logger.error(`Virtual try-on job ${jobId} failed: ${error.message}`);

    const tryOnRecord = await this.prisma.virtualTryOn.findFirst({
      where: {
        userId,
        photoId,
        itemId,
        status: "processing",
      },
      orderBy: { createdAt: "desc" },
    });

    if (tryOnRecord) {
      await this.prisma.virtualTryOn.update({
        where: { id: tryOnRecord.id },
        data: {
          status: "failed",
          errorMessage: error.message,
        },
      });
    }

    await this.notificationService.sendCustomNotification(userId, {
      type: "system",
      title: "虚拟试衣失败",
      message: `您的虚拟试衣处理失败：${error.message}`,
      data: { jobId, status: JOB_STATUS.FAILED, error: error.message },
    });
  }
}

@Processor(QUEUE_NAMES.WARDROBE_MATCH)
export class WardrobeMatchProcessor extends WorkerHost {
  private readonly logger = new Logger(WardrobeMatchProcessor.name);

  async process(job: Job<WardrobeMatchJobData>): Promise<unknown> {
    this.logger.log(`Processing wardrobe match job ${job.data.jobId}`);
    return { jobId: job.data.jobId, status: "completed" };
  }
}

@Processor(QueueName.CONTENT_MODERATION)
export class ContentModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentModerationProcessor.name);

  constructor(private readonly contentModerationService: ContentModerationService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing content moderation job ${job.id}`);
    await this.contentModerationService.processModerationQueue(job);
    return { jobId: job.id, status: "completed" };
  }
}

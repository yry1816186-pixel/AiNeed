import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { NotificationService } from '../../common/gateway/notification.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AIIntegrationService } from '../ai/services/ai-integration.service';
import { StyleUnderstandingService } from '../ai/services/style-understanding.service';
import { TryOnOrchestratorService } from '../try-on/services/tryon-orchestrator.service';

import { QUEUE_NAMES, JOB_STATUS } from './queue.constants';

interface JobData {
  jobId: string;
  userId: string;
  type: string;
  // AI Task fields
  userInput?: string;
  userProfile?: Record<string, unknown>;
  occasion?: string;
  category?: string;
  topK?: number;
  imagePath?: string;
  // Virtual Try-On fields
  photoId?: string;
  userPhotoUrl?: string;
  clothingImageUrl?: string;
  // Wardrobe Match fields
  wardrobeItems?: string[];
  targetStyle?: string;
  season?: string;
}

function getTaskTypeName(type: string): string {
  const names: Record<string, string> = {
    style_analysis: 'Style Analysis',
    virtual_tryon: 'Virtual Try-On',
    wardrobe_match: 'Wardrobe Match',
    image_analysis: 'Image Analysis',
    body_analysis: 'Body Analysis',
    recommendation: 'Recommendation',
  };
  return names[type] || type;
}

function normalizeText(value?: string): string {
  return value?.trim().toLowerCase() || '';
}

function collectStringValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringValues(item));
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectStringValues(item),
    );
  }

  return [];
}

function mapTryOnCategory(
  category?: string,
): 'upper_body' | 'lower_body' | 'full_body' | 'dress' | undefined {
  const normalized = normalizeText(category);

  switch (normalized) {
    case 'tops':
    case 'outerwear':
    case 'upper_body':
      return 'upper_body';
    case 'bottoms':
    case 'lower_body':
      return 'lower_body';
    case 'dresses':
    case 'dress':
      return 'dress';
    case 'activewear':
    case 'swimwear':
    case 'full_body':
      return 'full_body';
    default:
      return undefined;
  }
}

/**
 * BullMQ Processor for AI Tasks queue
 */
@Processor(QUEUE_NAMES.AI_TASKS, {
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private notificationService: NotificationService,
    private aiIntegrationService: AIIntegrationService,
    private styleUnderstandingService: StyleUnderstandingService,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<unknown> {
    const { jobId, userId, type } = job.data;

    this.logger.log(`Processing job ${jobId} of type ${type}`);

    // Notify user that processing has started
    await this.notificationService.sendCustomNotification(userId, {
      type: 'system',
      title: 'Task Started',
      message: `Your ${getTaskTypeName(type)} has started processing`,
      data: { jobId, type, status: JOB_STATUS.PROCESSING },
    });

    await job.updateProgress(10);
    let result: unknown;

    switch (type) {
      case 'recommendation':
        await job.updateProgress(45);
        result = await this.styleUnderstandingService.getRecommendations(
          job.data.userInput ?? '',
          {
            userProfile: job.data.userProfile,
            occasion: job.data.occasion,
            category: job.data.category,
            topK: job.data.topK,
          },
        );
        break;
      case 'image_analysis':
        await job.updateProgress(45);
        if (!job.data.imagePath) {
          throw new Error('imagePath is required for image_analysis task');
        }
        result = await this.aiIntegrationService.analyzeImage(job.data.imagePath);
        break;
      case 'body_analysis':
        await job.updateProgress(45);
        if (!job.data.imagePath) {
          throw new Error('imagePath is required for body_analysis task');
        }
        result = await this.aiIntegrationService.analyzeBody(job.data.imagePath);
        break;
      default:
        throw new Error(`Unsupported AI task type: ${type}`);
    }

    await job.updateProgress(100);

    return {
      jobId,
      status: JOB_STATUS.COMPLETED,
      processedAt: new Date().toISOString(),
      result,
    };
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<JobData>) {
    const { jobId, userId, type } = job.data;

    this.logger.log(`Job ${jobId} completed successfully`);

    await this.notificationService.sendCustomNotification(userId, {
      type: 'system',
      title: 'Task Completed',
      message: `Your ${getTaskTypeName(type)} has been completed`,
      data: {
        jobId,
        type,
        status: JOB_STATUS.COMPLETED,
        result: job.returnvalue,
      },
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<JobData>, error: Error) {
    const { jobId, userId, type } = job.data;

    this.logger.error(`Job ${jobId} failed: ${error.message}`);

    await this.notificationService.sendCustomNotification(userId, {
      type: 'system',
      title: 'Task Failed',
      message: `Your ${getTaskTypeName(type)} failed: ${error.message}`,
      data: {
        jobId,
        type,
        status: JOB_STATUS.FAILED,
        error: error.message,
      },
    });
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<JobData>, progress: number) {
    this.logger.debug(`Job ${job.data.jobId} progress: ${progress}%`);
  }
}

/**
 * Processor for Style Analysis queue
 */
@Processor(QUEUE_NAMES.STYLE_ANALYSIS, {
  concurrency: 3,
})
export class StyleAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(StyleAnalysisProcessor.name);

  constructor(
    private notificationService: NotificationService,
    private styleUnderstandingService: StyleUnderstandingService,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<unknown> {
    const { jobId, userId, type, userInput, userProfile } = job.data;

    this.logger.log(`Processing style analysis job ${jobId}`);

    // Notify processing started
    await this.notificationService.sendCustomNotification(userId, {
      type: 'system',
      title: 'Style Analysis Started',
      message: 'Your style analysis has started processing',
      data: { jobId, status: JOB_STATUS.PROCESSING },
    });

    await job.updateProgress(30);
    const analysis = await this.styleUnderstandingService.analyzeStyle(
      userInput ?? '',
      userProfile,
    );
    await job.updateProgress(100);

    return {
      jobId,
      styleName: analysis.style_name,
      confidence: analysis.confidence,
      coreElements: analysis.core_elements,
      keyItems: analysis.key_items,
      colorPalette: analysis.color_palette,
      patterns: analysis.patterns,
      materials: analysis.materials,
      occasions: analysis.occasions,
      seasons: analysis.seasons,
      bodyTypeSuggestions: analysis.body_type_suggestions,
      celebrityReferences: analysis.celebrity_references,
      brandReferences: analysis.brand_references,
      priceRange: analysis.price_range,
      similarStyles: analysis.similar_styles,
    };
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<JobData>) {
    this.logger.log(`Style analysis job ${job.data.jobId} completed`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<JobData>, error: Error) {
    this.logger.error(`Style analysis job ${job.data.jobId} failed: ${error.message}`);

    await this.notificationService.sendCustomNotification(job.data.userId, {
      type: 'system',
      title: 'Style Analysis Failed',
      message: `Your style analysis failed: ${error.message}`,
      data: { jobId: job.data.jobId, status: JOB_STATUS.FAILED },
    });
  }
}

/**
 * Processor for Virtual Try-On queue
 */
@Processor(QUEUE_NAMES.VIRTUAL_TRYON, {
  concurrency: 2, // Lower concurrency for GPU-intensive tasks
})
export class VirtualTryOnProcessor extends WorkerHost {
  private readonly logger = new Logger(VirtualTryOnProcessor.name);

  constructor(
    private notificationService: NotificationService,
    private tryOnOrchestratorService: TryOnOrchestratorService,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<unknown> {
    const { jobId, userId, photoId, userPhotoUrl, clothingImageUrl } = job.data;

    this.logger.log(`Processing virtual try-on job ${jobId}`);

    await this.notificationService.sendCustomNotification(userId, {
      type: 'system',
      title: 'Virtual Try-On Started',
      message: 'Your virtual try-on has started processing',
      data: { jobId, status: JOB_STATUS.PROCESSING },
    });

    await job.updateProgress(25);
    if (!userPhotoUrl || !clothingImageUrl) {
      throw new Error('userPhotoUrl and clothingImageUrl are required for virtual try-on');
    }
    const result = await this.tryOnOrchestratorService.executeTryOn({
      personImageUrl: userPhotoUrl,
      garmentImageUrl: clothingImageUrl,
      category: mapTryOnCategory(job.data.category),
    });
    await job.updateProgress(75);
    await job.updateProgress(100);

    return {
      jobId,
      tryOnId: `tryon-${jobId}`,
      resultImageUrl: result.resultImageUrl,
      provider: result.provider,
      confidence: result.confidence,
      processingTime: result.processingTime,
    };
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<JobData>) {
    this.logger.log(`Virtual try-on job ${job.data.jobId} completed`);

    await this.notificationService.sendCustomNotification(job.data.userId, {
      type: 'system',
      title: 'Virtual Try-On Ready',
      message: 'Your virtual try-on result is ready!',
      data: {
        jobId: job.data.jobId,
        status: JOB_STATUS.COMPLETED,
        result: job.returnvalue,
      },
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<JobData>, error: Error) {
    this.logger.error(`Virtual try-on job ${job.data.jobId} failed: ${error.message}`);

    await this.notificationService.sendCustomNotification(job.data.userId, {
      type: 'system',
      title: 'Virtual Try-On Failed',
      message: `Your virtual try-on failed: ${error.message}`,
      data: { jobId: job.data.jobId, status: JOB_STATUS.FAILED },
    });
  }
}

/**
 * Processor for Wardrobe Match queue
 */
@Processor(QUEUE_NAMES.WARDROBE_MATCH, {
  concurrency: 5,
})
export class WardrobeMatchProcessor extends WorkerHost {
  private readonly logger = new Logger(WardrobeMatchProcessor.name);

  constructor(
    private notificationService: NotificationService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<unknown> {
    const { jobId, wardrobeItems, targetStyle, occasion, season } = job.data;

    this.logger.log(`Processing wardrobe match job ${jobId}`);

    await job.updateProgress(20);
    const items = await this.prisma.clothingItem.findMany({
      where: {
        id: { in: wardrobeItems },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        tags: true,
        attributes: true,
        viewCount: true,
        likeCount: true,
      },
    });
    await job.updateProgress(60);

    const normalizedTargetStyle = normalizeText(targetStyle);
    const normalizedOccasion = normalizeText(occasion);
    const normalizedSeason = normalizeText(season);

    const matches = items
      .map((item) => {
        const attributeValues = collectStringValues(item.attributes);
        const searchableValues = [
          ...item.tags,
          ...attributeValues,
        ].map((value) => normalizeText(value));
        const reasons: string[] = [];
        let score = 40;

        if (
          normalizedTargetStyle &&
          searchableValues.some((value) => value.includes(normalizedTargetStyle))
        ) {
          score += 25;
          reasons.push('匹配目标风格');
        }

        if (
          normalizedOccasion &&
          searchableValues.some((value) => value.includes(normalizedOccasion))
        ) {
          score += 20;
          reasons.push('适合当前场景');
        }

        if (
          normalizedSeason &&
          searchableValues.some((value) => value.includes(normalizedSeason))
        ) {
          score += 15;
          reasons.push('适合当前季节');
        }

        score += Math.min(item.viewCount / 100, 10);
        score += Math.min(item.likeCount / 50, 10);

        if (reasons.length === 0) {
          reasons.push('基于现有衣橱活跃度排序');
        }

        return {
          itemId: item.id,
          score: Number(Math.min(score, 100).toFixed(2)),
          reasons,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    await job.updateProgress(100);

    return {
      jobId,
      matches,
      suggestions: [
        targetStyle ? `优先保留更符合“${targetStyle}”风格的单品` : '优先保留风格标签更明确的单品',
        occasion ? `围绕“${occasion}”场景组合上装、下装和外套` : '优先组合能覆盖更多日常场景的单品',
        season ? `当前季节优先选择更适配“${season}”的材质和版型` : '优先选择近期互动更高、可复用性更强的单品',
      ],
    };
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job<JobData>) {
    this.logger.log(`Wardrobe match job ${job.data.jobId} completed`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<JobData>, error: Error) {
    this.logger.error(`Wardrobe match job ${job.data.jobId} failed: ${error.message}`);

    await this.notificationService.sendCustomNotification(job.data.userId, {
      type: 'system',
      title: 'Wardrobe Match Failed',
      message: `Your wardrobe match failed: ${error.message}`,
      data: { jobId: job.data.jobId, status: JOB_STATUS.FAILED },
    });
  }
}

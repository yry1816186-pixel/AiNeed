import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../../../common/prisma/prisma.service';

import {
  JOB_STATUS,
} from './queue.constants';
import type { JobStatus } from './queue.constants';
import { QueueName } from './queue-config';
import {
  JobResult,
  TaskCreatedResponse,
  StyleAnalysisJobData,
  VirtualTryOnJobData,
  WardrobeMatchJobData,
  RecommendationJobData,
  ImageAnalysisJobData,
  BodyAnalysisJobData,
} from './queue.interfaces';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QueueName.AI_TASKS) private aiTasksQueue: Queue,
    @InjectQueue(QueueName.STYLE_ANALYSIS) private styleAnalysisQueue: Queue,
    @InjectQueue(QueueName.VIRTUAL_TRYON) private virtualTryOnQueue: Queue,
    @InjectQueue(QueueName.WARDROBE_MATCH) private wardrobeMatchQueue: Queue,
    @InjectQueue(QueueName.BODY_ANALYSIS) private bodyAnalysisQueue: Queue,
    @InjectQueue(QueueName.PHOTO_PROCESSING) private photoProcessingQueue: Queue,
    @InjectQueue(QueueName.AI_GENERATION) private aiGenerationQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue,
    @InjectQueue(QueueName.DATA_EXPORT) private dataExportQueue: Queue,
    @InjectQueue(QueueName.CONTENT_MODERATION) private contentModerationQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Queue service initialized with BullMQ');

    // Log queue status on startup - includes all queues from QueueName enum
    const queues = [
      { name: QueueName.AI_TASKS, queue: this.aiTasksQueue },
      { name: QueueName.STYLE_ANALYSIS, queue: this.styleAnalysisQueue },
      { name: QueueName.VIRTUAL_TRYON, queue: this.virtualTryOnQueue },
      { name: QueueName.WARDROBE_MATCH, queue: this.wardrobeMatchQueue },
      { name: QueueName.BODY_ANALYSIS, queue: this.bodyAnalysisQueue },
      { name: QueueName.PHOTO_PROCESSING, queue: this.photoProcessingQueue },
      { name: QueueName.AI_GENERATION, queue: this.aiGenerationQueue },
      { name: QueueName.NOTIFICATION, queue: this.notificationQueue },
      { name: QueueName.DATA_EXPORT, queue: this.dataExportQueue },
      { name: QueueName.CONTENT_MODERATION, queue: this.contentModerationQueue },
    ];

    for (const { name, queue } of queues) {
      const counts = await queue.getJobCounts();
      this.logger.log(`Queue ${name}: ${JSON.stringify(counts)}`);
    }
  }

  /**
   * Add a style analysis task to the queue
   */
  async addStyleAnalysisTask(
    userId: string,
    userInput: string,
    userProfile?: StyleAnalysisJobData['userProfile'],
  ): Promise<TaskCreatedResponse> {
    const jobId = uuidv4();
    const jobData: StyleAnalysisJobData = {
      jobId,
      userId,
      type: 'style_analysis',
      userInput,
      userProfile,
      createdAt: new Date().toISOString(),
    };

    await this.styleAnalysisQueue.add('style-analysis', jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(`Style analysis job ${jobId} added to queue`);

    return {
      jobId,
      status: JOB_STATUS.PENDING,
      estimatedWaitTime: 10,
      message: 'Style analysis task queued successfully',
    };
  }

  /**
   * Add a virtual try-on task to the queue
   */
  async addVirtualTryOnTask(
    userId: string,
    photoId: string,
    itemId: string,
    category?: string,
  ): Promise<TaskCreatedResponse> {
    const [photo, item] = await Promise.all([
      this.prisma.userPhoto.findFirst({
        where: { id: photoId, userId },
        select: { url: true },
      }),
      this.prisma.clothingItem.findUnique({
        where: { id: itemId },
        select: { images: true, mainImage: true, category: true },
      }),
    ]);

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (!item) {
      throw new NotFoundException('Clothing item not found');
    }

    const clothingImageUrl = item.mainImage || item.images[0] || "";
    if (!clothingImageUrl) {
      throw new BadRequestException('Clothing item has no usable image');
    }

    const jobId = uuidv4();
    const jobData: VirtualTryOnJobData = {
      jobId,
      userId,
      type: 'virtual_tryon',
      photoId,
      userPhotoUrl: photo.url,
      itemId,
      clothingImageUrl,
      category: category || item.category,
      createdAt: new Date().toISOString(),
    };

    await this.virtualTryOnQueue.add('virtual-tryon', jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(`Virtual try-on job ${jobId} added to queue`);

    return {
      jobId,
      status: JOB_STATUS.PENDING,
      estimatedWaitTime: 45,
      message: 'Virtual try-on task queued successfully',
    };
  }

  /**
   * Add a wardrobe match task to the queue
   */
  async addWardrobeMatchTask(
    userId: string,
    wardrobeItems: string[],
    targetStyle?: string,
    occasion?: string,
    season?: string,
  ): Promise<TaskCreatedResponse> {
    const jobId = uuidv4();
    const jobData: WardrobeMatchJobData = {
      jobId,
      userId,
      type: 'wardrobe_match',
      wardrobeItems,
      targetStyle,
      occasion,
      season,
      createdAt: new Date().toISOString(),
    };

    await this.wardrobeMatchQueue.add('wardrobe-match', jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(`Wardrobe match job ${jobId} added to queue`);

    return {
      jobId,
      status: JOB_STATUS.PENDING,
      estimatedWaitTime: 5,
      message: 'Wardrobe match task queued successfully',
    };
  }

  /**
   * Add a recommendation task to the queue
   */
  async addRecommendationTask(
    userId: string,
    userInput: string,
    userProfile?: Record<string, unknown>,
    occasion?: string,
    category?: string,
    topK?: number,
  ): Promise<TaskCreatedResponse> {
    const jobId = uuidv4();
    const jobData: RecommendationJobData = {
      jobId,
      userId,
      type: 'recommendation',
      userInput,
      userProfile,
      occasion,
      category,
      topK: topK || 10,
      createdAt: new Date().toISOString(),
    };

    await this.aiTasksQueue.add('recommendation', jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(`Recommendation job ${jobId} added to queue`);

    return {
      jobId,
      status: JOB_STATUS.PENDING,
      estimatedWaitTime: 15,
      message: 'Recommendation task queued successfully',
    };
  }

  /**
   * Add an image analysis task to the queue
   */
  async addImageAnalysisTask(
    userId: string,
    imagePath: string,
    analysisType: ImageAnalysisJobData['analysisType'] = 'full',
  ): Promise<TaskCreatedResponse> {
    const jobId = uuidv4();
    const jobData: ImageAnalysisJobData = {
      jobId,
      userId,
      type: 'image_analysis',
      imagePath,
      analysisType,
      createdAt: new Date().toISOString(),
    };

    await this.aiTasksQueue.add('image-analysis', jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(`Image analysis job ${jobId} added to queue`);

    return {
      jobId,
      status: JOB_STATUS.PENDING,
      estimatedWaitTime: 10,
      message: 'Image analysis task queued successfully',
    };
  }

  /**
   * Add a body analysis task to the queue
   */
  async addBodyAnalysisTask(
    userId: string,
    imagePath: string,
  ): Promise<TaskCreatedResponse> {
    const jobId = uuidv4();
    const jobData: BodyAnalysisJobData = {
      jobId,
      userId,
      type: 'body_analysis',
      imagePath,
      createdAt: new Date().toISOString(),
    };

    await this.aiTasksQueue.add('body-analysis', jobData, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(`Body analysis job ${jobId} added to queue`);

    return {
      jobId,
      status: JOB_STATUS.PENDING,
      estimatedWaitTime: 15,
      message: 'Body analysis task queued successfully',
    };
  }

  /**
   * Get job status by jobId
   */
  async getJobStatus(jobId: string): Promise<JobResult | null> {
    // Try to find job in all queues
    const queues = [
      this.aiTasksQueue,
      this.styleAnalysisQueue,
      this.virtualTryOnQueue,
      this.wardrobeMatchQueue,
      this.bodyAnalysisQueue,
      this.photoProcessingQueue,
      this.aiGenerationQueue,
      this.notificationQueue,
      this.dataExportQueue,
      this.contentModerationQueue,
    ];

    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return this.mapJobToResult(job);
      }
    }

    return null;
  }

  /**
   * Map BullMQ job to JobResult
   */
  private mapJobToResult(job: Job, state?: string): JobResult {
    let status: string;

    switch (state) {
      case 'completed':
        status = JOB_STATUS.COMPLETED;
        break;
      case 'failed':
        status = JOB_STATUS.FAILED;
        break;
      case 'delayed':
      case 'waiting':
      case 'pending':
        status = JOB_STATUS.PENDING;
        break;
      case 'active':
        status = JOB_STATUS.PROCESSING;
        break;
      default:
        // Infer state from job properties
        if (job.finishedOn) {
          status = job.failedReason ? JOB_STATUS.FAILED : JOB_STATUS.COMPLETED;
        } else if (job.processedOn) {
          status = JOB_STATUS.PROCESSING;
        } else {
          status = JOB_STATUS.PENDING;
        }
    }

    return {
      jobId: job.id || '',
      status: status as JobStatus,
      result: job.returnvalue,
      error: job.failedReason,
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
    };
  }

  /**
   * Get jobs by user ID
   */
  async getUserJobs(userId: string, limit: number = 20): Promise<JobResult[]> {
    const allJobs: JobResult[] = [];
    const queues = [
      this.aiTasksQueue,
      this.styleAnalysisQueue,
      this.virtualTryOnQueue,
      this.wardrobeMatchQueue,
      this.bodyAnalysisQueue,
      this.photoProcessingQueue,
      this.aiGenerationQueue,
      this.notificationQueue,
      this.dataExportQueue,
      this.contentModerationQueue,
    ];

    for (const queue of queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(0, limit),
        queue.getActive(0, limit),
        queue.getCompleted(0, limit),
        queue.getFailed(0, limit),
      ]);

      const jobs = [...waiting, ...active, ...completed, ...failed]
        .filter((job) => job.data.userId === userId)
        .slice(0, limit);

      allJobs.push(...jobs.map((job) => this.mapJobToResult(job)));
    }

    return allJobs.slice(0, limit);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    const queues = [
      this.aiTasksQueue,
      this.styleAnalysisQueue,
      this.virtualTryOnQueue,
      this.wardrobeMatchQueue,
      this.bodyAnalysisQueue,
      this.photoProcessingQueue,
      this.aiGenerationQueue,
      this.notificationQueue,
      this.dataExportQueue,
      this.contentModerationQueue,
    ];

    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job?.data.userId === userId) {
        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed') {
          await job.remove();
          this.logger.log(`Job ${jobId} cancelled by user ${userId}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, userId: string): Promise<boolean> {
    const queues = [
      this.aiTasksQueue,
      this.styleAnalysisQueue,
      this.virtualTryOnQueue,
      this.wardrobeMatchQueue,
      this.bodyAnalysisQueue,
      this.photoProcessingQueue,
      this.aiGenerationQueue,
      this.notificationQueue,
      this.dataExportQueue,
      this.contentModerationQueue,
    ];

    for (const queue of queues) {
      const job = await queue.getJob(jobId);
      if (job?.data.userId === userId) {
        const state = await job.getState();
        if (state === 'failed') {
          await job.retry();
          this.logger.log(`Job ${jobId} retried by user ${userId}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, unknown>> {
    const stats: Record<string, unknown> = {};

    const queues = [
      { name: QueueName.AI_TASKS, queue: this.aiTasksQueue },
      { name: QueueName.STYLE_ANALYSIS, queue: this.styleAnalysisQueue },
      { name: QueueName.VIRTUAL_TRYON, queue: this.virtualTryOnQueue },
      { name: QueueName.WARDROBE_MATCH, queue: this.wardrobeMatchQueue },
      { name: QueueName.BODY_ANALYSIS, queue: this.bodyAnalysisQueue },
      { name: QueueName.PHOTO_PROCESSING, queue: this.photoProcessingQueue },
      { name: QueueName.AI_GENERATION, queue: this.aiGenerationQueue },
      { name: QueueName.NOTIFICATION, queue: this.notificationQueue },
      { name: QueueName.DATA_EXPORT, queue: this.dataExportQueue },
      { name: QueueName.CONTENT_MODERATION, queue: this.contentModerationQueue },
    ];

    for (const { name, queue } of queues) {
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      );
      stats[name] = counts;
    }

    return stats;
  }
}

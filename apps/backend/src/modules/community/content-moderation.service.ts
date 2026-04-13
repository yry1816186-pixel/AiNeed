import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';

import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService as GatewayNotificationService } from '../../common/gateway/notification.service';
import { AISafetyService } from '../ai-safety/ai-safety.service';

export const CONTENT_MODERATION_QUEUE = 'content_moderation';

const BANNED_KEYWORDS = [
  '赌博', '赌场', '博彩', '下注',
  '代购', '仿品', '高仿', 'A货',
  '色情', '裸体',
  '毒品', '大麻',
  '枪支', '武器',
  '传销', '拉人头',
  '刷单', '刷评',
  '诈骗', '骗钱',
  '政治敏感',
  '自杀', '自残',
];

const RANDOM_SAMPLE_RATE = 0.1;

@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiSafetyService: AISafetyService,
    private readonly gatewayNotificationService: GatewayNotificationService,
    @InjectQueue(CONTENT_MODERATION_QUEUE) private readonly moderationQueue: Queue,
  ) {}

  async moderateContent(
    contentType: string,
    contentId: string,
    content: string,
    images?: string[],
  ): Promise<void> {
    const keywordHit = this.checkBannedKeywords(content);

    if (keywordHit) {
      await this.updateContentModerationStatus(contentType, contentId, 'pending');
      await this.prisma.contentModerationLog.create({
        data: {
          contentType,
          contentId,
          action: 'auto_block',
          reason: `命中违禁关键词: ${keywordHit}`,
        },
      });
      this.logger.warn(`Content blocked by keyword filter: ${contentType}/${contentId}, keyword: ${keywordHit}`);
      return;
    }

    const quickCheckPassed = await this.aiSafetyService.quickCheck(content);

    if (!quickCheckPassed) {
      await this.updateContentModerationStatus(contentType, contentId, 'pending');
      await this.prisma.contentModerationLog.create({
        data: {
          contentType,
          contentId,
          action: 'auto_block',
          reason: 'AI quickCheck 未通过',
        },
      });
      this.logger.warn(`Content blocked by AI quickCheck: ${contentType}/${contentId}`);
      return;
    }

    await this.updateContentModerationStatus(contentType, contentId, 'approved');
    await this.prisma.contentModerationLog.create({
      data: {
        contentType,
        contentId,
        action: 'auto_pass',
        reason: '关键词和AI快速检查均通过',
      },
    });

    if (Math.random() < RANDOM_SAMPLE_RATE) {
      await this.moderationQueue.add(
        'ai_deep_review',
        { contentType, contentId, content, images },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
      this.logger.log(`Content sampled for AI deep review: ${contentType}/${contentId}`);
    }
  }

  async processModerationQueue(job: Job): Promise<void> {
    const { contentType, contentId, content } = job.data;

    this.logger.log(`Processing moderation queue job ${job.id} for ${contentType}/${contentId}`);

    const validationResult = await this.aiSafetyService.validateResponse(content);

    if (!validationResult.isValid) {
      await this.updateContentModerationStatus(contentType, contentId, 'rejected');

      const reasonParts = validationResult.issues.map((i) => `${i.type}: ${i.description}`);
      const reason = reasonParts.length > 0
        ? reasonParts.join('; ')
        : `AI验证未通过 (confidence: ${validationResult.confidenceScore})`;

      await this.prisma.contentModerationLog.create({
        data: {
          contentType,
          contentId,
          action: 'auto_block',
          reason: `AI深度审核: ${reason}`,
        },
      });

      this.logger.warn(`Content rejected by AI deep review: ${contentType}/${contentId}`);
    } else {
      this.logger.log(`Content passed AI deep review: ${contentType}/${contentId}`);
    }
  }

  async manualReview(
    moderatorId: string,
    contentId: string,
    contentType: string,
    action: 'approve' | 'reject',
    note?: string,
  ): Promise<void> {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const logAction = action === 'approve' ? 'manual_approve' : 'manual_reject';

    await this.updateContentModerationStatus(contentType, contentId, newStatus);

    await this.prisma.contentModerationLog.create({
      data: {
        contentType,
        contentId,
        action: logAction,
        reason: note || undefined,
        moderatorId,
      },
    });

    const authorId = await this.getContentAuthorId(contentType, contentId);
    if (!authorId) {
      this.logger.warn(`Cannot find author for ${contentType}/${contentId}, skipping notification`);
      return;
    }

    if (action === 'approve') {
      await this.gatewayNotificationService.sendCustomNotification(authorId, {
        type: 'system',
        title: '内容审核通过',
        message: '您发布的内容已通过审核',
        data: { contentType, contentId, action: 'content_approved' },
      });
    } else {
      await this.gatewayNotificationService.sendCustomNotification(authorId, {
        type: 'system',
        title: '内容审核未通过',
        message: note || '您发布的内容未通过审核，请修改后重新发布',
        data: { contentType, contentId, action: 'content_rejected' },
      });
    }

    this.logger.log(`Manual review ${logAction} by ${moderatorId} for ${contentType}/${contentId}`);
  }

  async getModerationQueue(query: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = query;

    const where = {
      moderationStatus: 'pending',
      isDeleted: false,
    };

    const [items, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: { id: true, nickname: true, avatar: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async handleReportThreshold(contentType: string, contentId: string): Promise<void> {
    const reportCount = await this.prisma.contentReport.count({
      where: {
        contentType,
        contentId,
        status: { not: 'rejected' },
      },
    });

    if (reportCount >= 3) {
      await this.updateContentModerationStatus(contentType, contentId, 'pending');

      if (contentType === 'post') {
        await this.prisma.communityPost.update({
          where: { id: contentId },
          data: { isHidden: true },
        });
      }

      await this.prisma.contentModerationLog.create({
        data: {
          contentType,
          contentId,
          action: 'auto_block',
          reason: `report_threshold_reached (${reportCount} reports)`,
        },
      });

      const content = await this.getContentText(contentType, contentId);
      if (content) {
        await this.moderationQueue.add(
          'ai_deep_review',
          { contentType, contentId, content },
          { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
        );
      }

      this.logger.warn(`Report threshold reached for ${contentType}/${contentId}: ${reportCount} reports`);
    }
  }

  private checkBannedKeywords(content: string): string | null {
    const lowerContent = content.toLowerCase();
    for (const keyword of BANNED_KEYWORDS) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    return null;
  }

  private async updateContentModerationStatus(
    contentType: string,
    contentId: string,
    status: string,
  ): Promise<void> {
    if (contentType === 'post') {
      await this.prisma.communityPost.update({
        where: { id: contentId },
        data: { moderationStatus: status },
      });
    }
  }

  private async getContentAuthorId(contentType: string, contentId: string): Promise<string | null> {
    if (contentType === 'post') {
      const post = await this.prisma.communityPost.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });
      return post?.authorId ?? null;
    }
    if (contentType === 'comment') {
      const comment = await this.prisma.postComment.findUnique({
        where: { id: contentId },
        select: { authorId: true },
      });
      return comment?.authorId ?? null;
    }
    return null;
  }

  private async getContentText(contentType: string, contentId: string): Promise<string | null> {
    if (contentType === 'post') {
      const post = await this.prisma.communityPost.findUnique({
        where: { id: contentId },
        select: { content: true },
      });
      return post?.content ?? null;
    }
    if (contentType === 'comment') {
      const comment = await this.prisma.postComment.findUnique({
        where: { id: contentId },
        select: { content: true },
      });
      return comment?.content ?? null;
    }
    return null;
  }

  private assertNoModerationLogMutation(): never {
    throw new Error('ContentModerationLog is append-only. Update and delete operations are not allowed.');
  }
}

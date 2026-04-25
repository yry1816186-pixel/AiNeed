import { Injectable, Logger, ForbiddenException } from "@nestjs/common";

import { EmailService } from "../../../common/email/email.service";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { StorageService } from "../../../common/storage/storage.service";

// Re-export ConsentType from Prisma-generated types for use in guards and services
export type ConsentType =
  | "tracking"
  | "analytics"
  | "marketing"
  | "body_metrics"
  | "photos"
  | "body_fat"
  | "ai_domestic_no_crossborder"
  | "data_export"
  | "account_deletion";

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly email: EmailService
  ) {}

  /**
   * 检查用户是否已授予特定类型的同意
   */
  async checkConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.prisma.userConsent.findUnique({
      where: { userId_consentType: { userId, consentType } },
    });
    return consent?.granted ?? false;
  }

  /**
   * 要求用户已授予所有指定类型的同意，否则抛出 ForbiddenException
   */
  async requireConsent(userId: string, consentTypes: ConsentType[]): Promise<void> {
    const missingConsents: ConsentType[] = [];

    for (const consentType of consentTypes) {
      const granted = await this.checkConsent(userId, consentType);
      if (!granted) {
        missingConsents.push(consentType);
      }
    }

    if (missingConsents.length > 0) {
      throw new ForbiddenException(
        `需要以下授权才能继续: ${missingConsents.join(", ")}`,
        "MISSING_CONSENT"
      );
    }
  }

  /**
   * 记录同意操作到审计追踪表 (ConsentRecord)
   */
  async recordConsentAction(
    userId: string,
    consentType: ConsentType,
    action: string,
    details?: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    // 获取当前活跃版本的同意文本
    const activeVersion = await this.prisma.consentVersion.findFirst({
      where: { consentType, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return this.prisma.consentRecord.create({
      data: {
        userId,
        consentType,
        action,
        version: activeVersion?.version ?? "1.0",
        details: details ?? null,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
      },
    });
  }

  /**
   * 记录用户同意
   */
  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    metadata: { ipAddress?: string; userAgent?: string; version?: string }
  ) {
    const result = await this.prisma.userConsent.upsert({
      where: {
        userId_consentType: { userId, consentType },
      },
      update: {
        granted,
        grantedAt: granted ? new Date() : null,
        revokedAt: !granted ? new Date() : null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        version: metadata.version || "1.0",
      },
      create: {
        userId,
        consentType,
        granted,
        grantedAt: granted ? new Date() : null,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        version: metadata.version || "1.0",
      },
    });

    // 同步创建审计记录到 ConsentRecord
    await this.recordConsentAction(
      userId,
      consentType as ConsentType,
      granted ? "granted" : "revoked",
      JSON.stringify({ previousGranted: !granted }),
      metadata
    ).catch((err) => {
      // 审计记录失败不应阻塞主流程，仅记录日志
      this.logger.warn(`Failed to create consent audit record: ${err.message}`);
    });

    return result;
  }

  /**
   * 获取用户同意记录
   */
  async getUserConsents(userId: string) {
    return this.prisma.userConsent.findMany({
      where: { userId },
    });
  }

  /**
   * 导出用户数据
   */
  async exportUserData(userId: string, format: "json" | "csv" = "json") {
    // 创建导出请求
    const request = await this.prisma.dataExportRequest.create({
      data: { userId, format, status: "pending" },
    });

    // 异步处理
    this.processExport(request.id).catch((error) => {
      this.logger.error(`Export failed for request ${request.id}: ${error.message}`);
    });

    return { requestId: request.id };
  }

  /**
   * 处理数据导出
   */
  private async processExport(requestId: string): Promise<void> {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return;
    }

    await this.prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: "processing" },
    });

    const userId = request.userId;

    // 收集所有用户数据
    const userData = {
      user: await this.prisma.user.findUnique({ where: { id: userId } }),
      profile: await this.prisma.userProfile.findUnique({ where: { userId } }),
      photos: await this.prisma.userPhoto.findMany({ where: { userId } }),
      tryOns: await this.prisma.virtualTryOn.findMany({ where: { userId } }),
      favorites: await this.prisma.favorite.findMany({ where: { userId } }),
      customizations: await this.prisma.customizationRequest.findMany({
        where: { userId },
      }),
      subscriptions: await this.prisma.userSubscription.findMany({
        where: { userId },
      }),
      notifications: await this.prisma.notification.findMany({
        where: { userId },
        take: 100,
      }),
      behaviorEvents: await this.prisma.userBehaviorEvent.findMany({
        where: { userId },
        take: 1000,
        orderBy: { createdAt: "desc" },
      }),
      preferences: await this.prisma.userPreferenceWeight.findMany({
        where: { userId },
      }),
      consents: await this.prisma.userConsent.findMany({ where: { userId } }),
    };

    // 生成JSON文件
    const fileName = `user-data-${userId}-${Date.now()}.json`;
    const fileContent = JSON.stringify(userData, null, 2);

    try {
      // 上传到临时存储
      const downloadUrl = await this.storage.uploadTemporary(
        `exports/${fileName}`,
        Buffer.from(fileContent),
        7 * 24 * 60 * 60 // 7天过期
      );

      // 更新请求
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: "completed",
          downloadUrl,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(),
        },
      });

      this.logger.log(`Export completed for user ${userId}`);
    } catch (error) {
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: "expired" },
      });
      throw error;
    }
  }

  /**
   * 获取导出请求状态
   */
  async getExportRequest(requestId: string, userId: string) {
    return this.prisma.dataExportRequest.findFirst({
      where: { id: requestId, userId },
    });
  }

  /**
   * 删除用户数据
   */
  async deleteUserData(userId: string, reason?: string) {
    const request = await this.prisma.dataDeletionRequest.create({
      data: { userId, reason },
    });

    // 异步处理
    this.processDeletion(request.id).catch((error) => {
      this.logger.error(`Deletion failed for request ${request.id}: ${error.message}`);
    });

    return { requestId: request.id };
  }

  /**
   * 处理数据删除
   */
  private async processDeletion(requestId: string): Promise<void> {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return;
    }

    await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "processing", processedAt: new Date() },
    });

    const userId = request.userId;

    try {
      // 1. 删除对象存储中的图片
      const photos = await this.prisma.userPhoto.findMany({
        where: { userId },
      });
      const deleteResults = await Promise.allSettled(
        photos.map((photo) => this.storage.delete(photo.url))
      );

      // Log any failed deletions for GDPR compliance tracking
      const failedDeletions = deleteResults
        .map((result, index) => ({ result, photo: photos[index] }))
        .filter(({ result, photo }) => result.status === "rejected" && photo !== undefined);

      if (failedDeletions.length > 0) {
        this.logger.error(
          `GDPR data deletion: ${failedDeletions.length}/${photos.length} photos failed to delete from storage. ` +
            `Failed photo URLs: ${failedDeletions
              .map(({ photo }) => photo?.url)
              .filter(Boolean)
              .join(", ")}`
        );
        // Continue with deletion process - database records will be deleted
        // Storage cleanup can be retried later via scheduled job
      } else {
        this.logger.log(
          `GDPR data deletion: Successfully deleted ${photos.length} photos from storage for user ${userId}`
        );
      }

      // 2. 匿名化用户记录（保留审计需要）
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@xuno.com`,
          phone: null,
          nickname: "已注销用户",
          avatar: null,
          isActive: false,
        },
      });

      // 3. 删除关联数据
      await this.prisma.$transaction([
        this.prisma.userBehaviorEvent.deleteMany({ where: { userId } }),
        this.prisma.userPreferenceWeight.deleteMany({ where: { userId } }),
        this.prisma.notification.deleteMany({ where: { userId } }),
        this.prisma.userConsent.deleteMany({ where: { userId } }),
        this.prisma.userSession.deleteMany({ where: { userId } }),
      ]);

      // 4. 更新请求状态
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: "completed", completedAt: new Date() },
      });

      this.logger.log(`Data deletion completed for user ${userId}`);
    } catch (error) {
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: "cancelled" },
      });
      throw error;
    }
  }

  /**
   * 获取删除请求状态
   */
  async getDeletionRequest(requestId: string, userId: string) {
    return this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, userId },
    });
  }

  /**
   * 取消删除请求
   */
  async cancelDeletionRequest(requestId: string, userId: string) {
    return this.prisma.dataDeletionRequest.updateMany({
      where: { id: requestId, userId, status: "pending" },
      data: { status: "cancelled" },
    });
  }
}

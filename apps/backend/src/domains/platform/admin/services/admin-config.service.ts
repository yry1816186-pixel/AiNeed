/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";

import { AdminAuditService } from "./admin-audit.service";

export const SYSTEM_CONFIG_KEYS = {
  CACHE_TTL: "cache_ttl",
  RATE_LIMIT: "rate_limit",
  RECOMMENDATION_WEIGHTS: "recommendation_weights",
  FEATURE_FLAGS: "feature_flags",
  AI_MODEL: "ai_model",
  MODERATION_THRESHOLD: "moderation_threshold",
  MAX_UPLOAD_SIZE: "max_upload_size",
  PUSH_NOTIFICATION_ENABLED: "push_notification_enabled",
} as const;

@Injectable()
export class AdminConfigService {
  private readonly logger = new Logger(AdminConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  async getConfig(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    if (!config) {
      throw new NotFoundException(`Config '${key}' not found`);
    }
    return config;
  }

  async setConfig(
    key: string,
    value: Record<string, unknown>,
    description: string | undefined,
    userId: string,
  ) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    const result = await this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value: value as any,
        description: description ?? undefined,
        updatedBy: userId,
      },
      create: {
        key,
        value: value as any,
        description: description ?? undefined,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: existing ? "config.update" : "config.create",
      resource: "system_config",
      resourceId: result.id,
      details: {
        key,
        previousValue: existing?.value ?? null,
        newValue: value,
      },
    });

    return result;
  }

  async getAllConfigs(page: number = 1, pageSize: number = 50) {
    const [configs, total] = await Promise.all([
      this.prisma.systemConfig.findMany({
        orderBy: { key: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.systemConfig.count(),
    ]);

    return {
      data: configs,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async deleteConfig(key: string, userId: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`Config '${key}' not found`);
    }

    await this.prisma.systemConfig.delete({ where: { key } });

    await this.auditService.log({
      userId,
      action: "config.delete",
      resource: "system_config",
      resourceId: config.id,
      details: { key, deletedValue: config.value },
    });

    return { deleted: true };
  }
}

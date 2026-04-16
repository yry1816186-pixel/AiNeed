/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import type {
  ChatMessage,
  StylistSessionState,
  StylistResolution,
  StylistBodyProfile,
  StylistSlots,
  StylistContext,
} from "../types";

export interface StylistContextInternal {
  userProfile?: {
    bodyType?: string;
    skinTone?: string;
    faceShape?: string;
    colorSeason?: string;
    height?: number;
    weight?: number;
    stylePreferences?: Array<{ name?: string } | string>;
  } | null;
  recentBehaviors?: Array<{ type: string; data: unknown }>;
  preferences?: Record<string, Record<string, number>>;
}

export interface StylistSession {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  conversationHistory: ChatMessage[];
  state: StylistSessionState;
  result?: StylistResolution;
  feedback?: {
    likes: Array<{
      outfitIndex: number;
      itemId?: string;
      timestamp: string;
      rating?: number;
    }>;
    dislikes: Array<{
      outfitIndex: number;
      itemId?: string;
      timestamp: string;
      rating?: number;
      dislikeReason?: string;
      dislikeDetail?: string;
    }>;
  };
}

@Injectable()
export class AiStylistSessionService {
  private readonly logger = new Logger(AiStylistSessionService.name);
  private readonly sessionTtlMs = 30 * 60 * 1000;
  private readonly sessionCleanupThrottleMs = 5 * 60 * 1000;
  private readonly maxSessionMessages = 20;
  private readonly sessionConfigPrefix = "ai_stylist_session:";
  private readonly maxMemorySessions = 1000;
  private readonly sessionStore = new Map<string, StylistSession>();
  private readonly sessionAccessOrder: string[] = [];
  private lastStoreCleanupAt = 0;
  private readonly useRedis: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    this.useRedis = this.configService.get<string>("REDIS_URL") ? true : false;
  }

  async getSessionOrThrow(
    userId: string,
    sessionId: string,
  ): Promise<StylistSession> {
    await this.cleanupExpiredSessions();
    const key = this.getSessionKey(userId, sessionId);
    const cachedSession = this.sessionStore.get(key);

    if (cachedSession) {
      return cachedSession;
    }

    const storedSession = await this.loadPersistedSession(userId, sessionId);
    if (!storedSession) {
      throw new NotFoundException("AI 造型师会话不存在或已过期");
    }

    this.sessionStore.set(key, storedSession);
    return storedSession;
  }

  async persistSession(session: StylistSession): Promise<void> {
    await this.cleanupExpiredSessions();
    session.updatedAt = new Date().toISOString();
    session.conversationHistory = session.conversationHistory.slice(
      -this.maxSessionMessages,
    );
    const key = this.getSessionKey(session.userId, session.id);

    await this.writeSessionRecord(
      session,
      new Date(Date.now() + this.sessionTtlMs),
    );

    if (this.useRedis) {
      try {
        const redisKey = `stylist:session:${key}`;
        await this.redisService.setex(
          redisKey,
          Math.floor(this.sessionTtlMs / 1000),
          JSON.stringify(session),
        );
      } catch (error) {
        this.logger.warn(`Redis session persist failed, falling back to DB-only: ${error}`);
      }
    }

    this.updateSessionAccessOrder(key);
    while (this.sessionStore.size >= this.maxMemorySessions) {
      const lruKey = this.sessionAccessOrder.shift();
      if (lruKey) {
        this.sessionStore.delete(lruKey);
        this.logger.debug(`Evicted LRU session from memory: ${lruKey}`);
      } else {
        break;
      }
    }
    this.sessionStore.set(key, session);
  }

  async listSessions(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{
    sessions: Array<{
      id: string;
      createdAt: string;
      updatedAt: string;
      state: StylistSessionState;
      result?: StylistResolution;
    }>;
    total: number;
  }> {
    await this.cleanupExpiredSessions();

    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const records = await this.prisma.aiStylistSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        payload: true,
        updatedAt: true,
      },
    });

    const total = await this.prisma.aiStylistSession.count({
      where: { userId },
    });

    const sessions = records
      .map((record) => {
        try {
          const session = record.payload as unknown as StylistSession;
          return {
            id: session.id,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            state: session.state,
            result: session.result,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to parse session record ${record.id}: ${error instanceof Error ? error.message : String(error)}. Record will be skipped.`,
          );
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return { sessions, total };
  }

  async deleteSession(
    userId: string,
    sessionId: string,
  ): Promise<{ success: boolean }> {
    const key = this.getSessionKey(userId, sessionId);
    this.sessionStore.delete(key);

    try {
      await this.prisma.aiStylistSession.delete({
        where: { id: sessionId },
      });
    } catch (primaryError) {
      this.logger.warn(
        `Failed to delete AI stylist session from primary table: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}. Attempting fallback deletion.`,
      );
      try {
        await this.prisma.systemConfig.delete({
          where: { key: this.getSessionConfigKey(userId, sessionId) },
        });
      } catch (fallbackError) {
        this.logger.error(
          `Failed to delete session config from fallback table: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}. Session cleanup may be incomplete for userId=${userId}, sessionId=${sessionId}`,
        );
      }
    }

    return { success: true };
  }

  async loadPersistedSession(
    userId: string,
    sessionId: string,
  ): Promise<StylistSession | null> {
    const key = this.getSessionKey(userId, sessionId);

    if (this.useRedis) {
      try {
        const redisKey = `stylist:session:${key}`;
        const cached = await this.redisService.get(redisKey);
        if (cached) {
          const session = JSON.parse(cached) as StylistSession;
          if (!this.isSessionExpired(session.updatedAt)) {
            this.sessionStore.set(key, session);
            return session;
          }
        }
      } catch (error) {
        this.logger.warn(`Redis session load failed: ${error}`);
      }
    }

    return this.readSessionRecord(userId, sessionId);
  }

  private updateSessionAccessOrder(key: string): void {
    const existingIndex = this.sessionAccessOrder.indexOf(key);
    if (existingIndex > -1) {
      this.sessionAccessOrder.splice(existingIndex, 1);
    }
    this.sessionAccessOrder.push(key);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    for (const [key, session] of this.sessionStore.entries()) {
      if (now - new Date(session.updatedAt).getTime() > this.sessionTtlMs) {
        this.sessionStore.delete(key);
      }
    }

    if (now - this.lastStoreCleanupAt < this.sessionCleanupThrottleMs) {
      return;
    }

    this.lastStoreCleanupAt = now;
    await this.deleteExpiredSessionRecords(new Date(now - this.sessionTtlMs));
  }

  getSessionKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  getSessionConfigKey(userId: string, sessionId: string): string {
    return `${this.sessionConfigPrefix}${this.getSessionKey(userId, sessionId)}`;
  }

  private isSessionExpired(updatedAt: string): boolean {
    return Date.now() - new Date(updatedAt).getTime() > this.sessionTtlMs;
  }

  private async writeSessionRecord(
    session: StylistSession,
    expiresAt: Date,
  ): Promise<void> {
    try {
      const sessionPayload = session as unknown as Prisma.InputJsonValue;

      await this.prisma.aiStylistSession.upsert({
        where: { id: session.id },
        update: {
          userId: session.userId,
          payload: sessionPayload,
          expiresAt,
        },
        create: {
          id: session.id,
          userId: session.userId,
          payload: sessionPayload,
          expiresAt,
        },
      });
      return;
    } catch (error: unknown) {
      this.logger.warn(
        `AiStylistSession 表写入失败，回退 SystemConfig: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.prisma.systemConfig.upsert({
      where: {
        key: this.getSessionConfigKey(session.userId, session.id),
      },
      update: {
        value: JSON.stringify(session),
      },
      create: {
        key: this.getSessionConfigKey(session.userId, session.id),
        value: JSON.stringify(session),
      },
    });
  }

  private async deleteExpiredSessionRecords(
    expiredBefore: Date,
  ): Promise<void> {
    try {
      await this.prisma.aiStylistSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return;
    } catch (error: unknown) {
      this.logger.warn(
        `AiStylistSession 过期清理失败，回退 SystemConfig: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await this.prisma.systemConfig.deleteMany({
      where: {
        key: { startsWith: this.sessionConfigPrefix },
        updatedAt: {
          lt: expiredBefore,
        },
      },
    });
  }

  private async readSessionRecord(
    userId: string,
    sessionId: string,
  ): Promise<StylistSession | null> {
    try {
      const record = await this.prisma.aiStylistSession.findUnique({
        where: { id: sessionId },
      });

      if (record) {
        if (record.userId !== userId || record.expiresAt < new Date()) {
          await this.prisma.aiStylistSession.delete({
            where: { id: sessionId },
          });
          return null;
        }

        return record.payload as unknown as StylistSession;
      }
    } catch (error: unknown) {
      this.logger.warn(
        `AiStylistSession 表读取失败，回退 SystemConfig: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const record = await this.prisma.systemConfig.findUnique({
      where: {
        key: this.getSessionConfigKey(userId, sessionId),
      },
    });

    if (!record?.value) {
      return null;
    }

    try {
      const session = JSON.parse(record.value as string) as StylistSession;
      if (
        session.userId !== userId ||
        session.id !== sessionId ||
        this.isSessionExpired(session.updatedAt)
      ) {
        await this.prisma.systemConfig.delete({
          where: {
            key: this.getSessionConfigKey(userId, sessionId),
          },
        });
        return null;
      }

      return session;
    } catch (error: unknown) {
      this.logger.warn(
        `AI 造型师会话反序列化失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.prisma.systemConfig.delete({
        where: {
          key: this.getSessionConfigKey(userId, sessionId),
        },
      });
      return null;
    }
  }

  get sessionTtl(): number {
    return this.sessionTtlMs;
  }
}

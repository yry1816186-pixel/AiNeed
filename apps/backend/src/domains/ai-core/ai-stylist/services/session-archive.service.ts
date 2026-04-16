import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from '../../../../common/prisma/prisma.service";

/**
 * 方案历史按日归档服务 — AIS-07
 * 支持日历视图和按日期查询方案
 */

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  sessionCount: number;
  hasOutfitPlan: boolean;
}

export interface ArchivedSession {
  id: string;
  status: string;
  goal?: string;
  hasOutfitPlan: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SessionArchiveService {
  private readonly logger = new Logger(SessionArchiveService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取日历视图 — 返回有方案的日期列表
   * @param userId 用户 ID
   * @param year 年份
   * @param month 月份 (1-12)
   */
  async getCalendarDays(
    userId: string,
    year: number,
    month: number,
  ): Promise<CalendarDay[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1); // 下月1号

    const sessions = await this.prisma.aiStylistSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        payload: true,
        createdAt: true,
      },
    });

    // 按日期分组
    const dayMap = new Map<string, { count: number; hasPlan: boolean }>();

    for (const session of sessions) {
      const dateKey = session.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const payload = session.payload as Record<string, unknown> | null;
      const hasPlan = !!(payload?.result);

      const existing = dayMap.get(dateKey);
      if (existing) {
        existing.count++;
        existing.hasPlan = existing.hasPlan || hasPlan;
      } else {
        dayMap.set(dateKey, { count: 1, hasPlan });
      }
    }

    // 转换为数组
    return Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      sessionCount: data.count,
      hasOutfitPlan: data.hasPlan,
    }));
  }

  /**
   * 获取指定日期的方案列表
   */
  async getSessionsByDate(
    userId: string,
    date: string, // YYYY-MM-DD
  ): Promise<ArchivedSession[]> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const sessions = await this.prisma.aiStylistSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
        status: true,
        payload: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map((s): ArchivedSession => {
      const payload = s.payload as Record<string, unknown> | null;
      const goalValue = payload ? (payload).goal : undefined;
      return {
        id: s.id,
        status: s.status,
        goal: typeof goalValue === "string" ? goalValue : undefined,
        hasOutfitPlan: !!(payload?.result),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { WeeklyReportQueryDto } from "../dto/diary-query.dto";
import { OutfitDiaryService } from "./outfit-diary.service";

interface StyleCount {
  [style: string]: number;
}

interface SceneCount {
  [scene: string]: number;
}

interface ColorCount {
  [color: string]: number;
}

interface EvolutionPoint {
  date: string;
  commute: number;
  casual: number;
  formal: number;
  date_style: number;
}

interface WeeklyReportData {
  satisfaction: number | null;
  styleDistribution: Record<string, number> | null;
  trendSummary: string | null;
  evolutionCurve: EvolutionPoint[] | null;
  sceneCoverage: Record<string, number> | null;
  colorAnalysis: Record<string, number> | null;
  itemReuseRate: number | null;
}

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly diaryService: OutfitDiaryService
  ) {}

  /**
   * Cron job: generate weekly reports every Sunday at 8PM.
   */
  @Cron("0 20 * * 0")
  async handleWeeklyGeneration(): Promise<void> {
    this.logger.log("Starting weekly report generation for all active users");

    try {
      // Find users who had diary entries in the past 14 days
      const recentDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const activeUserIds = await this.prisma.$queryRaw<Array<{ userId: string }>>`
        SELECT DISTINCT "userId"
        FROM "OutfitDiary"
        WHERE "createdAt" >= ${recentDate}
        LIMIT 500
      `;

      const activeUsers = activeUserIds.map((row) => ({ id: row.userId }));

      this.logger.log(`Found ${activeUsers.length} active users with recent diary entries`);

      for (const user of activeUsers) {
        try {
          await this.generateWeeklyReport(user.id);
        } catch (error) {
          this.logger.error(
            `Failed to generate weekly report for user ${user.id}: ${this.getErrorMessage(error)}`
          );
        }
      }

      this.logger.log("Weekly report generation completed");
    } catch (error) {
      this.logger.error(`Weekly report generation failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Generate the weekly report for a specific user.
   * Computes 7 elements: satisfaction, styleDistribution, trendSummary,
   * evolutionCurve, sceneCoverage, colorAnalysis, itemReuseRate.
   */
  async generateWeeklyReport(userId: string): Promise<WeeklyReportData | null> {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    // Monday of the current week
    const day = weekEnd.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Check if report already exists for this week
    const existing = await this.prisma.weeklyReport.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    });

    if (existing) {
      return {
        satisfaction: existing.satisfaction,
        styleDistribution: existing.styleDistribution as Record<string, number> | null,
        trendSummary: existing.trendSummary,
        evolutionCurve: existing.evolutionCurve as EvolutionPoint[] | null,
        sceneCoverage: existing.sceneCoverage as Record<string, number> | null,
        colorAnalysis: existing.colorAnalysis as Record<string, number> | null,
        itemReuseRate: existing.itemReuseRate,
      };
    }

    const entries = await this.diaryService.getDiaryEntriesForWeek(userId, weekStart, weekEnd);

    if (entries.length === 0) {
      this.logger.debug(`No diary entries for user ${userId} in this week, skipping report`);
      return null;
    }

    const report = await this.computeReport(userId, entries, weekStart);

    await this.prisma.weeklyReport.create({
      data: {
        userId,
        weekStart,
        weekEnd,
        satisfaction: report.satisfaction,
        styleDistribution: report.styleDistribution ?? undefined,
        trendSummary: report.trendSummary ?? undefined,
        evolutionCurve: (report.evolutionCurve ?? undefined) as any,
        sceneCoverage: report.sceneCoverage ?? undefined,
        colorAnalysis: report.colorAnalysis ?? undefined,
        itemReuseRate: report.itemReuseRate,
      },
    });

    this.logger.log(`Generated weekly report for user ${userId}`);
    return report;
  }

  /**
   * Get the latest weekly report for a user.
   */
  async getLatestReport(userId: string): Promise<Record<string, unknown> | null> {
    const report = await this.prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStart: "desc" },
    });

    return report;
  }

  /**
   * Get weekly report history for a user.
   */
  async getReportHistory(userId: string, query: WeeklyReportQueryDto) {
    const { limit = 4 } = query;

    const reports = await this.prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: limit,
    });

    return {
      items: reports,
      total: reports.length,
    };
  }

  /**
   * Compute all 7 report elements from diary entries.
   */
  private async computeReport(
    userId: string,
    entries: Array<{
      id: string;
      date: Date;
      scene: string | null;
      satisfactionScore: number | null;
      outfitSnapshot: unknown;
      outfitId: string | null;
    }>,
    weekStart: Date
  ): Promise<WeeklyReportData> {
    const satisfaction = this.computeSatisfaction(entries);
    const styleDistribution = await this.computeStyleDistribution(userId, entries);
    const trendSummary = this.computeTrendSummary(entries, styleDistribution);
    const evolutionCurve = await this.computeEvolutionCurve(userId, weekStart);
    const sceneCoverage = this.computeSceneCoverage(entries);
    const colorAnalysis = await this.computeColorAnalysis(userId, entries);
    const itemReuseRate = await this.computeItemReuseRate(userId, entries);

    return {
      satisfaction,
      styleDistribution,
      trendSummary,
      evolutionCurve,
      sceneCoverage,
      colorAnalysis,
      itemReuseRate,
    };
  }

  /**
   * Average satisfaction score across all entries.
   */
  private computeSatisfaction(entries: Array<{ satisfactionScore: number | null }>): number | null {
    const scores = entries.map((e) => e.satisfactionScore).filter((s): s is number => s !== null);

    if (scores.length === 0) {
      return null;
    }

    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Distribution of styles worn during the week.
   * Derived from outfit occasions/style tags.
   */
  private async computeStyleDistribution(
    userId: string,
    entries: Array<{ outfitId: string | null }>
  ): Promise<Record<string, number> | null> {
    const outfitIds = entries.map((e) => e.outfitId).filter((id): id is string => id !== null);

    if (outfitIds.length === 0) {
      return null;
    }

    const outfits = await this.prisma.outfit.findMany({
      where: {
        id: { in: outfitIds },
        userId,
      },
      select: { style: true, occasions: true },
    });

    const styleCounts: StyleCount = {};

    for (const outfit of outfits) {
      const styles = outfit.occasions.length > 0 ? outfit.occasions : [outfit.style ?? "unknown"];
      for (const style of styles) {
        styleCounts[style] = (styleCounts[style] ?? 0) + 1;
      }
    }

    const total = Object.values(styleCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) {
      return null;
    }

    const distribution: Record<string, number> = {};
    for (const [style, count] of Object.entries(styleCounts)) {
      distribution[style] = Math.round((count / total) * 100) / 100;
    }

    return distribution;
  }

  /**
   * Generate a text summary of style trends for the week.
   */
  private computeTrendSummary(
    entries: Array<{
      date: Date;
      scene: string | null;
      satisfactionScore: number | null;
    }>,
    styleDistribution: Record<string, number> | null
  ): string | null {
    if (entries.length === 0) {
      return null;
    }

    const parts: string[] = [];

    // Entry count
    parts.push(`本周共记录 ${entries.length} 次穿搭`);

    // Top style
    if (styleDistribution) {
      const sortedStyles = Object.entries(styleDistribution).sort(([, a], [, b]) => b - a);
      if (sortedStyles.length > 0) {
        const topEntry = sortedStyles[0]!;
        const topStyle = topEntry[0];
        const topRatio = topEntry[1];
        parts.push(`主要风格为${topStyle}（占比 ${Math.round(topRatio * 100)}%）`);
      }
      if (sortedStyles.length > 1) {
        const secondEntry = sortedStyles[1]!;
        const secondStyle = secondEntry[0];
        parts.push(`其次是${secondStyle}`);
      }
    }

    // Satisfaction trend
    const scores = entries.map((e) => e.satisfactionScore).filter((s): s is number => s !== null);

    if (scores.length >= 2) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

      if (avgSecond > avgFirst + 0.1) {
        parts.push("穿搭满意度呈上升趋势");
      } else if (avgSecond < avgFirst - 0.1) {
        parts.push("穿搭满意度有所下降");
      } else {
        parts.push("穿搭满意度保持稳定");
      }
    }

    // Scene coverage
    const scenes = entries.map((e) => e.scene).filter((s): s is string => s !== null);
    const uniqueScenes = new Set(scenes);
    if (uniqueScenes.size > 0) {
      parts.push(`覆盖了 ${uniqueScenes.size} 种场景`);
    }

    return parts.join("。");
  }

  /**
   * Compute evolution curve data for 4 style dimensions across the week.
   * Maps scenes to dimensions: commute, casual, formal, date.
   */
  private async computeEvolutionCurve(
    userId: string,
    weekStart: Date
  ): Promise<EvolutionPoint[] | null> {
    // Get 2 weeks of data for better curve: previous week + current week
    const twoWeeksAgo = new Date(weekStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    const entries = await this.prisma.outfitDiary.findMany({
      where: {
        userId,
        date: { gte: twoWeeksAgo },
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        scene: true,
        satisfactionScore: true,
      },
    });

    if (entries.length < 2) {
      return null;
    }

    type DimensionKey = "commute" | "casual" | "formal" | "date_style";
    type DimArrays = Record<DimensionKey, number[]>;

    // Map scenes to dimensions
    const sceneToDimension: Record<string, DimensionKey> = {
      commute: "commute",
      work: "commute",
      office: "commute",
      casual: "casual",
      daily: "casual",
      weekend: "casual",
      formal: "formal",
      business: "formal",
      meeting: "formal",
      interview: "formal",
      date: "date_style",
      romantic: "date_style",
      party: "date_style",
    };

    const emptyDim = (): DimArrays => ({ commute: [], casual: [], formal: [], date_style: [] });

    // Group by date
    const dateMap = new Map<string, DimArrays>();

    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split("T")[0] ?? "";
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, emptyDim());
      }

      const dim = dateMap.get(dateKey)!;
      const dimension = sceneToDimension[entry.scene ?? ""] ?? "casual";
      const score = entry.satisfactionScore ?? 0.5;

      const arr = dim[dimension];
      if (arr) {
        arr.push(score);
      }
    }

    const curve: EvolutionPoint[] = [];
    for (const [date, dims] of dateMap) {
      curve.push({
        date,
        commute:
          dims.commute.length > 0
            ? dims.commute.reduce((a, b) => a + b, 0) / dims.commute.length
            : 0,
        casual:
          dims.casual.length > 0 ? dims.casual.reduce((a, b) => a + b, 0) / dims.casual.length : 0,
        formal:
          dims.formal.length > 0 ? dims.formal.reduce((a, b) => a + b, 0) / dims.formal.length : 0,
        date_style:
          dims.date_style.length > 0
            ? dims.date_style.reduce((a, b) => a + b, 0) / dims.date_style.length
            : 0,
      });
    }

    return curve;
  }

  /**
   * Compute scene coverage distribution.
   */
  private computeSceneCoverage(
    entries: Array<{ scene: string | null }>
  ): Record<string, number> | null {
    const sceneCounts: SceneCount = {};
    let total = 0;

    for (const entry of entries) {
      const scene = entry.scene ?? "unspecified";
      sceneCounts[scene] = (sceneCounts[scene] ?? 0) + 1;
      total++;
    }

    if (total === 0) {
      return null;
    }

    const coverage: Record<string, number> = {};
    for (const [scene, count] of Object.entries(sceneCounts)) {
      coverage[scene] = Math.round((count / total) * 100) / 100;
    }

    return coverage;
  }

  /**
   * Compute color analysis from outfit snapshots.
   */
  private async computeColorAnalysis(
    userId: string,
    entries: Array<{ outfitSnapshot: unknown }>
  ): Promise<Record<string, number> | null> {
    const colorCounts: ColorCount = {};
    let totalColors = 0;

    for (const entry of entries) {
      const snapshot = entry.outfitSnapshot as Record<string, unknown> | null;
      if (!snapshot) {
        continue;
      }

      const colors = snapshot.colors as string[] | undefined;
      if (!colors || !Array.isArray(colors)) {
        continue;
      }

      for (const color of colors) {
        if (typeof color === "string") {
          colorCounts[color] = (colorCounts[color] ?? 0) + 1;
          totalColors++;
        }
      }
    }

    if (totalColors === 0) {
      return null;
    }

    const analysis: Record<string, number> = {};
    for (const [color, count] of Object.entries(colorCounts)) {
      analysis[color] = Math.round((count / totalColors) * 100) / 100;
    }

    return analysis;
  }

  /**
   * Compute item reuse rate: ratio of distinct items used vs total item uses.
   * Higher means more diverse, lower means repeating same items.
   */
  private async computeItemReuseRate(
    userId: string,
    entries: Array<{ outfitId: string | null }>
  ): Promise<number | null> {
    const outfitIds = entries.map((e) => e.outfitId).filter((id): id is string => id !== null);

    if (outfitIds.length === 0) {
      return null;
    }

    // Get all items from these outfits
    const outfitItems = await this.prisma.outfitItem.findMany({
      where: {
        outfitId: { in: outfitIds },
      },
      select: { clothingId: true },
    });

    if (outfitItems.length === 0) {
      return null;
    }

    const uniqueItems = new Set(outfitItems.map((oi) => oi.clothingId));
    // Reuse rate: 1.0 = all unique (no reuse), 0.0 = all same item
    const reuseRate = uniqueItems.size / outfitItems.length;

    return Math.round(reuseRate * 100) / 100;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}

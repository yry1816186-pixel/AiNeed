import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import { WeatherService, type DailyForecast } from "../../../fashion/weather/weather.service";

/**
 * 日历穿搭计划服务 — CAL-03, CAL-04, CAL-05
 *
 * 核心职责:
 * - 每周自动生成 7 天穿搭计划 (CAL-03)
 * - 基于天气、场景、季节的穿搭评分算法 (CAL-04)
 * - 编辑日计划 + 偏好信号发射 (CAL-05)
 * - 重复穿搭检测 (D-11)
 */

type OutfitWithItems = Awaited<ReturnType<PrismaService["outfit"]["findMany"]>>[number];

interface OutfitScore {
  outfit: OutfitWithItems;
  score: number;
  breakdown: {
    season: number;
    temperature: number;
    scene: number;
    variety: number;
    wearPenalty: number;
  };
}

@Injectable()
export class CalendarPlanService {
  private readonly logger = new Logger(CalendarPlanService.name);

  constructor(
    private prisma: PrismaService,
    private weatherService: WeatherService,
    private redisService: RedisService
  ) {}

  // ──────────────────────────────────────────────
  // CAL-03: 周计划生成
  // ──────────────────────────────────────────────

  /**
   * 生成未来 7 天的穿搭计划
   * @param userId 用户 ID
   * @param latitude 纬度（可选，用于获取天气）
   * @param longitude 经度（可选，用于获取天气）
   */
  async generateWeeklyPlan(
    userId: string,
    latitude?: number,
    longitude?: number
  ): Promise<{
    weekStart: string;
    weekEnd: string;
    plans: Array<{
      id: string;
      plannedDate: string;
      outfitId: string | null;
      sceneTag: string | null;
      isSpecialEvent: boolean;
      eventName: string | null;
      source: string;
      outfit: {
        id: string;
        name: string | null;
        coverImage: string | null;
        occasions: string[];
        seasons: string[];
        style: string | null;
        rating: number | null;
      } | null;
      repeatWarning: boolean;
      weatherContext: Record<string, unknown> | null;
    }>;
  }> {
    // 1. 获取 7 天天气预报
    let forecasts: DailyForecast[] = [];
    if (latitude !== undefined && longitude !== undefined) {
      forecasts = await this.weatherService.get7DayForecast(latitude, longitude);
    }

    // 2. 获取用户即将到来的事件
    const events = await this.getUpcomingEvents(userId);

    // 3. 获取用户所有穿搭方案
    const outfits = await this.prisma.outfit.findMany({
      where: { userId },
      include: { items: { include: { clothing: true } } },
      orderBy: [{ isFavorite: "desc" }, { rating: "desc" }, { wearCount: "asc" }],
    });

    if (outfits.length === 0) {
      this.logger.warn(`User ${userId} has no outfits, cannot generate plan`);
      return { weekStart: "", weekEnd: "", plans: [] };
    }

    // 4. 计算日期范围: 从今天起 7 天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekStartStr = today.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // 5. 清除已存在的未来计划（避免冲突）
    await this.prisma.outfitPlan.deleteMany({
      where: {
        userId,
        plannedDate: { gte: today },
      },
    });

    // 6. 记录已选方案，用于多样性和重复检测
    const selectedOutfitIds = new Set<string>();

    // 7. 为每一天生成计划
    const plans = [];
    for (let i = 0; i < 7; i++) {
      const plannedDate = new Date(today);
      plannedDate.setDate(plannedDate.getDate() + i);
      const dateStr = plannedDate.toISOString().slice(0, 10);

      const forecast = forecasts[i] ?? null;
      const event = events.find((e) => e.date === dateStr);

      // 评分选择最佳穿搭
      const scored = this.selectOutfitForDay(
        outfits,
        plannedDate,
        forecast,
        event?.scene ?? null,
        selectedOutfitIds
      );

      if (!scored) {continue;}

      const weatherContext: Prisma.InputJsonValue | undefined = forecast
        ? {
            tempHigh: forecast.tempHigh,
            tempLow: forecast.tempLow,
            condition: forecast.condition,
            humidity: forecast.humidity,
            windDir: forecast.windDirDay,
          }
        : undefined;

      const plan = await this.prisma.outfitPlan.create({
        data: {
          userId,
          plannedDate,
          outfitId: scored.outfit.id,
          weatherContext,
          sceneTag: this.inferSceneFromWeather(forecast, event?.scene ?? null),
          isSpecialEvent: !!event,
          eventName: event?.name ?? null,
          source: "ai_generated",
        },
      });

      selectedOutfitIds.add(scored.outfit.id);

      // 重复检测
      const repeatWarning = await this.checkRepeatForDay(userId, dateStr, scored.outfit.id);

      const outfitData = scored.outfit;
      plans.push({
        id: plan.id,
        plannedDate: dateStr,
        outfitId: plan.outfitId,
        sceneTag: plan.sceneTag,
        isSpecialEvent: plan.isSpecialEvent,
        eventName: plan.eventName,
        source: plan.source,
        outfit: {
          id: outfitData.id,
          name: outfitData.name,
          coverImage: outfitData.coverImage,
          occasions: outfitData.occasions,
          seasons: outfitData.seasons,
          style: outfitData.style,
          rating: outfitData.rating ? parseFloat(String(outfitData.rating)) : null,
        },
        repeatWarning,
        weatherContext: weatherContext as Record<string, unknown> | null,
      });
    }

    return { weekStart: weekStartStr, weekEnd: weekEndStr, plans };
  }

  /**
   * 获取已生成的周计划
   */
  async getWeeklyPlan(userId: string): Promise<{
    weekStart: string;
    weekEnd: string;
    plans: Array<{
      id: string;
      plannedDate: string;
      outfitId: string | null;
      sceneTag: string | null;
      isSpecialEvent: boolean;
      eventName: string | null;
      source: string;
      outfit: {
        id: string;
        name: string | null;
        coverImage: string | null;
        occasions: string[];
        seasons: string[];
        style: string | null;
        rating: number | null;
      } | null;
      repeatWarning: boolean;
      weatherContext: Record<string, unknown> | null;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const existingPlans = await this.prisma.outfitPlan.findMany({
      where: {
        userId,
        plannedDate: { gte: today, lte: weekEnd },
      },
      include: { outfit: true },
      orderBy: { plannedDate: "asc" },
    });

    const plans = await Promise.all(
      existingPlans.map(async (plan) => {
        const repeatWarning = plan.outfitId
          ? await this.checkRepeatForDay(
              userId,
              plan.plannedDate.toISOString().slice(0, 10),
              plan.outfitId
            )
          : false;

        return {
          id: plan.id,
          plannedDate: plan.plannedDate.toISOString().slice(0, 10),
          outfitId: plan.outfitId,
          sceneTag: plan.sceneTag,
          isSpecialEvent: plan.isSpecialEvent,
          eventName: plan.eventName,
          source: plan.source,
          outfit: plan.outfit
            ? {
                id: plan.outfit.id,
                name: plan.outfit.name,
                coverImage: plan.outfit.coverImage,
                occasions: plan.outfit.occasions,
                seasons: plan.outfit.seasons,
                style: plan.outfit.style,
                rating: plan.outfit.rating ? parseFloat(String(plan.outfit.rating)) : null,
              }
            : null,
          repeatWarning,
          weatherContext: plan.weatherContext as Record<string, unknown> | null,
        };
      })
    );

    return {
      weekStart: today.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      plans,
    };
  }

  // ──────────────────────────────────────────────
  // CAL-04: 穿搭评分算法
  // ──────────────────────────────────────────────

  /**
   * 基于多维评分选择最佳穿搭
   *
   * 评分公式:
   *   总分 = 50 (base) + season (0~30) + temp (0~20) + scene (0~25) + variety (0~15) + wearPenalty (0~-50)
   */
  selectOutfitForDay(
    outfits: OutfitWithItems[],
    date: Date,
    forecast: DailyForecast | null,
    sceneHint: string | null,
    alreadySelectedIds: Set<string>
  ): OutfitScore | null {
    if (outfits.length === 0) {return null;}

    const currentSeason = this.getMonthSeason(date.getMonth());
    const avgTemp = forecast ? (forecast.tempHigh + forecast.tempLow) / 2 : null;

    const scored: OutfitScore[] = outfits.map((outfit) => {
      let seasonScore = 0;
      let tempScore = 0;
      let sceneScore = 0;
      let varietyScore = 0;
      let wearPenalty = 0;

      // 1. Season match: +30 if outfit seasons include current season
      const outfitSeasons = outfit.seasons as string[];
      if (outfitSeasons.includes(currentSeason) || outfitSeasons.includes("all")) {
        seasonScore = 30;
      } else if (outfitSeasons.length > 0) {
        // Partial match: season is close
        seasonScore = 10;
      }

      // 2. Temperature match: +0~20
      if (avgTemp !== null) {
        const tempRange = this.getTempRangeForSeason(currentSeason);
        if (avgTemp >= tempRange.min && avgTemp <= tempRange.max) {
          tempScore = 20;
        } else {
          const diff = Math.min(
            Math.abs(avgTemp - tempRange.min),
            Math.abs(avgTemp - tempRange.max)
          );
          tempScore = Math.max(0, 20 - diff * 2);
        }
      } else {
        // No weather data: moderate score
        tempScore = 10;
      }

      // 3. Scene/occasion match: +0~25
      if (sceneHint) {
        const outfitOccasions = outfit.occasions as string[];
        if (outfitOccasions.includes(sceneHint)) {
          sceneScore = 25;
        } else if (
          outfitOccasions.some(
            (o) =>
              o.includes(sceneHint) || sceneHint.includes(o) || this.isRelatedScene(o, sceneHint)
          )
        ) {
          sceneScore = 15;
        }
      } else if (forecast) {
        const inferredScene = this.inferSceneFromWeather(forecast, null);
        const outfitOccasions = outfit.occasions as string[];
        if (outfitOccasions.includes(inferredScene) || outfitOccasions.includes("日常")) {
          sceneScore = 20;
        }
      } else {
        // Default: check for "daily" / "日常"
        const outfitOccasions = outfit.occasions as string[];
        if (outfitOccasions.includes("日常") || outfitOccasions.includes("daily")) {
          sceneScore = 15;
        }
      }

      // 4. Variety: +0~15, bonus for not already selected this week
      if (!alreadySelectedIds.has(outfit.id)) {
        varietyScore = 15;
      } else {
        varietyScore = 0;
      }

      // 5. Favorite bonus (implicit quality signal)
      if (outfit.isFavorite) {
        varietyScore += 5;
      }

      // 6. Wear penalty: -10 per day since last worn, max -50
      if (outfit.lastWorn) {
        const daysSinceLastWorn = Math.floor(
          (date.getTime() - new Date(outfit.lastWorn).getTime()) / (1000 * 60 * 60 * 24)
        );
        // Negative days = future date, no penalty
        // Very recent wear = high penalty
        if (daysSinceLastWorn >= 0 && daysSinceLastWorn < 5) {
          wearPenalty = -Math.max(0, (5 - daysSinceLastWorn) * 10);
        }
      }

      const totalScore = 50 + seasonScore + tempScore + sceneScore + varietyScore + wearPenalty;

      return {
        outfit,
        score: totalScore,
        breakdown: {
          season: seasonScore,
          temperature: tempScore,
          scene: sceneScore,
          variety: varietyScore,
          wearPenalty,
        },
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0] ?? null;
  }

  // ──────────────────────────────────────────────
  // CAL-05: 编辑 + 偏好信号
  // ──────────────────────────────────────────────

  /**
   * 编辑某天的穿搭计划
   */
  async editDayPlan(
    userId: string,
    date: string,
    newOutfitId: string
  ): Promise<{
    id: string;
    plannedDate: string;
    outfitId: string;
    sceneTag: string | null;
    isSpecialEvent: boolean;
    eventName: string | null;
    source: string;
    outfit: {
      id: string;
      name: string | null;
      coverImage: string | null;
      occasions: string[];
      seasons: string[];
      style: string | null;
      rating: number | null;
    } | null;
    repeatWarning: boolean;
    weatherContext: Record<string, unknown> | null;
  }> {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new NotFoundException("无效日期格式");
    }

    // Verify outfit belongs to user
    const outfit = await this.prisma.outfit.findFirst({
      where: { id: newOutfitId, userId },
    });

    if (!outfit) {
      throw new NotFoundException("穿搭方案不存在");
    }

    // Upsert plan for this date
    const plan = await this.prisma.outfitPlan.upsert({
      where: {
        userId_plannedDate: { userId, plannedDate: parsedDate },
      },
      create: {
        userId,
        plannedDate: parsedDate,
        outfitId: newOutfitId,
        source: "manual",
        sceneTag: this.inferSceneFromWeather(null, null),
        isSpecialEvent: false,
      },
      update: {
        outfitId: newOutfitId,
        source: "manual",
      },
      include: { outfit: true },
    });

    // Emit preference signal
    await this.emitPreferenceSignal(userId, date, newOutfitId);

    const repeatWarning = await this.checkRepeatForDay(userId, date, newOutfitId);

    return {
      id: plan.id,
      plannedDate: plan.plannedDate.toISOString().slice(0, 10),
      outfitId: plan.outfitId ?? newOutfitId,
      sceneTag: plan.sceneTag,
      isSpecialEvent: plan.isSpecialEvent,
      eventName: plan.eventName,
      source: plan.source,
      outfit: plan.outfit
        ? {
            id: plan.outfit.id,
            name: plan.outfit.name,
            coverImage: plan.outfit.coverImage,
            occasions: plan.outfit.occasions,
            seasons: plan.outfit.seasons,
            style: plan.outfit.style,
            rating: plan.outfit.rating ? parseFloat(String(plan.outfit.rating)) : null,
          }
        : null,
      repeatWarning,
      weatherContext: plan.weatherContext as Record<string, unknown> | null,
    };
  }

  // ──────────────────────────────────────────────
  // D-11: 重复穿搭检测
  // ──────────────────────────────────────────────

  /**
   * 检查某天的计划是否与近期计划重复 (item overlap > 70%)
   */
  async checkRepeatOutfit(
    userId: string,
    date: string
  ): Promise<{
    isRepeat: boolean;
    repeatingPlanIds: string[];
    overlapPercentage: number | null;
    overlappingItems: string[];
  }> {
    const parsedDate = new Date(date);

    // 获取该天的计划
    const currentPlan = await this.prisma.outfitPlan.findUnique({
      where: { userId_plannedDate: { userId, plannedDate: parsedDate } },
      include: { outfit: { include: { items: { include: { clothing: true } } } } },
    });

    if (!currentPlan?.outfit) {
      return {
        isRepeat: false,
        repeatingPlanIds: [],
        overlapPercentage: null,
        overlappingItems: [],
      };
    }

    const currentItemIds = new Set(currentPlan.outfit.items.map((item) => item.clothingId));

    if (currentItemIds.size === 0) {
      return {
        isRepeat: false,
        repeatingPlanIds: [],
        overlapPercentage: null,
        overlappingItems: [],
      };
    }

    // 查看前后 3 天的计划
    const lookbackStart = new Date(parsedDate);
    lookbackStart.setDate(lookbackStart.getDate() - 3);
    const lookbackEnd = new Date(parsedDate);
    lookbackEnd.setDate(lookbackEnd.getDate() + 3);

    const nearbyPlans = await this.prisma.outfitPlan.findMany({
      where: {
        userId,
        plannedDate: { gte: lookbackStart, lte: lookbackEnd },
        id: { not: currentPlan.id },
      },
      include: { outfit: { include: { items: { include: { clothing: true } } } } },
    });

    const repeatingPlanIds: string[] = [];
    let maxOverlap = 0;
    const overlappingItemNames: string[] = [];

    for (const nearby of nearbyPlans) {
      if (!nearby.outfit) {continue;}

      const nearbyItemIds = new Set(nearby.outfit.items.map((item) => item.clothingId));
      if (nearbyItemIds.size === 0) {continue;}

      const overlapCount = [...currentItemIds].filter((id) => nearbyItemIds.has(id)).length;
      const overlapPct = (overlapCount / Math.max(currentItemIds.size, nearbyItemIds.size)) * 100;

      if (overlapPct > 70) {
        repeatingPlanIds.push(nearby.id);
        if (overlapPct > maxOverlap) {
          maxOverlap = overlapPct;
          // Collect overlapping item names
          overlappingItemNames.length = 0;
          for (const item of currentPlan.outfit.items) {
            if (nearbyItemIds.has(item.clothingId) && item.clothing) {
              overlappingItemNames.push(item.clothing.name || item.clothingId);
            }
          }
        }
      }
    }

    return {
      isRepeat: repeatingPlanIds.length > 0,
      repeatingPlanIds,
      overlapPercentage: repeatingPlanIds.length > 0 ? Math.round(maxOverlap) : null,
      overlappingItems: overlappingItemNames,
    };
  }

  /**
   * 内部: 检查某日某 outfit 是否重复
   */
  private async checkRepeatForDay(
    userId: string,
    date: string,
    outfitId: string
  ): Promise<boolean> {
    const result = await this.checkRepeatOutfit(userId, date);
    return result.isRepeat;
  }

  // ──────────────────────────────────────────────
  // Events 获取 (CONCRETE implementation)
  // ──────────────────────────────────────────────

  /**
   * 获取用户未来 7 天的即将到来的事件
   *
   * 从 AiStylistSession 的 payload 中提取事件信息。
   * 用户在与 AI 造型师对话时，可以提及日程事件（如面试、约会等），
   * 这些信息会存储在 session 的 payload.goal 和 payload.context 中。
   */
  async getUpcomingEvents(
    userId: string
  ): Promise<Array<{ date: string; name: string; scene: string }>> {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Query active sessions from the past 30 days that may contain event info
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await this.prisma.aiStylistSession.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        status: "active",
      },
      select: {
        id: true,
        payload: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const events: Array<{ date: string; name: string; scene: string }> = [];

    for (const session of sessions) {
      const payload = session.payload as Record<string, unknown> | null;
      if (!payload) {continue;}

      // Check payload.context for scheduled events
      const context = payload.context as Record<string, unknown> | undefined;
      if (context?.scheduledDate) {
        const scheduledDate = new Date(String(context.scheduledDate));
        if (scheduledDate >= now && scheduledDate <= nextWeek) {
          const dateStr = scheduledDate.toISOString().slice(0, 10);
          const goal = typeof payload.goal === "string" ? payload.goal : "";
          const entry = typeof context.entry === "string" ? String(context.entry) : "daily";

          // Deduplicate by date
          if (!events.some((e) => e.date === dateStr)) {
            events.push({
              date: dateStr,
              name: goal || "日程事件",
              scene: this.inferSceneFromGoal(goal, entry),
            });
          }
        }
      }

      // Check payload slots for event data
      const slots = payload.slots as Record<string, unknown> | undefined;
      if (slots?.occasion && slots?.date) {
        const slotDate = new Date(String(slots.date));
        if (slotDate >= now && slotDate <= nextWeek) {
          const dateStr = slotDate.toISOString().slice(0, 10);
          if (!events.some((e) => e.date === dateStr)) {
            events.push({
              date: dateStr,
              name: String(slots.occasion),
              scene: this.mapOccasionToScene(String(slots.occasion)),
            });
          }
        }
      }
    }

    return events;
  }

  // ──────────────────────────────────────────────
  // 偏好信号发射 (CAL-05)
  // ──────────────────────────────────────────────

  /**
   * 当用户手动编辑日历计划时，发射偏好信号
   * 创建 UserBehaviorEvent 记录，用于推荐系统学习
   */
  private async emitPreferenceSignal(
    userId: string,
    date: string,
    outfitId: string
  ): Promise<void> {
    try {
      await this.prisma.userBehaviorEvent.create({
        data: {
          userId,
          sessionId: `calendar-${date}`,
          eventType: "calendar_edit",
          category: "outfit",
          action: "calendar_plan_edit",
          targetType: "outfit",
          targetId: outfitId,
          metadata: {
            plannedDate: date,
            source: "manual",
            timestamp: new Date().toISOString(),
          },
          source: "calendar_plan",
        },
      });

      this.logger.log(
        `Emitted preference signal for user ${userId}, outfit ${outfitId} on ${date}`
      );
    } catch (error) {
      this.logger.error(`Failed to emit preference signal: ${error}`);
    }
  }

  // ──────────────────────────────────────────────
  // Helper methods
  // ──────────────────────────────────────────────

  getMonthSeason(month: number): string {
    if (month >= 2 && month <= 4) {return "spring";}
    if (month >= 5 && month <= 7) {return "summer";}
    if (month >= 8 && month <= 10) {return "autumn";}
    return "winter";
  }

  getTempRangeForSeason(season: string): { min: number; max: number } {
    switch (season) {
      case "spring":
        return { min: 10, max: 22 };
      case "summer":
        return { min: 25, max: 38 };
      case "autumn":
        return { min: 10, max: 22 };
      case "winter":
        return { min: -10, max: 8 };
      default:
        return { min: 10, max: 25 };
    }
  }

  inferSceneFromWeather(forecast: DailyForecast | null, sceneHint: string | null): string {
    if (sceneHint) {return sceneHint;}

    if (!forecast) {return "日常";}

    const avgTemp = (forecast.tempHigh + forecast.tempLow) / 2;

    if (forecast.condition.includes("雨")) {return "室内";}
    if (forecast.condition.includes("雪")) {return "保暖出行";}

    if (avgTemp >= 30) {return "清爽日常";}
    if (avgTemp >= 20) {return "户外休闲";}
    if (avgTemp >= 10) {return "通勤办公";}
    if (avgTemp >= 0) {return "保暖外出";}

    return "保暖出行";
  }

  private inferSceneFromGoal(goal: string, entry: string): string {
    const goalLower = goal.toLowerCase();
    const entryLower = entry.toLowerCase();

    if (goalLower.includes("面试") || entryLower.includes("interview")) {return "面试";}
    if (goalLower.includes("约会") || entryLower.includes("date")) {return "约会";}
    if (goalLower.includes("会议") || goalLower.includes("商务")) {return "商务";}
    if (goalLower.includes("派对") || goalLower.includes("party")) {return "派对";}
    if (goalLower.includes("运动") || goalLower.includes("健身")) {return "运动";}
    if (goalLower.includes("旅行") || goalLower.includes("出游")) {return "旅行";}

    return "日常";
  }

  private mapOccasionToScene(occasion: string): string {
    const mapping: Record<string, string> = {
      interview: "面试",
      date: "约会",
      business: "商务",
      party: "派对",
      casual: "日常",
      formal: "正式",
      sport: "运动",
      travel: "旅行",
    };
    return mapping[occasion.toLowerCase()] ?? "日常";
  }

  private isRelatedScene(occasionA: string, occasionB: string): boolean {
    const relatedGroups = [
      ["商务", "正式", "通勤", "办公", "面试"],
      ["休闲", "日常", "周末"],
      ["约会", "浪漫", "晚餐"],
      ["运动", "健身", "户外"],
      ["派对", "聚会", "夜店"],
    ];

    return relatedGroups.some((group) => group.includes(occasionA) && group.includes(occasionB));
  }
}

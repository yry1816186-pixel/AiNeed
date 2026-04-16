import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BehaviorEventType } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import { RedisService } from "../../../../common/redis/redis.service";
import { TrackEventDto } from "../dto/track-event.dto";

export interface RecentBehaviorEvent {
  id: string;
  userId: string | null;
  sessionId: string;
  anonymousId: string | null;
  eventType: BehaviorEventType;
  category: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  source: string | null;
  referrer: string | null;
  deviceInfo: Record<string, unknown> | null;
  location: Record<string, unknown> | null;
  duration: number | null;
  createdAt: Date;
}

export interface EventMetadata {
  implicitFeedback?: ImplicitFeedback;
  category?: string;
  style?: string;
  color?: string;
  brand?: string;
  itemCategory?: string;
  query?: string;
  clicked?: boolean;
  purchased?: boolean;
  [key: string]: unknown;
}

export interface EnrichedEvent extends TrackEventDto {
  createdAt: string;
  implicitScore: number;
  sessionContext: SessionContext;
  metadata?: EventMetadata;
}

export interface SessionContext {
  eventCount: number;
  startTime: number;
  categories: string[];
  priceRange: { min: number | null; max: number | null };
}

export interface SessionAggregation {
  totalEvents: number;
  totalDwellTime: number;
  totalScrollDepth: number;
  categories: string[];
  styles: string[];
  colors: string[];
  brands: string[];
  implicitScoreSum: number;
  startTime: number;
}

export interface UserPreferenceWeightItem {
  category: string;
  key: string;
  weight: number;
  decayedWeight?: number;
  trend: "rising" | "stable" | "declining";
  updatedAt: Date;
  interactionCount?: number;
}

export interface BehaviorProfile {
  preferences: {
    styles: Array<{ key: string; weight: number; trend: string }>;
    colors: Array<{ key: string; weight: number; trend: string }>;
    brands: Array<{ key: string; weight: number; trend: string }>;
    categories: Array<{ key: string; weight: number; trend: string }>;
  };
  recentBehaviors: RecentBehaviorEvent[];
  stats: {
    totalEvents: number;
    lastEventTime: Date | null;
    engagementScore: number;
    preferenceStability: number;
  };
  implicitSignals: {
    avgDwellTime: number;
    avgScrollDepth: number;
    clickThroughRate: number;
    conversionRate: number;
  };
}

export interface ImplicitFeedback {
  dwellTime: number;
  scrollDepth: number;
  mouseMovements: number;
  clickCount: number;
  isBounce: boolean;
  scrollVelocity: number;
  attentionScore: number;
}

export interface PreferenceWeight {
  category: string;
  key: string;
  weight: number;
  decayedWeight: number;
  lastUpdated: Date;
  interactionCount: number;
  trend: "rising" | "stable" | "declining";
}

@Injectable()
export class BehaviorTrackerService {
  private readonly logger = new Logger(BehaviorTrackerService.name);
  private readonly EVENT_QUEUE_KEY = "behavior:events";
  private readonly BATCH_SIZE = 100;

  private readonly TIME_DECAY_CONFIG = {
    halfLifeDays: 30,
    minWeight: 0.05,
    maxWeight: 1.0,
  };

  private readonly IMPLICIT_FEEDBACK_WEIGHTS = {
    dwellTime: {
      thresholds: [5, 15, 30, 60, 120],
      weights: [0.05, 0.1, 0.15, 0.2, 0.25],
    },
    scrollDepth: {
      thresholds: [25, 50, 75, 90],
      weights: [0.05, 0.1, 0.15, 0.2],
    },
    attentionScore: {
      thresholds: [0.3, 0.5, 0.7, 0.9],
      weights: [0.1, 0.15, 0.2, 0.25],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 追踪用户行为事件
   * 高性能设计：先写入Redis队列，异步批量入库
   * 支持隐式反馈信号处理
   */
  async track(event: TrackEventDto): Promise<void> {
    try {
      if (event.userId) {
        const consent = await this.getUserConsent(event.userId);
        if (!consent?.granted) {
          this.logger.debug(`User ${event.userId} has disabled tracking`);
          return;
        }
      }

      const enrichedEvent = {
        ...event,
        createdAt: new Date().toISOString(),
        implicitScore: this.calculateImplicitScore(
          event.metadata?.implicitFeedback,
        ),
        sessionContext: await this.getSessionContext(event.sessionId),
      };

      await this.redis
        .getClient()
        .lpush(this.EVENT_QUEUE_KEY, JSON.stringify(enrichedEvent));

      await this.updateRealtimeStats(event);

      if (event.userId) {
        await this.updateSessionAggregation(
          event.userId,
          event.sessionId,
          enrichedEvent,
        );
      }

      this.logger.debug(
        `Tracked event: ${event.eventType} for session ${event.sessionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to track event: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * 计算隐式反馈得分
   */
  private calculateImplicitScore(implicitFeedback?: ImplicitFeedback): number {
    if (!implicitFeedback) {return 0;}

    let score = 0;

    const dwellTime = implicitFeedback.dwellTime || 0;
    const dwellThresholds = this.IMPLICIT_FEEDBACK_WEIGHTS.dwellTime.thresholds;
    const dwellWeights = this.IMPLICIT_FEEDBACK_WEIGHTS.dwellTime.weights;
    for (let i = dwellThresholds.length - 1; i >= 0; i--) {
      const threshold = dwellThresholds[i];
      if (threshold !== undefined && dwellTime >= threshold) {
        score += dwellWeights[i] ?? 0;
        break;
      }
    }

    const scrollDepth = implicitFeedback.scrollDepth || 0;
    const scrollThresholds =
      this.IMPLICIT_FEEDBACK_WEIGHTS.scrollDepth.thresholds;
    const scrollWeights = this.IMPLICIT_FEEDBACK_WEIGHTS.scrollDepth.weights;
    for (let i = scrollThresholds.length - 1; i >= 0; i--) {
      const threshold = scrollThresholds[i];
      if (threshold !== undefined && scrollDepth >= threshold) {
        score += scrollWeights[i] ?? 0;
        break;
      }
    }

    const attentionScore = implicitFeedback.attentionScore || 0;
    const attThresholds =
      this.IMPLICIT_FEEDBACK_WEIGHTS.attentionScore.thresholds;
    const attWeights = this.IMPLICIT_FEEDBACK_WEIGHTS.attentionScore.weights;
    for (let i = attThresholds.length - 1; i >= 0; i--) {
      const threshold = attThresholds[i];
      if (threshold !== undefined && attentionScore >= threshold) {
        score += attWeights[i] ?? 0;
        break;
      }
    }

    if (implicitFeedback.isBounce) {
      score *= 0.3;
    }

    if (
      implicitFeedback.scrollVelocity &&
      implicitFeedback.scrollVelocity > 1000
    ) {
      score *= 0.7;
    }

    return Math.min(score, 1.0);
  }

  /**
   * 获取会话上下文
   */
  private async getSessionContext(sessionId: string): Promise<SessionContext> {
    const client = this.redis.getClient();
    const contextKey = `session:${sessionId}:context`;

    const context = await client.get(contextKey);
    if (context) {
      return JSON.parse(context);
    }

    return {
      eventCount: 0,
      startTime: Date.now(),
      categories: [],
      priceRange: { min: null, max: null },
    };
  }

  /**
   * 更新会话聚合数据
   */
  private async updateSessionAggregation(
    userId: string,
    sessionId: string,
    event: EnrichedEvent,
  ): Promise<void> {
    const client = this.redis.getClient();
    const sessionKey = `session:${sessionId}:aggregation`;
    const userSessionKey = `user:${userId}:sessions`;

    const aggregation = await client.get(sessionKey);
    const sessionData = aggregation
      ? JSON.parse(aggregation)
      : {
          totalEvents: 0,
          totalDwellTime: 0,
          totalScrollDepth: 0,
          categories: new Set(),
          styles: new Set(),
          colors: new Set(),
          brands: new Set(),
          implicitScoreSum: 0,
          startTime: Date.now(),
        };

    sessionData.totalEvents += 1;
    sessionData.totalDwellTime +=
      event.metadata?.implicitFeedback?.dwellTime || 0;
    sessionData.totalScrollDepth +=
      event.metadata?.implicitFeedback?.scrollDepth || 0;
    sessionData.implicitScoreSum += event.implicitScore || 0;

    if (event.metadata?.category)
      {sessionData.categories.add(event.metadata.category);}
    if (event.metadata?.style) {sessionData.styles.add(event.metadata.style);}
    if (event.metadata?.color) {sessionData.colors.add(event.metadata.color);}
    if (event.metadata?.brand) {sessionData.brands.add(event.metadata.brand);}

    sessionData.categories = Array.from(sessionData.categories);
    sessionData.styles = Array.from(sessionData.styles);
    sessionData.colors = Array.from(sessionData.colors);
    sessionData.brands = Array.from(sessionData.brands);

    await client.setex(sessionKey, 86400, JSON.stringify(sessionData));
    await client.zadd(userSessionKey, Date.now(), sessionId);
    await client.expire(userSessionKey, 86400 * 30);
  }

  /**
   * 批量处理事件（定时任务，每5秒执行）
   */
  @Cron("*/5 * * * * *")
  async processBatchEvents(): Promise<void> {
    try {
      const client = this.redis.getClient();
      const events: string[] = [];

      // 从队列中取出事件
      for (let i = 0; i < this.BATCH_SIZE; i++) {
        const event = await client.rpop(this.EVENT_QUEUE_KEY);
        if (!event) {break;}
        events.push(event);
      }

      if (events.length === 0) {return;}

      this.logger.log(`Processing ${events.length} behavior events`);

      // 批量入库
      const parsedEvents = events.map((e) => {
        const parsed = JSON.parse(e);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
        };
      });

      await this.prisma.userBehaviorEvent.createMany({
        data: parsedEvents,
        skipDuplicates: true,
      });

      // 异步更新用户画像权重
      await this.updatePreferenceWeightsBatch(parsedEvents);
    } catch (error) {
      this.logger.error(
        `Failed to process batch events: ${this.getErrorMessage(error)}`,
      );
    }
  }

  /**
   * 获取用户行为画像
   */
  async getUserBehaviorProfile(userId: string): Promise<BehaviorProfile> {
    const [preferencesRaw, recentEvents, stats, implicitSignals, _sessionSummary] =
      await Promise.all([
        this.prisma.userPreferenceWeight.findMany({
          where: { userId },
          orderBy: { weight: "desc" },
        }),
        this.getRecentEvents(userId, 30),
        this.getBehaviorStats(userId),
        this.getImplicitSignals(userId),
        this.getUserSessionSummary(userId),
      ]);

    // Map Prisma results to include default trend field
    const preferences: UserPreferenceWeightItem[] = preferencesRaw.map((p) => ({
      category: p.category,
      key: p.key,
      weight: Number(p.weight),
      trend: "stable" as const,
      updatedAt: p.updatedAt,
    }));

    const aggregatedPrefs = await this.aggregatePreferencesWithTrends(
      userId,
      preferences,
    );

    return {
      preferences: aggregatedPrefs,
      recentBehaviors: recentEvents,
      stats: {
        ...stats,
        engagementScore: this.calculateEngagementScore(stats, implicitSignals),
        preferenceStability: this.calculatePreferenceStability(preferences),
      },
      implicitSignals,
    };
  }

  /**
   * 获取隐式信号统计
   */
  private async getImplicitSignals(
    userId: string,
  ): Promise<BehaviorProfile["implicitSignals"]> {
    const client = this.redis.getClient();
    const statsKey = `user:${userId}:implicit_stats`;

    const cached = await client.get(statsKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const events = await this.prisma.userBehaviorEvent.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { metadata: true },
    });

    let totalDwellTime = 0;
    let totalScrollDepth = 0;
    let viewCount = 0;
    let clickCount = 0;
    let purchaseCount = 0;

    for (const event of events) {
      const meta = (event.metadata as Record<string, unknown>) || {};
      if (meta.implicitFeedback) {
        totalDwellTime += meta.implicitFeedback.dwellTime || 0;
        totalScrollDepth += meta.implicitFeedback.scrollDepth || 0;
      }
      viewCount++;
      if (meta.clicked) {clickCount++;}
      if (meta.purchased) {purchaseCount++;}
    }

    const result = {
      avgDwellTime: viewCount > 0 ? totalDwellTime / viewCount : 0,
      avgScrollDepth: viewCount > 0 ? totalScrollDepth / viewCount : 0,
      clickThroughRate: viewCount > 0 ? clickCount / viewCount : 0,
      conversionRate: clickCount > 0 ? purchaseCount / clickCount : 0,
    };

    await client.setex(statsKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * 获取用户会话摘要
   */
  private async getUserSessionSummary(userId: string): Promise<SessionAggregation[]> {
    const client = this.redis.getClient();
    const userSessionKey = `user:${userId}:sessions`;

    const sessionIds = await client.zrevrange(userSessionKey, 0, 9);

    const summaries = [];
    for (const sessionId of sessionIds) {
      const sessionKey = `session:${sessionId}:aggregation`;
      const data = await client.get(sessionKey);
      if (data) {
        summaries.push(JSON.parse(data));
      }
    }

    return summaries;
  }

  /**
   * 计算参与度得分
   */
  private calculateEngagementScore(
    stats: { totalEvents: number },
    implicitSignals: BehaviorProfile["implicitSignals"],
  ): number {
    const eventScore = Math.min(stats.totalEvents / 100, 1) * 0.3;
    const dwellScore = Math.min(implicitSignals.avgDwellTime / 60, 1) * 0.3;
    const scrollScore = Math.min(implicitSignals.avgScrollDepth / 100, 1) * 0.2;
    const ctrScore = Math.min(implicitSignals.clickThroughRate * 5, 1) * 0.2;

    return eventScore + dwellScore + scrollScore + ctrScore;
  }

  /**
   * 计算偏好稳定性
   */
  private calculatePreferenceStability(preferences: UserPreferenceWeightItem[]): number {
    if (preferences.length === 0) {return 0;}

    const client = this.redis.getClient();
    const totalStability = 0;
    const count = 0;

    return 0.7;
  }

  /**
   * 聚合偏好（带趋势）
   */
  private async aggregatePreferencesWithTrends(
    userId: string,
    preferences: UserPreferenceWeightItem[],
  ): Promise<BehaviorProfile["preferences"]> {
    const client = this.redis.getClient();
    const result = {
      styles: [] as Array<{ key: string; weight: number; trend: string }>,
      colors: [] as Array<{ key: string; weight: number; trend: string }>,
      brands: [] as Array<{ key: string; weight: number; trend: string }>,
      categories: [] as Array<{ key: string; weight: number; trend: string }>,
    };

    for (const pref of preferences) {
      const trendKey = `preference:${userId}:${pref.category}:${pref.key}:trend`;
      const history = await client.lrange(trendKey, 0, 0);
      let trend = "stable";

      if (history.length > 0) {
        try {
          const latestEntry = history[0];
          if (!latestEntry) {
            continue;
          }
          const latest = JSON.parse(latestEntry);
          trend = latest.trend || "stable";
        } catch (e) {
          trend = "stable";
        }
      }

      const item = { key: pref.key, weight: pref.weight, trend };
      if (pref.category === "style") {result.styles.push(item);}
      else if (pref.category === "color") {result.colors.push(item);}
      else if (pref.category === "brand") {result.brands.push(item);}
      else if (pref.category === "category") {result.categories.push(item);}
    }

    return result;
  }

  /**
   * 基于行为更新推荐权重
   */
  private async updatePreferenceWeightsBatch(events: EnrichedEvent[]): Promise<void> {
    const userEventsMap = new Map<string, any[]>();

    // 按用户分组
    for (const event of events) {
      if (!event.userId) {continue;}
      const userEvents = userEventsMap.get(event.userId) || [];
      userEvents.push(event);
      userEventsMap.set(event.userId, userEvents);
    }

    // 批量更新
    for (const [userId, userEvents] of userEventsMap) {
      try {
        await this.updatePreferenceWeights(userId, userEvents);
      } catch (error) {
        this.logger.error(
          `Failed to update preferences for user ${userId}: ${this.getErrorMessage(error)}`,
        );
      }
    }
  }

  private async updatePreferenceWeights(
    userId: string,
    events: EnrichedEvent[],
  ): Promise<void> {
    const weights = new Map<string, { delta: number; implicitSum: number }>();

    for (const event of events) {
      const baseImpact = this.getEventImpact(event.eventType);
      const implicitScore = event.implicitScore || 0;
      const combinedImpact = baseImpact * (1 + implicitScore * 0.5);
      const features = this.extractFeatures(event);

      for (const [category, key] of Object.entries(features)) {
        if (!key) {continue;}
        const compoundKey = `${category}:${key}`;
        const current = weights.get(compoundKey) || {
          delta: 0,
          implicitSum: 0,
        };
        weights.set(compoundKey, {
          delta: current.delta + combinedImpact,
          implicitSum: current.implicitSum + implicitScore,
        });
      }
    }

    const existingPrefs = await this.prisma.userPreferenceWeight.findMany({
      where: { userId },
    });
    const existingMap = new Map(
      existingPrefs.map((p) => [`${p.category}:${p.key}`, p]),
    );

    const now = new Date();
    const upserts = [];
    const trendUpdates: Array<{
      category: string;
      key: string;
      trend: "rising" | "stable" | "declining";
      weight: number;
    }> = [];

    for (const [compoundKey, data] of weights.entries()) {
      const [category, key] = compoundKey.split(":");
      if (!category || !key) {
        continue;
      }
      const existing = existingMap.get(compoundKey);

      let newWeight: number;
      let trend: "rising" | "stable" | "declining" = "stable";
      let interactionCount = 1;

      if (existing) {
        const decayedWeight = this.applyTimeDecay(
          Number(existing.weight),
          existing.updatedAt,
        );
        newWeight = Math.min(
          Math.max(
            decayedWeight + data.delta * 0.3,
            this.TIME_DECAY_CONFIG.minWeight,
          ),
          this.TIME_DECAY_CONFIG.maxWeight,
        );
        interactionCount = (existing as Record<string, unknown>).interactionCount as number || 1;
        interactionCount += 1;

        const weightChange = newWeight - decayedWeight;
        if (weightChange > 0.05) {trend = "rising";}
        else if (weightChange < -0.05) {trend = "declining";}
      } else {
        newWeight = Math.min(
          Math.max(data.delta, this.TIME_DECAY_CONFIG.minWeight),
          this.TIME_DECAY_CONFIG.maxWeight,
        );
        trend = "rising";
      }

      upserts.push(
        this.prisma.userPreferenceWeight.upsert({
          where: {
            userId_category_key: { userId, category, key },
          },
          update: {
            weight: newWeight,
            source: "implicit",
            updatedAt: now,
          },
          create: {
            userId,
            category,
            key,
            weight: newWeight,
            source: "implicit",
          },
        }),
      );

      // 收集趋势更新，稍后批量处理
      trendUpdates.push({ category, key, trend, weight: newWeight });
    }

    // 批量执行数据库操作
    const allOperations = [
      ...(upserts.length > 0 ? upserts : []),
      ...trendUpdates.map(({ category, key, trend, weight }) =>
        this.updatePreferenceTrend(userId, category, key, trend, weight),
      ),
    ];

    if (allOperations.length > 0) {
      await Promise.all(allOperations);
    }
  }

  /**
   * 应用时间衰减
   */
  private applyTimeDecay(currentWeight: number, lastUpdated: Date): number {
    const daysSinceUpdate =
      (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = Math.pow(
      0.5,
      daysSinceUpdate / this.TIME_DECAY_CONFIG.halfLifeDays,
    );
    return currentWeight * decayFactor;
  }

  /**
   * 更新偏好趋势
   */
  private async updatePreferenceTrend(
    userId: string,
    category: string,
    key: string,
    trend: "rising" | "stable" | "declining",
    weight: number,
  ): Promise<void> {
    const client = this.redis.getClient();
    const trendKey = `preference:${userId}:${category}:${key}:trend`;

    const history = await client.lrange(trendKey, 0, 6);
    const newEntry = JSON.stringify({
      weight,
      trend,
      timestamp: Date.now(),
    });

    await client.lpush(trendKey, newEntry);
    await client.ltrim(trendKey, 0, 6);
    await client.expire(trendKey, 86400 * 90);
  }

  /**
   * 行为影响权重
   */
  private getEventImpact(type: BehaviorEventType): number {
    const impacts: Record<BehaviorEventType, number> = {
      purchase: 1.0,
      favorite: 0.7,
      try_on_complete: 0.6,
      add_to_cart: 0.5,
      recommendation_click: 0.3,
      try_on_start: 0.2,
      item_view: 0.1,
      share: 0.15,
      click: 0.08,
      page_view: 0.05,
      scroll: 0.03,
      search: 0.1,
      filter: 0.08,
      unfavorite: -0.3,
      remove_from_cart: -0.2,
      recommendation_view: 0.05,
      post_create: 0.5,
      post_like: 0.3,
      post_comment: 0.4,
      user_follow: 0.3,
    };
    return impacts[type] ?? 0.05;
  }

  /**
   * 从事件中提取特征
   */
  private extractFeatures(event: EnrichedEvent): Record<string, string | null> {
    const features: Record<string, string | null> = {
      style: null,
      color: null,
      brand: null,
      category: null,
    };

    // 从metadata中提取
    if (event.metadata) {
      if (event.metadata.style) {features.style = event.metadata.style;}
      if (event.metadata.color) {features.color = event.metadata.color;}
      if (event.metadata.brand) {features.brand = event.metadata.brand;}
      if (event.metadata.category) {features.category = event.metadata.category;}
    }

    // 从targetType推断
    if (event.targetType === "clothing" && event.metadata?.itemCategory) {
      features.category = event.metadata.itemCategory;
    }

    return features;
  }

  /**
   * 实时更新统计数据
   */
  private async updateRealtimeStats(event: TrackEventDto): Promise<void> {
    const client = this.redis.getClient();

    // 更新热门商品
    if (event.targetType === "clothing" && event.targetId) {
      await client.zincrby("trending:items", 1, event.targetId);
    }

    // 更新热门搜索
    if (event.eventType === "search" && event.metadata?.query) {
      await client.zincrby("trending:searches", 1, event.metadata.query);
    }
  }

  /**
   * 获取用户同意设置
   */
  private async getUserConsent(
    userId: string,
  ): Promise<{ granted: boolean } | null> {
    return this.prisma.userConsent.findUnique({
      where: {
        userId_consentType: { userId, consentType: "tracking" },
      },
      select: { granted: true },
    });
  }

  /**
   * 获取最近事件
   */
  private async getRecentEvents(userId: string, days: number): Promise<RecentBehaviorEvent[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await this.prisma.userBehaviorEvent.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Map Prisma results to the expected type, converting JsonValue to Record<string, unknown>
    return events.map((event) => ({
      id: event.id,
      userId: event.userId,
      sessionId: event.sessionId,
      anonymousId: event.anonymousId,
      eventType: event.eventType,
      category: event.category,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata as Record<string, unknown> | null,
      source: event.source,
      referrer: event.referrer,
      deviceInfo: event.deviceInfo as Record<string, unknown> | null,
      location: event.location as Record<string, unknown> | null,
      duration: event.duration,
      createdAt: event.createdAt,
    }));
  }

  /**
   * 获取行为统计
   */
  private async getBehaviorStats(
    userId: string,
  ): Promise<{ totalEvents: number; lastEventTime: Date | null }> {
    const [totalResult, lastResult] = await Promise.all([
      this.prisma.userBehaviorEvent.count({ where: { userId } }),
      this.prisma.userBehaviorEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalEvents: totalResult,
      lastEventTime: lastResult?.createdAt || null,
    };
  }

  /**
   * 聚合偏好
   */
  private aggregatePreferences(preferences: UserPreferenceWeightItem[]): {
    styles: Array<{ key: string; weight: number }>;
    colors: Array<{ key: string; weight: number }>;
    brands: Array<{ key: string; weight: number }>;
  } {
    const result = {
      styles: [] as Array<{ key: string; weight: number }>,
      colors: [] as Array<{ key: string; weight: number }>,
      brands: [] as Array<{ key: string; weight: number }>,
    };

    for (const pref of preferences) {
      const item = { key: pref.key, weight: pref.weight };
      if (pref.category === "style") {result.styles.push(item);}
      else if (pref.category === "color") {result.colors.push(item);}
      else if (pref.category === "brand") {result.brands.push(item);}
    }

    return result;
  }

  /**
   * 获取热门趋势
   */
  async getTrending(
    type: "items" | "searches",
    limit: number = 10,
  ): Promise<Array<{ id: string; score: number }>> {
    const client = this.redis.getClient();
    const key = type === "items" ? "trending:items" : "trending:searches";

    const results = await client.zrevrange(key, 0, limit - 1, "WITHSCORES");

    const items: Array<{ id: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      const id = results[i];
      const score = results[i + 1];
      if (!id || score === undefined) {
        continue;
      }
      items.push({
        id,
        score: parseFloat(score),
      });
    }

    return items;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}

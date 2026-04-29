import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

import { RedisService } from "../../../common/redis/redis.service";
import type { DemoPreCacheResponseDto } from "../dto/demo-cache.dto";

interface SeedProfile {
  email: string;
  profile: {
    bodyType: string;
    styleExpression: string;
    primaryScenarios: string[];
    budget: string;
    ageBand: string;
    nickname: string;
    gender: string;
  };
  wardrobe: Array<{ id: string; name: string; category: string; color: string }>;
  preferences: { colors: string[]; materials: string[]; brands: string[] };
}

interface SeedData {
  users: SeedProfile[];
}

const DEMO_SCENES = ["interview", "date", "casual", "formal", "sport"];
const TTS_PHRASES = [
  "greeting",
  "scene_prompt",
  "style_question",
  "generating",
  "outfit_ready",
  "outfit_explain",
  "item_detail",
  "feedback_thanks",
  "adjust_try",
  "session_end",
  "welcome_back",
  "scene_switch",
  "today_recommend",
  "cross_scene_memory",
];

@Injectable()
export class DemoCacheService {
  private readonly logger = new Logger(DemoCacheService.name);
  private readonly backendUrl: string;
  private readonly cacheTtl: number;
  private readonly redisPrefix: string;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {
    this.backendUrl = this.configService.get<string>("BACKEND_URL", "http://localhost:3001");
    this.cacheTtl = parseInt(this.configService.get<string>("DEMO_CACHE_TTL", "3600"), 10);
    this.redisPrefix = this.configService.get<string>("DEMO_CACHE_REDIS_PREFIX", "demo:cache:");
  }

  async preCacheAll(): Promise<DemoPreCacheResponseDto> {
    const errors: string[] = [];
    let recommendations = 0;
    let ttsPhrases = 0;
    let sceneConfigs = 0;

    try {
      recommendations = await this.preCacheRecommendations();
    } catch (err) {
      const msg = `推荐预缓存失败: ${err instanceof Error ? err.message : String(err)}`;
      this.logger.error(msg);
      errors.push(msg);
    }

    try {
      ttsPhrases = await this.preCacheTtsPhrases();
    } catch (err) {
      const msg = `TTS预缓存失败: ${err instanceof Error ? err.message : String(err)}`;
      this.logger.error(msg);
      errors.push(msg);
    }

    try {
      sceneConfigs = await this.preCacheSceneConfigs();
    } catch (err) {
      const msg = `场景配置预缓存失败: ${err instanceof Error ? err.message : String(err)}`;
      this.logger.error(msg);
      errors.push(msg);
    }

    return {
      status: errors.length > 0 ? "partial" : "success",
      recommendations,
      ttsPhrases,
      sceneConfigs,
      errors,
    };
  }

  async getStatus(): Promise<{
    recommendations: number;
    ttsPhrases: number;
    sceneConfigs: number;
    total: number;
    status: string;
  }> {
    let recommendations = 0;
    let ttsPhrases = 0;
    let sceneConfigs = 0;

    try {
      const seedData = this.loadSeedData();
      for (const user of seedData.users) {
        const profileId = user.profile.nickname || user.email;
        for (const scene of DEMO_SCENES) {
          const key = `${this.redisPrefix}rec:${profileId}:${scene}`;
          const exists = await this.redisService.exists(key);
          if (exists) {
            recommendations++;
          }
        }
      }
    } catch (err) {
      this.logger.warn(`检查推荐缓存状态失败: ${err}`);
    }

    try {
      for (const phrase of TTS_PHRASES) {
        const key = `${this.redisPrefix}tts:${phrase}`;
        const exists = await this.redisService.exists(key);
        if (exists) {
          ttsPhrases++;
        }
      }
    } catch (err) {
      this.logger.warn(`检查TTS缓存状态失败: ${err}`);
    }

    try {
      const scenesKey = `${this.redisPrefix}scenes`;
      const exists = await this.redisService.exists(scenesKey);
      if (exists) {
        const raw = await this.redisService.get(scenesKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          sceneConfigs = Array.isArray(parsed)
            ? parsed.length
            : typeof parsed === "object"
            ? Object.keys(parsed).length
            : 0;
        }
      }
    } catch (err) {
      this.logger.warn(`检查场景配置缓存状态失败: ${err}`);
    }

    const total = recommendations + ttsPhrases + sceneConfigs;
    return {
      recommendations,
      ttsPhrases,
      sceneConfigs,
      total,
      status: total > 0 ? "initialized" : "empty",
    };
  }

  private async preCacheRecommendations(): Promise<number> {
    const seedData = this.loadSeedData();
    let count = 0;

    for (const user of seedData.users) {
      const profileId = user.profile.nickname || user.email;
      for (const scene of DEMO_SCENES) {
        try {
          const recommendations = this.buildMockRecommendations(user, scene);
          const key = `${this.redisPrefix}rec:${profileId}:${scene}`;
          await this.redisService.setex(key, this.cacheTtl, JSON.stringify(recommendations));
          count++;
          this.logger.debug(`已缓存推荐: ${profileId}/${scene}`);
        } catch (err) {
          this.logger.warn(
            `缓存推荐失败 ${profileId}/${scene}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    }

    this.logger.log(`推荐预缓存完成: ${count} 项`);
    return count;
  }

  private async preCacheTtsPhrases(): Promise<number> {
    let count = 0;

    try {
      const response = await fetch(`${this.backendUrl}/api/v1/tts/precache`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        count = TTS_PHRASES.length;
        this.logger.log(`TTS预缓存成功: ${count} 个短语`);
      } else {
        this.logger.warn(`TTS预缓存端点返回 ${response.status}，执行本地缓存`);
        count = await this.localTtsCache();
      }
    } catch (err) {
      this.logger.warn(
        `TTS预缓存端点不可用: ${err instanceof Error ? err.message : String(err)}，执行本地缓存`
      );
      count = await this.localTtsCache();
    }

    return count;
  }

  private async localTtsCache(): Promise<number> {
    let count = 0;
    for (const phrase of TTS_PHRASES) {
      try {
        const key = `${this.redisPrefix}tts:${phrase}`;
        await this.redisService.setex(
          key,
          this.cacheTtl,
          JSON.stringify({ phrase, cached: true, audioReady: false })
        );
        count++;
      } catch (err) {
        this.logger.warn(`本地TTS缓存失败 ${phrase}: ${err}`);
      }
    }
    this.logger.log(`本地TTS缓存完成: ${count} 个短语`);
    return count;
  }

  private async preCacheSceneConfigs(): Promise<number> {
    const scenes = [
      {
        id: "interview",
        name: "面试",
        icon: "briefcase",
        description: "专业得体的面试穿搭",
        styleKeywords: ["职业", "干练", "稳重"],
      },
      {
        id: "date",
        name: "约会",
        icon: "heart",
        description: "浪漫迷人的约会穿搭",
        styleKeywords: ["浪漫", "精致", "温柔"],
      },
      {
        id: "casual",
        name: "日常",
        icon: "sun",
        description: "轻松自在的日常穿搭",
        styleKeywords: ["舒适", "休闲", "自然"],
      },
      {
        id: "formal",
        name: "正式场合",
        icon: "star",
        description: "隆重正式的场合穿搭",
        styleKeywords: ["优雅", "大气", "经典"],
      },
      {
        id: "sport",
        name: "运动",
        icon: "activity",
        description: "活力满满的运动穿搭",
        styleKeywords: ["运动", "活力", "机能"],
      },
      {
        id: "party",
        name: "聚会",
        icon: "users",
        description: "闪耀全场的聚会穿搭",
        styleKeywords: ["闪耀", "个性", "吸睛"],
      },
      {
        id: "commute",
        name: "通勤",
        icon: "navigation",
        description: "从容优雅的通勤穿搭",
        styleKeywords: ["简约", "得体", "舒适"],
      },
    ];

    const key = `${this.redisPrefix}scenes`;
    await this.redisService.setex(key, this.cacheTtl, JSON.stringify(scenes));
    this.logger.log(`场景配置预缓存完成: ${scenes.length} 个场景`);
    return scenes.length;
  }

  private loadSeedData(): SeedData {
    const seedPath = path.join(process.cwd(), "docs", "PRESENTATION", "seed-user-data-v2.json");
    if (!fs.existsSync(seedPath)) {
      this.logger.warn(`Seed数据文件不存在: ${seedPath}`);
      return { users: [] };
    }
    const raw = fs.readFileSync(seedPath, "utf-8");
    return JSON.parse(raw) as SeedData;
  }

  private buildMockRecommendations(
    user: SeedProfile,
    scene: string
  ): Array<Record<string, unknown>> {
    const top5 = user.wardrobe.slice(0, 5);
    return [
      {
        scene,
        profileId: user.profile.nickname || user.email,
        styleExpression: user.profile.styleExpression,
        outfits: [
          {
            id: `cached_outfit_${scene}_1`,
            items: top5.map((item) => ({
              id: `${item.id}_${scene}`,
              name: item.name,
              category: item.category,
              color: item.color,
              imageUrl: `/demo/images/${item.category}/${item.color}.jpg`,
            })),
            reasoning: `为${user.profile.nickname}生成的${scene}场景搭配`,
          },
        ],
        cachedAt: new Date().toISOString(),
        isDemo: true,
      },
    ];
  }
}

import * as fs from "fs";
import * as path from "path";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../../common/prisma/prisma.service";

export interface RuleScoredItem {
  itemId: string;
  ruleScore: number;
  matchedRules: string[];
  avoidHits: string[];
}

interface BodyTypeRule {
  id: string;
  body_type: string;
  body_type_zh: string;
  occasion: string;
  occasion_zh: string;
  strategy: string;
  recommended: {
    tops?: string[];
    bottoms?: string[];
    shoes?: string[];
    accessories?: string[];
    outerwear?: string[];
    dresses?: string[];
  };
  recommended_colors: string[];
  avoid_items: string[];
  tips: string;
  formality: number;
}

interface ColorSeasonRule {
  id: string;
  color_season: string;
  color_season_zh: string;
  occasion: string;
  characteristics: string;
  best_colors: string[];
  avoid_colors: string[];
  recommended_metal: string;
  color_combos: Array<{
    colors: string[];
    description: string;
    ratio: string;
  }>;
  tips: string[];
}

interface ChineseOccasionRule {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  tags: string[];
  typical_season: string;
  strategies: {
    female?: OccasionStrategy;
    male?: OccasionStrategy;
  };
}

interface OccasionStrategy {
  core_strategy: string;
  dress_code: string;
  color_principle: string;
  recommended_colors: string[];
  color_combos: Array<{
    colors: string[];
    description: string;
    ratio: string;
  }>;
  tips: string[];
  avoid?: string[];
}

interface FabricRule {
  id: string;
  name: string;
  nameEn: string;
  properties: {
    breathability: number;
    stretch: number;
    formality: number;
    drape: number;
    seasons: string[];
  };
  bodyTypeFit: Record<
    string,
    {
      suitable: boolean;
      note: string;
      bestFor: string[];
    }
  >;
}

interface ItemCompatibilityRule {
  id: string;
  top_category: string;
  top_name_zh: string;
  bottom_category: string;
  bottom_name_zh: string;
  compatibility_score: number;
  suitable_occasions: string[];
  suitable_seasons: string[];
  suitable_styles: string[];
}

interface WeatherOutfitRule {
  id: string;
  temp_range: string;
  temp_name_zh: string;
  temp_range_str: string;
  occasion: string;
  occasion_zh: string;
  recommended_layers: number;
  warmth_level: string;
  layer_details: string[];
  recommended_materials: string[];
  outfit_suggestion: Record<string, string>;
  tips: string;
}

@Injectable()
export class RuleEngineService implements OnModuleInit {
  private readonly logger = new Logger(RuleEngineService.name);

  private bodyTypeRules: BodyTypeRule[] = [];
  private colorSeasonRules: ColorSeasonRule[] = [];
  private chineseOccasionRules: ChineseOccasionRule[] = [];
  private fabricRules: FabricRule[] = [];
  private itemCompatibilityRules: ItemCompatibilityRule[] = [];
  private weatherOutfitRules: WeatherOutfitRule[] = [];
  private trendRules: Record<string, unknown> = {};
  private rulesLoaded = false;

  constructor(private configService: ConfigService, private prismaService: PrismaService) {}

  async onModuleInit() {
    await this.loadAllRules();
  }

  private async loadAllRules(): Promise<void> {
    const rulesDir =
      this.configService.get<string>("FASHION_RULES_DIR") ||
      path.resolve(process.cwd(), "../../ml/data/fashion_rules");

    try {
      if (!fs.existsSync(rulesDir)) {
        this.logger.warn(
          `Fashion rules directory not found: ${rulesDir}. Rule engine will use empty rules.`
        );
        return;
      }

      const loadFile = (filename: string): unknown => {
        const filePath = path.join(rulesDir, filename);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          return JSON.parse(content);
        }
        this.logger.warn(`Rule file not found: ${filePath}`);
        return null;
      };

      const bodyTypeData = loadFile("body_type_rules.json");
      if (Array.isArray(bodyTypeData)) {
        this.bodyTypeRules = bodyTypeData as BodyTypeRule[];
      }

      const colorSeasonData = loadFile("color_season_rules.json");
      if (Array.isArray(colorSeasonData)) {
        this.colorSeasonRules = colorSeasonData as ColorSeasonRule[];
      }

      const occasionData = loadFile("chinese_occasion_rules.json") as Record<
        string,
        unknown
      > | null;
      if (occasionData) {
        const occasions = occasionData.occasions;
        this.chineseOccasionRules = (
          Array.isArray(occasions) ? occasions : occasionData
        ) as ChineseOccasionRule[];
      }

      const fabricData = loadFile("fabric_rules.json") as Record<string, unknown> | null;
      if (fabricData) {
        const fabrics = fabricData.fabrics;
        this.fabricRules = (Array.isArray(fabrics) ? fabrics : fabricData) as FabricRule[];
      }

      const compatData = loadFile("item_compatibility.json");
      if (Array.isArray(compatData)) {
        this.itemCompatibilityRules = compatData as ItemCompatibilityRule[];
      }

      const weatherData = loadFile("weather_outfit_rules.json");
      if (Array.isArray(weatherData)) {
        this.weatherOutfitRules = weatherData as WeatherOutfitRule[];
      }

      const trendData = loadFile("trend_rules.json");
      if (trendData && typeof trendData === "object" && !Array.isArray(trendData)) {
        this.trendRules = trendData as Record<string, unknown>;
      }

      this.rulesLoaded = true;
      this.logger.log(
        `Loaded fashion rules: ${this.bodyTypeRules.length} bodyType, ` +
          `${this.colorSeasonRules.length} colorSeason, ` +
          `${this.chineseOccasionRules.length} occasion, ` +
          `${this.fabricRules.length} fabric, ` +
          `${this.itemCompatibilityRules.length} compatibility, ` +
          `${this.weatherOutfitRules.length} weather`
      );
    } catch (error) {
      this.logger.error(`Failed to load fashion rules: ${error}`);
    }
  }

  isReady(): boolean {
    return this.rulesLoaded;
  }

  async scoreByRules(
    items: Array<{
      id: string;
      name: string;
      category: string;
      colors: string[];
      tags: string[];
      price: number;
      attributes?: Record<string, unknown> | null;
      material?: string | null;
    }>,
    context: {
      bodyType?: string | null;
      colorSeason?: string | null;
      occasion?: string | null;
      season?: string | null;
      weather?: string | null;
      stylePreferences?: string[];
    }
  ): Promise<RuleScoredItem[]> {
    if (!this.rulesLoaded || items.length === 0) {
      return items.map((item) => ({
        itemId: item.id,
        ruleScore: 50,
        matchedRules: [],
        avoidHits: [],
      }));
    }

    const bodyTypeRules = this.findBodyTypeRules(context.bodyType, context.occasion);
    const colorRules = this.findColorSeasonRules(context.colorSeason, context.occasion);
    const occasionRules = this.findOccasionRules(context.occasion);

    return items.map((item) => {
      let score = 50;
      const matchedRules: string[] = [];
      const avoidHits: string[] = [];

      if (bodyTypeRules.length > 0) {
        const btResult = this.scoreByBodyTypeRules(item, bodyTypeRules);
        score += btResult.scoreDelta;
        matchedRules.push(...btResult.matched);
        avoidHits.push(...btResult.avoided);
      }

      if (colorRules.length > 0) {
        const csResult = this.scoreByColorSeasonRules(item, colorRules);
        score += csResult.scoreDelta;
        matchedRules.push(...csResult.matched);
      }

      if (occasionRules) {
        const occResult = this.scoreByOccasionRules(item, occasionRules);
        score += occResult.scoreDelta;
        matchedRules.push(...occResult.matched);
        avoidHits.push(...occResult.avoided);
      }

      if (context.stylePreferences && context.stylePreferences.length > 0) {
        const styleScore = this.scoreByStylePreference(item, context.stylePreferences);
        score += styleScore;
        if (styleScore > 0) {
          matchedRules.push("style_preference_match");
        }
      }

      if (context.season) {
        const seasonScore = this.scoreBySeason(item, context.season);
        score += seasonScore;
      }

      if (context.weather) {
        const weatherScore = this.scoreByWeather(item, context.weather, context.occasion);
        score += weatherScore;
      }

      const trendScore = this.scoreByTrends(item);
      score += trendScore;

      return {
        itemId: item.id,
        ruleScore: Math.max(0, Math.min(100, score)),
        matchedRules,
        avoidHits,
      };
    });
  }

  private findBodyTypeRules(bodyType?: string | null, occasion?: string | null): BodyTypeRule[] {
    if (!bodyType) {
      return [];
    }
    let rules = this.bodyTypeRules.filter((r) => r.body_type === bodyType);
    if (occasion) {
      const occasionMatch = rules.filter((r) => r.occasion === occasion);
      if (occasionMatch.length > 0) {
        rules = occasionMatch;
      }
    }
    return rules;
  }

  private findColorSeasonRules(
    colorSeason?: string | null,
    occasion?: string | null
  ): ColorSeasonRule[] {
    if (!colorSeason) {
      return [];
    }
    let rules = this.colorSeasonRules.filter((r) => r.color_season === colorSeason);
    if (occasion) {
      const occasionMatch = rules.filter((r) => r.occasion === occasion);
      if (occasionMatch.length > 0) {
        rules = occasionMatch;
      }
    }
    return rules;
  }

  private findOccasionRules(occasion?: string | null): ChineseOccasionRule | null {
    if (!occasion) {
      return null;
    }
    const occasionMap: Record<string, string> = {
      interview: "annual_party",
      date: "date",
      travel: "travel",
      work: "work",
      daily: "daily",
      party: "annual_party",
      campus: "campus",
    };
    const mappedId = occasionMap[occasion] || occasion;
    const rule = this.chineseOccasionRules.find(
      (r) => r.id === mappedId || r.nameEn?.toLowerCase() === occasion.toLowerCase()
    );
    return rule || null;
  }

  private scoreByBodyTypeRules(
    item: {
      name: string;
      category: string;
      colors: string[];
      tags: string[];
      attributes?: Record<string, unknown> | null;
    },
    rules: BodyTypeRule[]
  ): { scoreDelta: number; matched: string[]; avoided: string[] } {
    let scoreDelta = 0;
    const matched: string[] = [];
    const avoided: string[] = [];

    for (const rule of rules) {
      const recommendedItems = Object.values(rule.recommended).flat();
      const nameLower = item.name.toLowerCase();
      const tagsLower = item.tags.map((t) => t.toLowerCase());

      for (const rec of recommendedItems) {
        if (
          typeof rec === "string" &&
          (nameLower.includes(rec.toLowerCase()) ||
            tagsLower.some((t) => t.includes(rec.toLowerCase())))
        ) {
          scoreDelta += 10;
          matched.push(`bodyType_recommend:${rec}`);
        }
      }

      for (const avoid of rule.avoid_items) {
        if (
          typeof avoid === "string" &&
          (nameLower.includes(avoid.toLowerCase()) ||
            tagsLower.some((t) => t.includes(avoid.toLowerCase())))
        ) {
          scoreDelta -= 15;
          avoided.push(`bodyType_avoid:${avoid}`);
        }
      }

      if (rule.recommended_colors.length > 0 && item.colors.length > 0) {
        const colorMatch = item.colors.some((c) =>
          rule.recommended_colors.some((rc) => this.colorsAreSimilar(c, rc))
        );
        if (colorMatch) {
          scoreDelta += 8;
          matched.push("bodyType_color_match");
        }
      }
    }

    return { scoreDelta, matched, avoided };
  }

  private scoreByColorSeasonRules(
    item: { colors: string[] },
    rules: ColorSeasonRule[]
  ): { scoreDelta: number; matched: string[] } {
    let scoreDelta = 0;
    const matched: string[] = [];

    for (const rule of rules) {
      if (item.colors.length === 0) {
        continue;
      }

      const bestColorMatch = item.colors.some((c) =>
        rule.best_colors.some((bc) => this.colorsAreSimilar(c, bc))
      );
      if (bestColorMatch) {
        scoreDelta += 12;
        matched.push("colorSeason_best_color");
      }

      const avoidColorMatch = item.colors.some((c) =>
        rule.avoid_colors.some((ac) => this.colorsAreSimilar(c, ac))
      );
      if (avoidColorMatch) {
        scoreDelta -= 10;
        matched.push("colorSeason_avoid_color");
      }
    }

    return { scoreDelta, matched };
  }

  private scoreByOccasionRules(
    item: { name: string; category: string; colors: string[]; tags: string[] },
    rule: ChineseOccasionRule
  ): { scoreDelta: number; matched: string[]; avoided: string[] } {
    let scoreDelta = 0;
    const matched: string[] = [];
    const avoided: string[] = [];

    const strategies = rule.strategies?.female || rule.strategies?.male;
    if (!strategies) {
      return { scoreDelta: 0, matched, avoided };
    }

    if (strategies.recommended_colors && item.colors.length > 0) {
      const colorMatch = item.colors.some((c) =>
        strategies.recommended_colors.some((rc) => this.colorsAreSimilar(c, rc))
      );
      if (colorMatch) {
        scoreDelta += 10;
        matched.push("occasion_color_match");
      }
    }

    if (strategies.avoid) {
      const nameLower = item.name.toLowerCase();
      const tagsLower = item.tags.map((t) => t.toLowerCase());
      for (const avoid of strategies.avoid) {
        if (
          typeof avoid === "string" &&
          (nameLower.includes(avoid.toLowerCase()) ||
            tagsLower.some((t) => t.includes(avoid.toLowerCase())))
        ) {
          scoreDelta -= 12;
          avoided.push(`occasion_avoid:${avoid}`);
        }
      }
    }

    return { scoreDelta, matched, avoided };
  }

  private scoreByStylePreference(
    item: { tags: string[]; name: string; category: string },
    stylePreferences: string[]
  ): number {
    let score = 0;
    const tagsLower = item.tags.map((t) => t.toLowerCase());
    const nameLower = item.name.toLowerCase();

    for (const pref of stylePreferences) {
      const prefLower = pref.toLowerCase();
      if (tagsLower.includes(prefLower) || nameLower.includes(prefLower)) {
        score += 8;
      }
    }

    return Math.min(score, 20);
  }

  private scoreBySeason(
    item: { attributes?: Record<string, unknown> | null; tags: string[] },
    season: string
  ): number {
    const attrs = item.attributes as Record<string, unknown> | null;
    if (attrs?.seasons && Array.isArray(attrs.seasons)) {
      if (attrs.seasons.includes(season) || attrs.seasons.includes("all_season")) {
        return 6;
      }
    }
    if (item.tags.some((t) => t.toLowerCase() === season.toLowerCase())) {
      return 4;
    }
    return 0;
  }

  private scoreByWeather(
    item: {
      material?: string | null;
      category: string;
      tags: string[];
      attributes?: Record<string, unknown> | null;
    },
    weather: string,
    occasion?: string | null
  ): number {
    let score = 0;

    const tempRange = this.weatherToTempRange(weather);
    if (tempRange) {
      const weatherRule = this.weatherOutfitRules.find(
        (r) => r.temp_range === tempRange && (!occasion || r.occasion === occasion)
      );
      if (weatherRule) {
        if (
          item.material &&
          weatherRule.recommended_materials.some((m) => item.material?.includes(m))
        ) {
          score += 8;
        }
        const categoryKey = this.mapCategoryToWeatherSlot(item.category);
        if (categoryKey && weatherRule.outfit_suggestion[categoryKey]) {
          score += 5;
        }
      }
    }

    return score;
  }

  private scoreByTrends(item: { colors: string[]; tags: string[] }): number {
    if (!this.trendRules.trending_colors || !Array.isArray(this.trendRules.trending_colors)) {
      return 0;
    }

    let score = 0;
    const trendingHexes: string[] = (
      this.trendRules.trending_colors as Array<Record<string, unknown>>
    ).map((c) => String(c.hex ?? ""));

    if (item.colors.length > 0) {
      const trendColorMatch = item.colors.some((c) =>
        trendingHexes.some((th) => this.colorsAreSimilar(c, th))
      );
      if (trendColorMatch) {
        score += 5;
      }
    }

    return score;
  }

  private colorsAreSimilar(color1: string, color2: string): boolean {
    const normalize = (c: string) => c.toLowerCase().replace(/[^a-z0-9#]/g, "");
    const c1 = normalize(color1);
    const c2 = normalize(color2);

    if (c1 === c2) {
      return true;
    }
    if (c1.startsWith("#") && c2.startsWith("#")) {
      return c1.slice(0, 4) === c2.slice(0, 4);
    }

    return false;
  }

  private weatherToTempRange(weather: string): string | null {
    const map: Record<string, string> = {
      freezing: "below_0",
      cold: "0_10",
      cool: "10_15",
      mild: "15_20",
      warm: "20_25",
      hot: "25_30",
      very_hot: "above_30",
    };
    return map[weather] || null;
  }

  private mapCategoryToWeatherSlot(category: string): string | null {
    const map: Record<string, string> = {
      tops: "inner",
      bottoms: "bottom",
      outerwear: "outer",
      footwear: "shoes",
      accessories: "accessories",
      dresses: "inner",
    };
    return map[category] || null;
  }

  getBodyTypeRules(): BodyTypeRule[] {
    return this.bodyTypeRules;
  }

  getColorSeasonRules(): ColorSeasonRule[] {
    return this.colorSeasonRules;
  }

  getOccasionRules(): ChineseOccasionRule[] {
    return this.chineseOccasionRules;
  }

  getFabricRules(): FabricRule[] {
    return this.fabricRules;
  }

  getItemCompatibilityRules(): ItemCompatibilityRule[] {
    return this.itemCompatibilityRules;
  }

  getWeatherOutfitRules(): WeatherOutfitRule[] {
    return this.weatherOutfitRules;
  }

  getTrendRules(): Record<string, unknown> {
    return this.trendRules;
  }

  /**
   * Produce degraded recommendations when the AI pipeline is unavailable.
   * Uses weather + season + scene templates to generate hardcoded outfit suggestions.
   * Template system covers 4 seasons x 3 occasions = 12 minimum combinations.
   * Returns pre-built recommendations with explanations.
   */
  async getDegradedRecommendations(params: {
    season?: string;
    occasion?: string;
    weather?: string;
    limit?: number;
  }): Promise<
    Array<{
      itemId: string;
      score: number;
      reason: string;
      strategy: string;
      explanation: { why: string; alternative: string; nextAction: string; confidence: number };
    }>
  > {
    const limit = params.limit || 10;
    const season = params.season || "spring";
    const occasion = params.occasion || "daily";

    // Outfit templates: season x occasion -> named outfit pieces with category + tag hints
    const outfitTemplates: Record<
      string,
      Record<string, Array<{ name: string; category: string; tags: string[] }>>
    > = {
      spring: {
        daily: [
          { name: "薄款针织衫", category: "tops", tags: ["针织", "休闲"] },
          { name: "高腰直筒牛仔裤", category: "bottoms", tags: ["牛仔裤", "高腰"] },
          { name: "乐福鞋", category: "footwear", tags: ["乐福鞋", "休闲"] },
          { name: "链条包", category: "accessories", tags: ["链条包", "百搭"] },
        ],
        interview: [
          { name: "白色衬衫", category: "tops", tags: ["衬衫", "通勤", "白色"] },
          { name: "西装阔腿裤", category: "bottoms", tags: ["西装裤", "通勤", "高腰"] },
          { name: "尖头高跟鞋", category: "footwear", tags: ["高跟鞋", "通勤"] },
          { name: "极简手表", category: "accessories", tags: ["手表", "极简"] },
        ],
        date: [
          { name: "法式方领衬衫", category: "tops", tags: ["法式", "方领", "泡泡袖"] },
          { name: "百褶中长裙", category: "bottoms", tags: ["百褶裙", "优雅"] },
          { name: "穆勒鞋", category: "footwear", tags: ["穆勒鞋", "春夏"] },
          { name: "丝巾", category: "accessories", tags: ["丝巾", "优雅"] },
        ],
      },
      summer: {
        daily: [
          { name: "短袖T恤", category: "tops", tags: ["短袖", "休闲"] },
          { name: "短裤", category: "bottoms", tags: ["短裤", "休闲", "夏日"] },
          { name: "帆布鞋", category: "footwear", tags: ["运动鞋", "休闲"] },
          { name: "墨镜", category: "accessories", tags: ["墨镜", "夏日"] },
        ],
        interview: [
          { name: "真丝衬衫", category: "tops", tags: ["真丝", "通勤", "V领"] },
          { name: "西装九分裤", category: "bottoms", tags: ["西装裤", "通勤"] },
          { name: "尖头高跟鞋", category: "footwear", tags: ["高跟鞋", "通勤"] },
          { name: "链条包", category: "accessories", tags: ["链条包", "通勤"] },
        ],
        date: [
          { name: "碎花连衣裙", category: "dresses", tags: ["碎花", "雪纺", "约会"] },
          { name: "穆勒鞋", category: "footwear", tags: ["穆勒鞋", "春夏"] },
          { name: "珍珠耳环", category: "accessories", tags: ["耳环", "珍珠"] },
        ],
      },
      autumn: {
        daily: [
          { name: "条纹长袖T恤", category: "tops", tags: ["条纹", "休闲", "长袖"] },
          { name: "工装裤", category: "bottoms", tags: ["工装裤", "休闲"] },
          { name: "运动鞋", category: "footwear", tags: ["运动鞋", "休闲"] },
          { name: "针织开衫", category: "outerwear", tags: ["针织开衫", "春秋"] },
        ],
        interview: [
          { name: "修身西装外套", category: "outerwear", tags: ["西装", "职场", "修身"] },
          { name: "白色衬衫", category: "tops", tags: ["衬衫", "通勤", "白色"] },
          { name: "羊毛西裤", category: "bottoms", tags: ["西裤", "商务"] },
          { name: "乐福鞋", category: "footwear", tags: ["乐福鞋", "通勤"] },
        ],
        date: [
          { name: "针织裙", category: "dresses", tags: ["针织裙", "极简", "约会"] },
          { name: "风衣", category: "outerwear", tags: ["风衣", "英伦"] },
          { name: "短靴", category: "footwear", tags: ["短靴", "秋冬"] },
          { name: "丝巾", category: "accessories", tags: ["丝巾", "优雅"] },
        ],
      },
      winter: {
        daily: [
          { name: "高领羊绒毛衣", category: "tops", tags: ["羊绒", "高领", "保暖"] },
          { name: "弹力修身裤", category: "bottoms", tags: ["修身", "显瘦"] },
          { name: "羽绒服", category: "outerwear", tags: ["羽绒服", "保暖"] },
          { name: "短靴", category: "footwear", tags: ["短靴", "秋冬"] },
        ],
        interview: [
          { name: "深色西装外套", category: "outerwear", tags: ["西装", "职场"] },
          { name: "白色衬衫", category: "tops", tags: ["衬衫", "通勤", "白色"] },
          { name: "黑色西裤", category: "bottoms", tags: ["西裤", "商务"] },
          { name: "牛津鞋", category: "footwear", tags: ["乐福鞋", "通勤"] },
        ],
        date: [
          { name: "小黑裙", category: "dresses", tags: ["小黑裙", "经典", "约会"] },
          { name: "羊毛大衣", category: "outerwear", tags: ["羊毛大衣", "秋冬"] },
          { name: "高跟鞋", category: "footwear", tags: ["高跟鞋", "优雅"] },
          { name: "珍珠耳环", category: "accessories", tags: ["耳环", "珍珠"] },
        ],
      },
    };

    // Look up the template for this season x occasion
    const seasonTemplates = outfitTemplates[season] ?? outfitTemplates["spring"] ?? {};
    const template = seasonTemplates[occasion] ?? seasonTemplates["daily"] ?? [];

    // Try to find real items matching each template slot
    const results: Array<{
      itemId: string;
      score: number;
      reason: string;
      strategy: string;
      explanation: { why: string; alternative: string; nextAction: string; confidence: number };
    }> = [];

    for (const slot of template) {
      const item = await this.prismaService.clothingItem.findFirst({
        where: {
          isActive: true,
          OR: [{ tags: { hasSome: slot.tags } }, { name: { contains: slot.name.slice(0, 3) } }],
        },
        orderBy: { viewCount: "desc" },
        select: { id: true },
      });

      if (item) {
        results.push({
          itemId: item.id,
          score: 65,
          reason: `经典${season}${occasion}搭配：${slot.name}`,
          strategy: "degraded",
          explanation: {
            why: `基于${season}季节${occasion}场景的搭配建议（AI 暂时不可用，使用经典模板）`,
            alternative: "可以浏览更多分类查看更多选择",
            nextAction: "查看详情",
            confidence: 0.5,
          },
        });
      }
    }

    // If template matching found items, return them
    if (results.length > 0) {
      // Fill remaining slots with popular items if under limit
      if (results.length < limit) {
        const existingIds = new Set(results.map((r) => r.itemId));
        const filler = await this.prismaService.clothingItem.findMany({
          where: { isActive: true, id: { notIn: [...existingIds] } },
          orderBy: { viewCount: "desc" },
          take: limit - results.length,
          select: { id: true },
        });
        for (const item of filler) {
          results.push({
            itemId: item.id,
            score: 55,
            reason: `热门推荐（${season}/${occasion}）`,
            strategy: "degraded",
            explanation: {
              why: `基于${season}季节${occasion}场景的搭配建议（AI 暂时不可用，使用经典模板）`,
              alternative: "可以浏览更多分类查看更多选择",
              nextAction: "查看详情",
              confidence: 0.45,
            },
          });
        }
      }
      return results.slice(0, limit);
    }

    // Fallback to all popular items if no template match found
    const fallbackItems = await this.prismaService.clothingItem.findMany({
      where: { isActive: true },
      orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
      take: limit,
      select: { id: true },
    });

    return fallbackItems.map((item, index) => ({
      itemId: item.id,
      score: 50 + (fallbackItems.length - index),
      reason: `热门推荐（${season}/${occasion}）`,
      strategy: "degraded",
      explanation: {
        why: `基于${season}季节${occasion}场景的搭配建议（AI 暂时不可用，使用经典模板）`,
        alternative: "可以浏览更多分类查看更多选择",
        nextAction: "查看详情",
        confidence: 0.4,
      },
    }));
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmProviderService } from "../../ai-stylist/llm-provider.service";

export interface RecommendationContext {
  userId: string;
  itemId: string;
  score: number;
  reasons: RecommendationReason[];
  userPreferences?: UserPreferenceSummary;
  itemAttributes?: ItemAttributeSummary;
  matchingFactors: MatchingFactor[];
}

export interface RecommendationReason {
  type:
    | "style_match"
    | "body_match"
    | "color_match"
    | "occasion_match"
    | "trending"
    | "similar_users"
    | "complementary"
    | "budget_friendly";
  weight: number;
  description: string;
  details?: string;
}

export interface UserPreferenceSummary {
  preferredStyles: string[];
  preferredColors: string[];
  bodyType?: string;
  skinTone?: string;
  colorSeason?: string;
  budgetRange?: { min: number; max: number };
}

export interface ItemAttributeSummary {
  category: string;
  style: string[];
  colors: string[];
  occasions: string[];
  price: number;
  brand?: string;
}

export interface MatchingFactor {
  factor: string;
  userValue: string;
  itemValue: string;
  matchScore: number;
  explanation: string;
}

export interface GeneratedExplanation {
  summary: string;
  detailedReasons: string[];
  styleTips: string[];
  confidence: number;
}

const EXPLANATION_TEMPLATES = {
  style_match: {
    high: "这款单品完美契合你喜欢的{style}风格",
    medium: "这款单品的{style}风格与你的偏好比较匹配",
    low: "这款单品带有一些{style}元素",
  },
  body_match: {
    high: "非常适合{bodyType}体型的穿搭",
    medium: "对{bodyType}体型比较友好",
    low: "可以考虑尝试的款式",
  },
  color_match: {
    high: "{color}非常适合你的{colorSeason}色彩季型",
    medium: "{color}与你的肤色搭配和谐",
    low: "{color}可以尝试的新色系",
  },
  occasion_match: {
    high: "完美适配{occasion}场合",
    medium: "适合{occasion}场景穿着",
    low: "可以在{occasion}场合尝试",
  },
  trending: {
    high: "当前热门单品，广受好评",
    medium: "近期人气较高的款式",
    low: "正在获得关注的单品",
  },
  similar_users: {
    high: "与你风格相似的用户都喜爱这款",
    medium: "相似用户也购买过这款单品",
    low: "部分相似用户喜欢这款",
  },
  complementary: {
    high: "与你已购单品完美搭配",
    medium: "可以与你衣橱中的单品搭配",
    low: "可以尝试的新搭配方向",
  },
  budget_friendly: {
    high: "性价比极高的选择",
    medium: "价格在你的预算范围内",
    low: "略高于日常预算但值得投资",
  },
};

const STYLE_TIPS: Record<string, string[]> = {
  tops: [
    "可以搭配高腰裤拉长腿部线条",
    "选择合身版型更显精神",
    "深色上衣显瘦效果更好",
  ],
  bottoms: ["高腰设计可以优化身材比例", "直筒版型百搭不挑人", "深色裤装更显瘦"],
  dresses: ["系带设计可以突出腰线", "A字裙摆遮肉显瘦", "V领设计拉长颈部线条"],
  outerwear: ["短款外套显高显腿长", "敞开穿更有层次感", "选择肩线合身的版型"],
  footwear: ["尖头鞋更显腿长", "裸色鞋款延伸腿部线条", "粗跟设计舒适又时尚"],
  accessories: [
    "简约配饰更显高级感",
    "金属色配饰提升整体质感",
    "选择与服装呼应的色系",
  ],
};

const BODY_TYPE_TIPS: Record<string, Record<string, string[]>> = {
  rectangle: {
    tops: ["选择有腰线的款式创造曲线感", "层叠穿搭增加层次感"],
    bottoms: ["高腰设计优化比例", "A字裙摆增加下半身量感"],
    dresses: ["系带款式突出腰线", "选择有层次感的设计"],
  },
  triangle: {
    tops: ["上身选择亮色或有图案的款式", "增加肩部细节平衡比例"],
    bottoms: ["A字裙非常适合你的体型", "深色下装更显瘦"],
    dresses: ["A字连衣裙是最佳选择", "上身有细节设计的款式"],
  },
  inverted_triangle: {
    tops: ["V领或圆领平衡肩宽", "简洁的上衣设计"],
    bottoms: ["阔腿裤平衡上半身", "有图案的下装增加量感"],
    dresses: ["V领设计平衡肩线", "下摆有量感的款式"],
  },
  hourglass: {
    tops: ["突出腰线的款式最适合", "合身剪裁比宽松款更好"],
    bottoms: ["高腰设计强调优势", "包臀款式展现曲线"],
    dresses: ["收腰设计展现身材", "合身的剪裁更显优雅"],
  },
  oval: {
    tops: ["V领设计拉长视觉效果", "选择有垂感的面料"],
    bottoms: ["直筒或微喇款式", "深色更显瘦"],
    dresses: ["V领或开领设计", "垂直条纹拉长身形"],
  },
};

@Injectable()
export class RecommendationExplainerService {
  private readonly logger = new Logger(RecommendationExplainerService.name);
  private readonly useLLM: boolean;

  constructor(
    private configService: ConfigService,
    private llmProviderService: LlmProviderService,
  ) {
    this.useLLM =
      this.configService.get<string>("ENABLE_LLM_EXPLANATIONS", "true") ===
      "true";
  }

  async generateExplanation(
    context: RecommendationContext,
  ): Promise<GeneratedExplanation> {
    if (this.useLLM && context.score > 0.5) {
      try {
        return await this.generateLLMExplanation(context);
      } catch (error) {
        this.logger.debug(`LLM explanation failed, falling back to template: ${error}`);
      }
    }
    return this.generateTemplateExplanation(context);
  }

  private async generateLLMExplanation(
    context: RecommendationContext,
  ): Promise<GeneratedExplanation> {
    const prompt = this.buildExplanationPrompt(context);

    const response = await this.llmProviderService.chat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 400,
      temperature: 0.3,
    });

    return this.parseLLMResponse(response.content, context);
  }

  async explain(
    userId: string,
    itemId: string,
  ): Promise<{
    reasons: string[];
    factors: Array<{ name: string; contribution: number }>;
    similarItems: string[];
  }> {
    // Generate a basic explanation - in a real implementation, this would
    // fetch user preferences and item attributes from the database
    const context: RecommendationContext = {
      userId,
      itemId,
      score: 0.8,
      reasons: [
        { type: "style_match", weight: 0.8, description: "Matches your style preferences" },
        { type: "color_match", weight: 0.6, description: "Color suits your profile" },
      ],
      matchingFactors: [
        { factor: "style", userValue: "casual", itemValue: "casual", matchScore: 0.85, explanation: "Style match" },
      ],
    };

    const explanation = await this.generateExplanation(context);

    return {
      reasons: [explanation.summary, ...explanation.detailedReasons],
      factors: context.reasons.map((r) => ({
        name: r.type,
        contribution: r.weight,
      })),
      similarItems: [],
    };
  }

  private buildExplanationPrompt(context: RecommendationContext): string {
    const { userPreferences, itemAttributes, matchingFactors, score } = context;

    return `你是一位专业的时尚顾问，请为用户解释为什么推荐这款单品。

用户画像：
- 喜欢的风格：${userPreferences?.preferredStyles?.join("、") || "未知"}
- 偏好颜色：${userPreferences?.preferredColors?.join("、") || "未知"}
- 体型：${userPreferences?.bodyType || "未知"}
- 肤色：${userPreferences?.skinTone || "未知"}
- 色彩季型：${userPreferences?.colorSeason || "未知"}

推荐单品：
- 类别：${itemAttributes?.category || "未知"}
- 风格：${itemAttributes?.style?.join("、") || "未知"}
- 颜色：${itemAttributes?.colors?.join("、") || "未知"}
- 适用场合：${itemAttributes?.occasions?.join("、") || "未知"}
- 价格：¥${itemAttributes?.price || "未知"}

匹配因素：
${matchingFactors.map((f) => `- ${f.factor}: 用户${f.userValue} ↔ 单品${f.itemValue} (匹配度${Math.round(f.matchScore * 100)}%)`).join("\n")}

推荐评分：${Math.round(score * 100)}%

请生成：
1. 一句简洁的推荐理由（不超过30字）
2. 2-3个详细理由说明
3. 1-2条穿搭建议

以JSON格式返回：
{
  "summary": "简洁推荐理由",
  "detailedReasons": ["理由1", "理由2"],
  "styleTips": ["建议1", "建议2"]
}`;
  }

  private parseLLMResponse(
    response: string,
    context: RecommendationContext,
  ): GeneratedExplanation {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || this.generateSummary(context),
          detailedReasons: parsed.detailedReasons || [],
          styleTips: parsed.styleTips || [],
          confidence: context.score,
        };
      }
    } catch (e) {
      this.logger.debug(`Failed to parse LLM response: ${e}`);
    }

    return this.generateTemplateExplanation(context);
  }

  private generateTemplateExplanation(
    context: RecommendationContext,
  ): GeneratedExplanation {
    const { reasons, itemAttributes, userPreferences, matchingFactors } =
      context;

    const summary = this.generateSummary(context);

    const detailedReasons = this.generateDetailedReasons(
      reasons,
      itemAttributes,
      userPreferences,
    );

    const styleTips = this.generateStyleTips(itemAttributes, userPreferences);

    const confidence = this.calculateConfidence(reasons, matchingFactors);

    return {
      summary,
      detailedReasons,
      styleTips,
      confidence,
    };
  }

  private generateSummary(context: RecommendationContext): string {
    const { reasons, score } = context;

    if (reasons.length === 0) {
      return "为你精选的推荐单品";
    }

    const [topReason] = [...reasons].sort((a, b) => b.weight - a.weight);
    if (!topReason) {
      return "为你精选的推荐单品";
    }

    if (score > 0.8) {
      return `完美匹配你的风格偏好，${topReason.description}`;
    } else if (score > 0.6) {
      return `很适合你的穿搭风格，${topReason.description}`;
    } else {
      return `值得尝试的新风格，${topReason.description}`;
    }
  }

  private generateDetailedReasons(
    reasons: RecommendationReason[],
    itemAttributes?: ItemAttributeSummary,
    userPreferences?: UserPreferenceSummary,
  ): string[] {
    const detailedReasons: string[] = [];

    const sortedReasons = [...reasons]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);

    for (const reason of sortedReasons) {
      const template = this.getTemplate(reason.type, reason.weight);
      const filled = this.fillTemplate(template, {
        style: itemAttributes?.style?.[0] || "",
        bodyType: userPreferences?.bodyType || "",
        color: itemAttributes?.colors?.[0] || "",
        colorSeason: userPreferences?.colorSeason || "",
        occasion: itemAttributes?.occasions?.[0] || "",
      });
      detailedReasons.push(filled);
    }

    return detailedReasons;
  }

  private generateStyleTips(
    itemAttributes?: ItemAttributeSummary,
    userPreferences?: UserPreferenceSummary,
  ): string[] {
    const tips: string[] = [];

    if (!itemAttributes?.category) {return tips;}

    const category = this.normalizeCategory(itemAttributes.category);

    const generalTips = STYLE_TIPS[category];
    if (generalTips && generalTips.length > 0) {
      const generalTip =
        generalTips[Math.floor(Math.random() * generalTips.length)];
      if (generalTip) {
        tips.push(generalTip);
      }
    }

    if (userPreferences?.bodyType) {
      const bodyTips = BODY_TYPE_TIPS[userPreferences.bodyType]?.[category];
      if (bodyTips && bodyTips.length > 0) {
        const bodyTip = bodyTips[Math.floor(Math.random() * bodyTips.length)];
        if (bodyTip) {
          tips.push(bodyTip);
        }
      }
    }

    return tips.slice(0, 2);
  }

  private calculateConfidence(
    reasons: RecommendationReason[],
    matchingFactors: MatchingFactor[],
  ): number {
    if (reasons.length === 0) {return 0.5;}

    const totalWeight = reasons.reduce((sum, r) => sum + r.weight, 0);
    const avgMatchScore =
      matchingFactors.length > 0
        ? matchingFactors.reduce((sum, f) => sum + f.matchScore, 0) /
          matchingFactors.length
        : 0.5;

    return Math.min(1, (totalWeight / reasons.length + avgMatchScore) / 2);
  }

  private getTemplate(
    type: RecommendationReason["type"],
    weight: number,
  ): string {
    const templates = EXPLANATION_TEMPLATES[type];
    if (weight > 0.7) {return templates.high;}
    if (weight > 0.4) {return templates.medium;}
    return templates.low;
  }

  private fillTemplate(
    template: string,
    values: Record<string, string>,
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  private normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      shirt: "tops",
      tshirt: "tops",
      "t-shirt": "tops",
      blouse: "tops",
      sweater: "tops",
      pants: "bottoms",
      jeans: "bottoms",
      trousers: "bottoms",
      shorts: "bottoms",
      skirt: "bottoms",
      dress: "dresses",
      gown: "dresses",
      jacket: "outerwear",
      coat: "outerwear",
      blazer: "outerwear",
      shoes: "footwear",
      sneakers: "footwear",
      boots: "footwear",
      heels: "footwear",
      bag: "accessories",
      watch: "accessories",
      jewelry: "accessories",
    };

    const normalized = category.toLowerCase();
    return categoryMap[normalized] || normalized;
  }

  generateBatchExplanations(
    contexts: RecommendationContext[],
  ): Promise<GeneratedExplanation>[] {
    return contexts.map((ctx) => this.generateExplanation(ctx));
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClothingCategory } from "../../../types/prisma-enums";

import {
  type DecisionNodeType,
  type DecisionNode,
  type DecisionOption,
  type DecisionOptionContent,
  type DecisionTree,
  type UserProfile,
  type DecisionContext,
  type LlmChatCompletionResponse,
} from "./types";

import { DecisionScoreService } from "./decision-score.service";

const DECISION_NODE_TYPES: DecisionNodeType[] = ["style", "top", "bottom", "color", "fit"];

const STYLE_OPTIONS = [
  { id: "minimalist", label: "极简", description: "简洁利落，less is more" },
  { id: "korean", label: "韩系", description: "温柔清新，层次感搭配" },
  { id: "french", label: "法式", description: "优雅慵懒，随性高级" },
  { id: "japanese", label: "日系", description: "文艺舒适，自然质感" },
  { id: "smart_casual", label: "轻正式", description: "得体大方，职场通勤" },
  { id: "streetwear", label: "街头", description: "潮流个性，大胆混搭" },
  { id: "sporty", label: "运动", description: "活力舒适，机能风" },
  { id: "vintage", label: "复古", description: "怀旧经典，独特韵味" },
];

const TOP_OPTIONS = [
  { id: "fitted", label: "修身", fitTypes: ["hourglass", "rectangle"] },
  { id: "regular", label: "合身", fitTypes: ["rectangle", "triangle"] },
  { id: "loose", label: "宽松", fitTypes: ["inverted_triangle", "oval"] },
  { id: "oversized", label: "廓形", fitTypes: ["rectangle", "hourglass"] },
];

const BOTTOM_OPTIONS = [
  { id: "slim", label: "修身裤", fitTypes: ["hourglass", "rectangle"] },
  { id: "straight", label: "直筒裤", fitTypes: ["triangle", "rectangle"] },
  { id: "wide", label: "阔腿裤", fitTypes: ["triangle", "oval"] },
  { id: "skirt_a", label: "A字裙", fitTypes: ["triangle", "hourglass"] },
];

const FIT_GOAL_OPTIONS = [
  { id: "taller", label: "显高", bodyTypes: ["rectangle", "oval"] },
  { id: "slimmer", label: "显瘦", bodyTypes: ["oval", "rectangle"] },
  { id: "hip_balance", label: "修饰胯部", bodyTypes: ["triangle"] },
  { id: "shoulder_balance", label: "平衡肩线", bodyTypes: ["inverted_triangle"] },
  { id: "professional", label: "利落专业", bodyTypes: ["rectangle", "hourglass"] },
  { id: "youthful", label: "减龄", bodyTypes: ["rectangle", "oval"] },
  { id: "radiant", label: "提气色", bodyTypes: [] },
];

const COLOR_SEASON_MAP: Record<string, string[]> = {
  spring: ["珊瑚粉", "暖杏", "奶油白", "薄荷绿", "天蓝"],
  summer: ["雾霾蓝", "薰衣草紫", "玫瑰粉", "浅灰", "米白"],
  autumn: ["驼色", "砖红", "橄榄绿", "焦糖", "卡其"],
  winter: ["正红", "宝蓝", "纯白", "黑色", "深紫"],
};

const BODY_TYPE_STYLE_MAP: Record<string, string[]> = {
  hourglass: ["french", "minimalist", "smart_casual"],
  rectangle: ["korean", "japanese", "streetwear"],
  triangle: ["french", "minimalist", "smart_casual"],
  inverted_triangle: ["streetwear", "sporty", "vintage"],
  oval: ["smart_casual", "minimalist", "japanese"],
};

@Injectable()
export class DecisionStrategyService {
  private readonly logger = new Logger(DecisionStrategyService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;

  constructor(
    private configService: ConfigService,
    private scoreService: DecisionScoreService
  ) {
    this.apiKey =
      this.configService.get<string>("AI_STYLIST_API_KEY", "") ||
      this.configService.get<string>("GLM_API_KEY", "") ||
      this.configService.get<string>("OPENAI_API_KEY", "");
    this.apiEndpoint =
      this.configService.get<string>("AI_STYLIST_API_ENDPOINT", "") ||
      this.configService.get<string>("GLM_API_ENDPOINT", "") ||
      this.configService.get<string>("OPENAI_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4");
    this.model =
      this.configService.get<string>("AI_STYLIST_MODEL", "") ||
      this.configService.get<string>("GLM_MODEL", "") ||
      this.configService.get<string>("OPENAI_MODEL", "glm-5");
  }

  determineRootNodeType(context: DecisionContext, userProfile: UserProfile): DecisionNodeType {
    if (context.preferredStyles.length > 0 || userProfile.stylePreferences.length > 0) {
      if (context.fitGoals.length > 0) {
        return "top";
      }
      return "color";
    }
    return "style";
  }

  getNextNodeType(currentNodeType: DecisionNodeType, tree: DecisionTree): DecisionNodeType | null {
    const decisionTypes = tree.decisions.map((d) => d.nodeType);
    const currentIndex = DECISION_NODE_TYPES.indexOf(currentNodeType);

    if (decisionTypes.length >= 4) {
      return null;
    }

    for (let i = currentIndex + 1; i < DECISION_NODE_TYPES.length; i++) {
      const nodeType = DECISION_NODE_TYPES[i];
      if (nodeType && !decisionTypes.includes(nodeType)) {
        return nodeType;
      }
    }

    for (let i = 0; i < currentIndex; i++) {
      const nodeType = DECISION_NODE_TYPES[i];
      if (nodeType && !decisionTypes.includes(nodeType)) {
        return nodeType;
      }
    }

    return null;
  }

  buildContextFromDecisions(tree: DecisionTree): DecisionContext {
    const context: DecisionContext = {
      preferredStyles: [],
      styleAvoidances: [],
      fitGoals: [],
      preferredColors: [],
    };

    for (const decision of tree.decisions) {
      const node = tree.nodes.get(decision.nodeId);
      if (!node) {
        continue;
      }

      const chosenOption = node.options.find((o) => o.optionId === decision.chosenOptionId);
      if (!chosenOption) {
        continue;
      }

      switch (node.nodeType) {
        case "style":
          if (chosenOption.content.styleTags) {
            context.preferredStyles.push(...chosenOption.content.styleTags);
          }
          break;
        case "color":
          if (chosenOption.content.colorTags) {
            context.preferredColors.push(...chosenOption.content.colorTags);
          }
          break;
        case "fit":
          if (chosenOption.content.fitAttributes) {
            context.fitGoals.push(...chosenOption.content.fitAttributes);
          }
          break;
      }

      for (const rejectedId of decision.rejectedOptionIds) {
        const rejectedOption = node.options.find((o) => o.optionId === rejectedId);
        if (rejectedOption?.content.styleTags && node.nodeType === "style") {
          context.styleAvoidances.push(...rejectedOption.content.styleTags);
        }
      }
    }

    return context;
  }

  async generateNodeOptions(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile
  ): Promise<DecisionOption[]> {
    let baseOptions: Array<{
      id: string;
      label: string;
      description?: string;
      fitTypes?: string[];
    }>;

    switch (nodeType) {
      case "style":
        baseOptions = this.filterStyleOptions(userProfile);
        break;
      case "top":
        baseOptions = this.filterTopOptions(userProfile);
        break;
      case "bottom":
        baseOptions = this.filterBottomOptions(userProfile);
        break;
      case "color":
        baseOptions = this.generateColorOptions(userProfile);
        break;
      case "fit":
        baseOptions = this.filterFitGoalOptions(userProfile);
        break;
      default:
        baseOptions = STYLE_OPTIONS;
    }

    const scoredOptions = baseOptions.map((opt) => {
      const scores = this.scoreService.calculateOptionScores(opt, nodeType, context, userProfile);
      return {
        optionId: opt.id,
        content: this.buildOptionContent(opt, nodeType),
        displayName: opt.label,
        description: opt.description,
        fitScore: scores.fitScore,
        styleScore: scores.styleScore,
        preferenceScore: scores.preferenceScore,
        compositeScore: this.scoreService.calculateCompositeScore(scores),
      };
    });

    return scoredOptions.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 4);
  }

  async generateNodeReasoning(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    options: DecisionOption[]
  ): Promise<string> {
    const fallbackReasoning = this.buildFallbackReasoning(nodeType, context, userProfile, options);

    if (!this.apiKey || !this.apiEndpoint || !this.model) {
      return fallbackReasoning;
    }

    try {
      const prompt = this.buildReasoningPrompt(nodeType, context, userProfile, options);
      const response = await this.callLLM([
        {
          role: "system",
          content:
            "你是一个专业的穿搭顾问。请用简洁的中文解释为什么推荐这些选项，控制在100字以内。",
        },
        {
          role: "user",
          content: prompt,
        },
      ]);

      const content = response.choices[0]?.message?.content?.trim();
      return content || fallbackReasoning;
    } catch (error) {
      this.logger.warn(`Failed to generate LLM reasoning: ${error}`);
      return fallbackReasoning;
    }
  }

  private filterStyleOptions(userProfile: UserProfile): typeof STYLE_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";
    const recommendedStyles = BODY_TYPE_STYLE_MAP[bodyType] || [];

    const prioritized = [...STYLE_OPTIONS].sort((a, b) => {
      const aRecommended = recommendedStyles.includes(a.id);
      const bRecommended = recommendedStyles.includes(b.id);
      if (aRecommended && !bRecommended) {
        return -1;
      }
      if (!aRecommended && bRecommended) {
        return 1;
      }
      return 0;
    });

    return prioritized;
  }

  private filterTopOptions(userProfile: UserProfile): typeof TOP_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";

    return TOP_OPTIONS.filter((opt) => {
      if (!opt.fitTypes) {
        return true;
      }
      return opt.fitTypes.includes(bodyType);
    });
  }

  private filterBottomOptions(userProfile: UserProfile): typeof BOTTOM_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";

    return BOTTOM_OPTIONS.filter((opt) => {
      if (!opt.fitTypes) {
        return true;
      }
      return opt.fitTypes.includes(bodyType);
    });
  }

  private generateColorOptions(
    userProfile: UserProfile
  ): Array<{ id: string; label: string; description?: string }> {
    const colorSeason = userProfile.colorSeason?.toLowerCase() || "autumn";
    const recommendedColors = COLOR_SEASON_MAP[colorSeason] ?? COLOR_SEASON_MAP.autumn ?? [];

    const neutrals = ["黑色", "白色", "灰色", "藏青"];
    const allColors = [...new Set([...recommendedColors.slice(0, 3), ...neutrals.slice(0, 2)])];

    return allColors.map((color, index) => ({
      id: `color_${index}`,
      label: color,
      description: index < 3 ? "推荐色" : "百搭色",
    }));
  }

  private filterFitGoalOptions(userProfile: UserProfile): typeof FIT_GOAL_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";

    return FIT_GOAL_OPTIONS.filter((opt) => {
      if (opt.bodyTypes.length === 0) {
        return true;
      }
      return opt.bodyTypes.includes(bodyType);
    });
  }

  private buildOptionContent(
    opt: { id: string; label: string; fitTypes?: string[] },
    nodeType: DecisionNodeType
  ): DecisionOptionContent {
    const content: DecisionOptionContent = {};

    switch (nodeType) {
      case "style":
        content.styleTags = [opt.label];
        break;
      case "top":
        content.category = ClothingCategory.tops;
        content.fitAttributes = [opt.id];
        break;
      case "bottom":
        content.category = ClothingCategory.bottoms;
        content.fitAttributes = [opt.id];
        break;
      case "color":
        content.colorTags = [opt.label];
        break;
      case "fit":
        content.fitAttributes = [opt.id];
        break;
    }

    return content;
  }

  private buildFallbackReasoning(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    options: DecisionOption[]
  ): string {
    const topOption = options[0];
    if (!topOption) {
      return "已根据你的信息生成当前推荐。";
    }
    const reasons: string[] = [];

    if (nodeType === "style") {
      if (userProfile.bodyType) {
        reasons.push(`根据你的${this.getBodyTypeDisplayName(userProfile.bodyType)}体型`);
      }
      if (context.occasion) {
        reasons.push(`适合${this.getOccasionDisplayName(context.occasion)}场景`);
      }
      reasons.push(`推荐${topOption.displayName}风格`);
    } else if (nodeType === "color") {
      if (userProfile.colorSeason) {
        reasons.push(`基于你的${this.getColorSeasonDisplayName(userProfile.colorSeason)}型色彩`);
      }
      reasons.push(`${topOption.displayName}会很好看`);
    } else if (nodeType === "fit") {
      reasons.push(`${topOption.displayName}效果最适合你的需求`);
    } else {
      reasons.push(`根据你的体型和偏好，${topOption.displayName}是不错的选择`);
    }

    return reasons.join("，") + "。";
  }

  private buildReasoningPrompt(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    options: DecisionOption[]
  ): string {
    const topOptions = options
      .slice(0, 3)
      .map((o) => o.displayName)
      .join("、");

    return JSON.stringify(
      {
        nodeType,
        occasion: context.occasion,
        bodyType: userProfile.bodyType,
        colorSeason: userProfile.colorSeason,
        preferredStyle: [...context.preferredStyles, ...userProfile.stylePreferences][0],
        topOptions,
        task: "请简要解释为什么推荐这些选项",
      },
      null,
      2
    );
  }

  private async callLLM(
    messages: Array<{ role: string; content: string }>
  ): Promise<LlmChatCompletionResponse> {
    const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    return response.json() as Promise<LlmChatCompletionResponse>;
  }

  private getBodyTypeDisplayName(bodyType: string): string {
    const names: Record<string, string> = {
      hourglass: "X型",
      rectangle: "H型",
      triangle: "A型",
      inverted_triangle: "Y型",
      oval: "O型",
    };
    return names[bodyType.toLowerCase()] || bodyType;
  }

  private getOccasionDisplayName(occasion: string): string {
    const names: Record<string, string> = {
      interview: "面试",
      work: "通勤",
      date: "约会",
      travel: "出游",
      party: "聚会",
      daily: "日常",
      campus: "校园",
    };
    return names[occasion.toLowerCase()] || occasion;
  }

  private getColorSeasonDisplayName(season: string): string {
    const names: Record<string, string> = {
      spring: "春季",
      summer: "夏季",
      autumn: "秋季",
      winter: "冬季",
    };
    return names[season.toLowerCase()] || season;
  }
}

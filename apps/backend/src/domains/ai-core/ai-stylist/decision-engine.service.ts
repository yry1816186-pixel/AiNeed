/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClothingCategory } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { RedisService } from "../../../common/redis/redis.service";

// Import shared types
import {
  type DecisionNodeType,
  type DecisionNode,
  type DecisionOption,
  type DecisionOptionContent,
  type UserDecision,
  type SerializedDecision,
  type DecisionTree,
  type DecisionTreeStatus,
  type UserProfile,
  type BehaviorRecord,
  type DecisionContext,
  type CreateDecisionTreeInput,
  type RecordDecisionInput,
  type DecisionTreeResult,
  type LlmChatCompletionResponse,
} from "./types";

// Re-export types for backward compatibility
export type {
  DecisionNodeType,
  DecisionNode,
  DecisionOption,
  DecisionOptionContent,
  UserDecision,
  SerializedDecision,
  DecisionTree,
  DecisionTreeStatus,
  UserProfile,
  BehaviorRecord,
  DecisionContext,
  CreateDecisionTreeInput,
  RecordDecisionInput,
  DecisionTreeResult,
};

// ==================== Helper Functions ====================

/**
 * Type guard to check if a value is a string array.
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Safely extract string array from Prisma Json field.
 */
function extractStringArray(jsonValue: unknown): string[] {
  if (!jsonValue) {
    return [];
  }

  // If it's already a string array
  if (isStringArray(jsonValue)) {
    return jsonValue;
  }

  // If it's an array of objects with 'name' property
  if (Array.isArray(jsonValue)) {
    return jsonValue
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (typeof item === "object" && item !== null && "name" in item) {
          return (item as { name: string }).name;
        }
        return null;
      })
      .filter((item): item is string => item !== null);
  }

  return [];
}

// ==================== Constants ====================

const DECISION_NODE_TYPES: DecisionNodeType[] = [
  "style",
  "top",
  "bottom",
  "color",
  "fit",
];

const NODE_TYPE_QUESTIONS: Record<DecisionNodeType, string> = {
  style: "你更偏好哪种穿搭风格？",
  top: "你喜欢哪种上装版型？",
  bottom: "下装你更倾向于哪种？",
  color: "这些颜色哪个更吸引你？",
  fit: "你最想达到什么穿搭效果？",
};

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

// Color recommendations based on color season
const COLOR_SEASON_MAP: Record<string, string[]> = {
  spring: ["珊瑚粉", "暖杏", "奶油白", "薄荷绿", "天蓝"],
  summer: ["雾霾蓝", "薰衣草紫", "玫瑰粉", "浅灰", "米白"],
  autumn: ["驼色", "砖红", "橄榄绿", "焦糖", "卡其"],
  winter: ["正红", "宝蓝", "纯白", "黑色", "深紫"],
};

// Body type to style recommendations
const BODY_TYPE_STYLE_MAP: Record<string, string[]> = {
  hourglass: ["french", "minimalist", "smart_casual"],
  rectangle: ["korean", "japanese", "streetwear"],
  triangle: ["french", "minimalist", "smart_casual"],
  inverted_triangle: ["streetwear", "sporty", "vintage"],
  oval: ["smart_casual", "minimalist", "japanese"],
};

// ==================== Service Implementation ====================

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly model: string;
  private readonly treeTtlMs = 30 * 60 * 1000; // 30 minutes
  private readonly treeConfigPrefix = "decision_tree:";
  private readonly useRedis: boolean;

  // In-memory cache for active decision trees
  private readonly treeCache = new Map<string, DecisionTree>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {
    this.apiKey =
      this.configService.get<string>("AI_STYLIST_API_KEY", "") ||
      this.configService.get<string>("GLM_API_KEY", "") ||
      this.configService.get<string>("OPENAI_API_KEY", "");
    this.apiEndpoint =
      this.configService.get<string>("AI_STYLIST_API_ENDPOINT", "") ||
      this.configService.get<string>("GLM_API_ENDPOINT", "") ||
      this.configService.get<string>(
        "OPENAI_API_ENDPOINT",
        "https://open.bigmodel.cn/api/paas/v4",
      );
    this.model =
      this.configService.get<string>("AI_STYLIST_MODEL", "") ||
      this.configService.get<string>("GLM_MODEL", "") ||
      this.configService.get<string>("OPENAI_MODEL", "glm-5");
    this.useRedis = this.configService.get<string>("REDIS_URL") ? true : false;
  }

  // ==================== Decision Tree Construction ====================

  /**
   * Create a new decision tree based on user profile and context
   */
  async createDecisionTree(
    input: CreateDecisionTreeInput,
  ): Promise<DecisionTreeResult> {
    const { userId, sessionId, context, userProfile } = input;

    this.logger.log(`Creating decision tree for user ${userId}, session ${sessionId}`);

    // Build root node based on context and profile
    const rootNode = await this.buildRootNode(context, userProfile);

    // Create decision tree structure
    const tree: DecisionTree = {
      treeId: randomUUID(),
      sessionId,
      userId,
      rootNodeId: rootNode.nodeId,
      currentNodeId: rootNode.nodeId,
      nodes: new Map([[rootNode.nodeId, rootNode]]),
      decisions: [],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persist tree
    await this.persistTree(tree);

    return {
      success: true,
      tree,
      currentNode: rootNode,
      isComplete: false,
      message: "决策树创建成功",
    };
  }

  /**
   * Build the root decision node based on user context and profile
   */
  private async buildRootNode(
    context: DecisionContext,
    userProfile: UserProfile,
  ): Promise<DecisionNode> {
    // Determine the best starting node type
    const nodeType = this.determineRootNodeType(context, userProfile);

    // Generate options based on node type and user profile
    const options = await this.generateNodeOptions(nodeType, context, userProfile);

    // Generate LLM reasoning
    const llmReasoning = await this.generateNodeReasoning(nodeType, context, userProfile, options);

    const node: DecisionNode = {
      nodeId: randomUUID(),
      nodeType,
      question: NODE_TYPE_QUESTIONS[nodeType],
      options,
      llmReasoning,
      depth: 0,
    };

    return node;
  }

  /**
   * Determine the most appropriate root node type based on user state
   */
  private determineRootNodeType(
    context: DecisionContext,
    userProfile: UserProfile,
  ): DecisionNodeType {
    // If user already has style preferences, start with fit or color
    if (context.preferredStyles.length > 0 || userProfile.stylePreferences.length > 0) {
      // If fit goals are specified, start with fit
      if (context.fitGoals.length > 0) {
        return "top"; // Start with clothing selection
      }
      // Otherwise start with color
      return "color";
    }

    // Default: start with style selection
    return "style";
  }

  /**
   * Generate options for a decision node
   */
  private async generateNodeOptions(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
  ): Promise<DecisionOption[]> {
    let baseOptions: Array<{ id: string; label: string; description?: string; fitTypes?: string[] }>;

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

    // Score each option
    const scoredOptions = baseOptions.map((opt) => {
      const scores = this.calculateOptionScores(opt, nodeType, context, userProfile);
      return {
        optionId: opt.id,
        content: this.buildOptionContent(opt, nodeType),
        displayName: opt.label,
        description: opt.description,
        fitScore: scores.fitScore,
        styleScore: scores.styleScore,
        preferenceScore: scores.preferenceScore,
        compositeScore: this.calculateCompositeScore(scores),
      };
    });

    // Sort by composite score and return top options
    return scoredOptions
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 4);
  }

  /**
   * Filter style options based on user's body type and preferences
   */
  private filterStyleOptions(userProfile: UserProfile): typeof STYLE_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";
    const recommendedStyles = BODY_TYPE_STYLE_MAP[bodyType] || [];

    // Prioritize recommended styles
    const prioritized = [...STYLE_OPTIONS].sort((a, b) => {
      const aRecommended = recommendedStyles.includes(a.id);
      const bRecommended = recommendedStyles.includes(b.id);
      if (aRecommended && !bRecommended) {return -1;}
      if (!aRecommended && bRecommended) {return 1;}
      return 0;
    });

    return prioritized;
  }

  /**
   * Filter top options based on body type
   */
  private filterTopOptions(userProfile: UserProfile): typeof TOP_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";

    return TOP_OPTIONS.filter((opt) => {
      if (!opt.fitTypes) {return true;}
      return opt.fitTypes.includes(bodyType);
    });
  }

  /**
   * Filter bottom options based on body type
   */
  private filterBottomOptions(userProfile: UserProfile): typeof BOTTOM_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";

    return BOTTOM_OPTIONS.filter((opt) => {
      if (!opt.fitTypes) {return true;}
      return opt.fitTypes.includes(bodyType);
    });
  }

  /**
   * Generate color options based on user's color season
   */
  private generateColorOptions(userProfile: UserProfile): Array<{ id: string; label: string; description?: string }> {
    const colorSeason = userProfile.colorSeason?.toLowerCase() || "autumn";
    const recommendedColors =
      COLOR_SEASON_MAP[colorSeason] ?? COLOR_SEASON_MAP.autumn ?? [];

    // Add some neutral options
    const neutrals = ["黑色", "白色", "灰色", "藏青"];
    const allColors = [...new Set([...recommendedColors.slice(0, 3), ...neutrals.slice(0, 2)])];

    return allColors.map((color, index) => ({
      id: `color_${index}`,
      label: color,
      description: index < 3 ? "推荐色" : "百搭色",
    }));
  }

  /**
   * Filter fit goal options based on body type
   */
  private filterFitGoalOptions(userProfile: UserProfile): typeof FIT_GOAL_OPTIONS {
    const bodyType = userProfile.bodyType?.toLowerCase() || "rectangle";

    return FIT_GOAL_OPTIONS.filter((opt) => {
      if (opt.bodyTypes.length === 0) {return true;} // Universal options
      return opt.bodyTypes.includes(bodyType);
    });
  }

  /**
   * Build option content based on node type
   */
  private buildOptionContent(
    opt: { id: string; label: string; fitTypes?: string[] },
    nodeType: DecisionNodeType,
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

  // ==================== Option Scoring Algorithm ====================

  /**
   * Calculate all scores for an option
   */
  private calculateOptionScores(
    opt: { id: string; label: string; fitTypes?: string[] },
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
  ): { fitScore: number; styleScore: number; preferenceScore: number } {
    return {
      fitScore: this.calculateFitScore(opt, nodeType, userProfile),
      styleScore: this.calculateStyleScore(opt, nodeType, context, userProfile),
      preferenceScore: this.calculatePreferenceScore(opt, nodeType, userProfile),
    };
  }

  /**
   * Calculate fit score based on body type compatibility
   */
  private calculateFitScore(
    opt: { id: string; label: string; fitTypes?: string[] },
    nodeType: DecisionNodeType,
    userProfile: UserProfile,
  ): number {
    const bodyType = userProfile.bodyType?.toLowerCase();

    if (!bodyType) {return 50;} // Default score when no body type info

    // Check if option has fit type recommendations
    if (opt.fitTypes && opt.fitTypes.length > 0) {
      return opt.fitTypes.includes(bodyType) ? 85 : 40;
    }

    // Body type specific scoring
    const bodyTypeScores: Record<string, Record<string, number>> = {
      hourglass: {
        fitted: 90, regular: 75, loose: 60, oversized: 50,
        slim: 85, straight: 70, wide: 65, "skirt_a": 90,
      },
      rectangle: {
        fitted: 70, regular: 80, loose: 75, oversized: 85,
        slim: 75, straight: 80, wide: 70, "skirt_a": 70,
      },
      triangle: {
        fitted: 60, regular: 75, loose: 80, oversized: 70,
        slim: 55, straight: 85, wide: 90, "skirt_a": 90,
      },
      inverted_triangle: {
        fitted: 60, regular: 70, loose: 85, oversized: 90,
        slim: 80, straight: 75, wide: 70, "skirt_a": 60,
      },
      oval: {
        fitted: 45, regular: 70, loose: 85, oversized: 80,
        slim: 50, straight: 75, wide: 90, "skirt_a": 75,
      },
    };

    const typeScores = bodyTypeScores[bodyType];
    const optionScore = typeScores?.[opt.id];
    if (optionScore !== undefined) {
      return optionScore;
    }

    return 60;
  }

  /**
   * Calculate style score based on context and preferences
   */
  private calculateStyleScore(
    opt: { id: string; label: string },
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
  ): number {
    let score = 50; // Base score

    // Check against preferred styles from context
    if (context.preferredStyles.length > 0) {
      const isPreferred = context.preferredStyles.some(
        (style) => style.toLowerCase().includes(opt.label.toLowerCase()) ||
                   opt.label.toLowerCase().includes(style.toLowerCase()),
      );
      if (isPreferred) {score += 30;}
    }

    // Check against style avoidances
    if (context.styleAvoidances.length > 0) {
      const isAvoided = context.styleAvoidances.some(
        (avoid) => avoid.toLowerCase().includes(opt.label.toLowerCase()) ||
                   opt.label.toLowerCase().includes(avoid.toLowerCase()),
      );
      if (isAvoided) {score -= 40;}
    }

    // Check against user's historical preferences
    if (userProfile.stylePreferences.length > 0) {
      const matchesPreference = userProfile.stylePreferences.some(
        (pref) => pref.toLowerCase().includes(opt.label.toLowerCase()) ||
                  opt.label.toLowerCase().includes(pref.toLowerCase()),
      );
      if (matchesPreference) {score += 20;}
    }

    // Check occasion fit
    if (context.occasion) {
      const occasionStyleBonus = this.getOccasionStyleBonus(opt.id, context.occasion);
      score += occasionStyleBonus;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get bonus score for style-occasion match
   */
  private getOccasionStyleBonus(styleId: string, occasion: string): number {
    const occasionStyles: Record<string, string[]> = {
      interview: ["smart_casual", "minimalist"],
      work: ["smart_casual", "minimalist", "french"],
      date: ["french", "korean", "japanese"],
      travel: ["korean", "sporty", "streetwear"],
      party: ["streetwear", "vintage", "french"],
      daily: ["japanese", "korean", "minimalist"],
      campus: ["korean", "japanese", "sporty"],
    };

    const recommendedStyles = occasionStyles[occasion] || [];
    return recommendedStyles.includes(styleId) ? 15 : 0;
  }

  /**
   * Calculate preference score based on user behavior history
   */
  private calculatePreferenceScore(
    opt: { id: string; label: string },
    nodeType: DecisionNodeType,
    userProfile: UserProfile,
  ): number {
    let score = 50; // Base score

    // Analyze behavior history
    const relevantBehaviors = userProfile.behaviorHistory.filter((b) => {
      if (!b.category) {return false;}
      return b.category.toLowerCase() === nodeType.toLowerCase() ||
             b.value?.toLowerCase().includes(opt.label.toLowerCase());
    });

    // Weight behaviors by recency and type
    const now = Date.now();
    let totalWeight = 0;

    for (const behavior of relevantBehaviors) {
      const age = now - behavior.timestamp.getTime();
      const recencyFactor = Math.max(0.1, 1 - age / (30 * 24 * 60 * 60 * 1000)); // Decay over 30 days

      // Positive behaviors boost score
      if (["view", "like", "favorite", "purchase", "try_on_complete"].includes(behavior.type)) {
        totalWeight += behavior.weight * recencyFactor;
      }
      // Negative behaviors reduce score
      else if (["unfavorite", "dislike"].includes(behavior.type)) {
        totalWeight -= behavior.weight * recencyFactor;
      }
    }

    score += Math.min(30, totalWeight * 10); // Cap bonus at 30

    // Check color preferences for color node type
    if (nodeType === "color" && userProfile.colorPreferences.length > 0) {
      const colorMatch = userProfile.colorPreferences.some(
        (color) => color.toLowerCase().includes(opt.label.toLowerCase()) ||
                   opt.label.toLowerCase().includes(color.toLowerCase()),
      );
      if (colorMatch) {score += 25;}
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate composite score from individual scores
   * Formula: fit * 0.3 + style * 0.3 + preference * 0.4
   */
  private calculateCompositeScore(scores: {
    fitScore: number;
    styleScore: number;
    preferenceScore: number;
  }): number {
    return (
      scores.fitScore * 0.3 +
      scores.styleScore * 0.3 +
      scores.preferenceScore * 0.4
    );
  }

  // ==================== LLM Reasoning ====================

  /**
   * Generate LLM reasoning for a decision node
   */
  private async generateNodeReasoning(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    options: DecisionOption[],
  ): Promise<string> {
    // Fallback reasoning if LLM is not available
    const fallbackReasoning = this.buildFallbackReasoning(nodeType, context, userProfile, options);

    if (!this.apiKey || !this.apiEndpoint || !this.model) {
      return fallbackReasoning;
    }

    try {
      const prompt = this.buildReasoningPrompt(nodeType, context, userProfile, options);
      const response = await this.callLLM([
        {
          role: "system",
          content: "你是一个专业的穿搭顾问。请用简洁的中文解释为什么推荐这些选项，控制在100字以内。",
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

  /**
   * Build fallback reasoning without LLM
   */
  private buildFallbackReasoning(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    options: DecisionOption[],
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

  /**
   * Build prompt for LLM reasoning
   */
  private buildReasoningPrompt(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    options: DecisionOption[],
  ): string {
    const topOptions = options.slice(0, 3).map((o) => o.displayName).join("、");

    return JSON.stringify({
      nodeType,
      occasion: context.occasion,
      bodyType: userProfile.bodyType,
      colorSeason: userProfile.colorSeason,
      preferredStyle: [...context.preferredStyles, ...userProfile.stylePreferences][0],
      topOptions,
      task: "请简要解释为什么推荐这些选项",
    }, null, 2);
  }

  // ==================== User Decision Recording ====================

  /**
   * Record a user's decision and advance the decision tree
   */
  async recordDecision(input: RecordDecisionInput): Promise<DecisionTreeResult> {
    const { sessionId, nodeId, chosenOptionId, rejectedOptionIds = [], decisionTime = 0 } = input;

    this.logger.log(`Recording decision for session ${sessionId}, node ${nodeId}`);

    // Get current tree
    const tree = await this.getTree(sessionId);
    if (!tree) {
      return {
        success: false,
        isComplete: false,
        message: "决策树不存在或已过期",
      };
    }

    // Get current node
    const currentNode = tree.nodes.get(nodeId);
    if (!currentNode) {
      return {
        success: false,
        isComplete: false,
        message: "决策节点不存在",
      };
    }

    // Record the decision
    const decision: UserDecision = {
      id: randomUUID(),
      sessionId,
      nodeId,
      nodeType: currentNode.nodeType,
      chosenOptionId,
      rejectedOptionIds,
      decisionTime,
      timestamp: new Date(),
    };

    tree.decisions.push(decision);
    tree.updatedAt = new Date();

    // Persist decision to database
    await this.persistDecision(decision, tree.userId);

    // Update user preferences based on decision
    await this.updatePreferencesFromDecision(tree.userId, decision, currentNode);

    // Determine next node type
    const nextNodeType = this.getNextNodeType(currentNode.nodeType, tree);

    // Check if tree is complete
    if (!nextNodeType) {
      tree.status = "completed";
      await this.persistTree(tree);

      return {
        success: true,
        tree,
        isComplete: true,
        message: "决策流程已完成",
      };
    }

    // Build next node
    const context = await this.buildContextFromDecisions(tree);
    const userProfile = await this.getUserProfile(tree.userId);

    const nextNode = await this.buildNextNode(nextNodeType, context, userProfile, currentNode);
    nextNode.parentNodeId = currentNode.nodeId;

    tree.nodes.set(nextNode.nodeId, nextNode);
    tree.currentNodeId = nextNode.nodeId;
    tree.updatedAt = new Date();

    await this.persistTree(tree);

    return {
      success: true,
      tree,
      currentNode,
      nextNode,
      isComplete: false,
      message: "决策已记录",
    };
  }

  /**
   * Determine the next node type based on current node and decision history
   */
  private getNextNodeType(
    currentNodeType: DecisionNodeType,
    tree: DecisionTree,
  ): DecisionNodeType | null {
    const decisionTypes = tree.decisions.map((d) => d.nodeType);
    const currentIndex = DECISION_NODE_TYPES.indexOf(currentNodeType);

    // Check if all node types have been covered
    if (decisionTypes.length >= 4) {
      return null; // Tree complete
    }

    // Determine next unvisited node type
    for (let i = currentIndex + 1; i < DECISION_NODE_TYPES.length; i++) {
      const nodeType = DECISION_NODE_TYPES[i];
      if (nodeType && !decisionTypes.includes(nodeType)) {
        return nodeType;
      }
    }

    // Wrap around to beginning
    for (let i = 0; i < currentIndex; i++) {
      const nodeType = DECISION_NODE_TYPES[i];
      if (nodeType && !decisionTypes.includes(nodeType)) {
        return nodeType;
      }
    }

    return null;
  }

  /**
   * Build context from recorded decisions
   */
  private async buildContextFromDecisions(tree: DecisionTree): Promise<DecisionContext> {
    const context: DecisionContext = {
      preferredStyles: [],
      styleAvoidances: [],
      fitGoals: [],
      preferredColors: [],
    };

    for (const decision of tree.decisions) {
      const node = tree.nodes.get(decision.nodeId);
      if (!node) {continue;}

      const chosenOption = node.options.find((o) => o.optionId === decision.chosenOptionId);
      if (!chosenOption) {continue;}

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

      // Record rejected styles as avoidances
      for (const rejectedId of decision.rejectedOptionIds) {
        const rejectedOption = node.options.find((o) => o.optionId === rejectedId);
        if (rejectedOption?.content.styleTags && node.nodeType === "style") {
          context.styleAvoidances.push(...rejectedOption.content.styleTags);
        }
      }
    }

    return context;
  }

  /**
   * Build next decision node
   */
  private async buildNextNode(
    nodeType: DecisionNodeType,
    context: DecisionContext,
    userProfile: UserProfile,
    parentNode: DecisionNode,
  ): Promise<DecisionNode> {
    const options = await this.generateNodeOptions(nodeType, context, userProfile);
    const llmReasoning = await this.generateNodeReasoning(nodeType, context, userProfile, options);

    return {
      nodeId: randomUUID(),
      nodeType,
      question: NODE_TYPE_QUESTIONS[nodeType],
      options,
      llmReasoning,
      parentNodeId: parentNode.nodeId,
      depth: parentNode.depth + 1,
    };
  }

  // ==================== Decision History & Persistence ====================

  /**
   * Persist decision to database
   */
  private async persistDecision(
    decision: UserDecision,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.userDecision.create({
        data: {
          id: decision.id,
          userId,
          sessionId: decision.sessionId,
          nodeId: decision.nodeId,
          nodeType: decision.nodeType,
          chosenOptionId: decision.chosenOptionId,
          rejectedOptionIds: decision.rejectedOptionIds,
          decisionTime: decision.decisionTime,
          timestamp: decision.timestamp,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist decision: ${error}`);
      // Continue even if persistence fails
    }
  }

  /**
   * Update user preferences based on decision
   */
  private async updatePreferencesFromDecision(
    userId: string,
    decision: UserDecision,
    node: DecisionNode,
  ): Promise<void> {
    const chosenOption = node.options.find((o) => o.optionId === decision.chosenOptionId);
    if (!chosenOption) {return;}

    try {
      // Update preference weights
      const category = `decision_${node.nodeType}`;

      // Increase weight for chosen option
      await this.prisma.userPreferenceWeight.upsert({
        where: {
          userId_category_key: {
            userId,
            category,
            key: chosenOption.displayName,
          },
        },
        create: {
          userId,
          category,
          key: chosenOption.displayName,
          weight: 1.0,
          source: "decision_tree",
        },
        update: {
          weight: { increment: 0.5 },
        },
      });

      // Decrease weight for rejected options
      for (const rejectedId of decision.rejectedOptionIds) {
        const rejectedOption = node.options.find((o) => o.optionId === rejectedId);
        if (rejectedOption) {
          await this.prisma.userPreferenceWeight.upsert({
            where: {
              userId_category_key: {
                userId,
                category,
                key: rejectedOption.displayName,
              },
            },
            create: {
              userId,
              category,
              key: rejectedOption.displayName,
              weight: -0.3,
              source: "decision_tree",
            },
            update: {
              weight: { decrement: 0.3 },
            },
          });
        }
      }

      // Record behavior event
      await this.prisma.userBehaviorEvent.create({
        data: {
          sessionId: decision.sessionId,
          userId,
          eventType: "recommendation_click",
          category: "decision_tree",
          action: decision.nodeType,
          targetType: "decision_option",
          targetId: decision.chosenOptionId,
          metadata: {
            nodeId: decision.nodeId,
            chosenOption: chosenOption.displayName,
            rejectedCount: decision.rejectedOptionIds.length,
            decisionTime: decision.decisionTime,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update preferences: ${error}`);
    }
  }

  /**
   * Persist decision tree to cache
   */
  private async persistTree(tree: DecisionTree): Promise<void> {
    // Serialize tree for storage
    const serializedTree = this.serializeTree(tree);

    // Store in memory cache
    this.treeCache.set(tree.sessionId, tree);

    // Store in Redis if available
    if (this.useRedis) {
      try {
        // Convert ms to seconds for setex
        const ttlSeconds = Math.ceil(this.treeTtlMs / 1000);
        await this.redisService.setex(
          `${this.treeConfigPrefix}${tree.sessionId}`,
          ttlSeconds,
          serializedTree,
        );
      } catch (error) {
        this.logger.warn(`Failed to persist tree to Redis: ${error}`);
      }
    }
  }

  /**
   * Get decision tree from cache
   */
  private async getTree(sessionId: string): Promise<DecisionTree | null> {
    // Check memory cache first
    const cachedTree = this.treeCache.get(sessionId);
    if (cachedTree) {
      return cachedTree;
    }

    // Check Redis if available
    if (this.useRedis) {
      try {
        const serializedTree = await this.redisService.get(
          `${this.treeConfigPrefix}${sessionId}`,
        );
        if (serializedTree) {
          const tree = this.deserializeTree(serializedTree);
          this.treeCache.set(sessionId, tree);
          return tree;
        }
      } catch (error) {
        this.logger.warn(`Failed to get tree from Redis: ${error}`);
      }
    }

    return null;
  }

  /**
   * Serialize decision tree for storage
   */
  private serializeTree(tree: DecisionTree): string {
    return JSON.stringify({
      treeId: tree.treeId,
      sessionId: tree.sessionId,
      userId: tree.userId,
      rootNodeId: tree.rootNodeId,
      currentNodeId: tree.currentNodeId,
      nodes: Array.from(tree.nodes.entries()),
      decisions: tree.decisions,
      status: tree.status,
      createdAt: tree.createdAt,
      updatedAt: tree.updatedAt,
    });
  }

  /**
   * Deserialize decision tree from storage
   */
  private deserializeTree(data: string): DecisionTree {
    const parsed = JSON.parse(data) as Omit<DecisionTree, 'nodes' | 'decisions' | 'createdAt' | 'updatedAt'> & {
      nodes: [string, DecisionNode][];
      decisions: SerializedDecision[];
      createdAt: string;
      updatedAt: string;
    };
    return {
      ...parsed,
      nodes: new Map(parsed.nodes),
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      decisions: parsed.decisions.map((d): UserDecision => ({
        ...d,
        timestamp: new Date(d.timestamp),
      })),
    };
  }

  // ==================== User Profile & Context ====================

  /**
   * Get user profile with behavior history
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const [profile, behaviors, preferenceWeights] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              styleProfiles: {
                where: { isActive: true },
                select: { name: true, keywords: true },
              },
            },
          },
        },
      }),
      this.prisma.userBehaviorEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.userPreferenceWeight.findMany({
        where: { userId },
      }),
    ]);

    // Extract style preferences
    const stylePreferences: string[] = [];
    if (profile?.stylePreferences) {
      const prefs = extractStringArray(profile.stylePreferences);
      stylePreferences.push(...prefs);
    }

    // Add from style profiles
    if (profile?.user?.styleProfiles) {
      for (const sp of profile.user.styleProfiles) {
        stylePreferences.push(sp.name, ...sp.keywords);
      }
    }

    // Add from preference weights
    const styleWeights = preferenceWeights.filter((w) => w.category === "decision_style");
    stylePreferences.push(
      ...styleWeights.sort((a, b) => Number(b.weight) - Number(a.weight)).map((w) => w.key),
    );

    // Extract color preferences
    const colorPreferences: string[] = [];
    if (profile?.colorPreferences) {
      const prefs = extractStringArray(profile.colorPreferences);
      colorPreferences.push(...prefs);
    }

    // Build behavior history
    const behaviorHistory: BehaviorRecord[] = behaviors.map((b) => ({
      type: b.action,
      category: b.category,
      value: b.targetId || undefined,
      weight: this.getBehaviorWeight(b.eventType),
      timestamp: b.createdAt,
    }));

    return {
      userId,
      bodyType: profile?.bodyType || undefined,
      skinTone: profile?.skinTone || undefined,
      colorSeason: profile?.colorSeason || undefined,
      height: profile?.height || undefined,
      weight: profile?.weight || undefined,
      stylePreferences: [...new Set(stylePreferences)],
      colorPreferences: [...new Set(colorPreferences)],
      fitGoals: [],
      behaviorHistory,
    };
  }

  /**
   * Get behavior weight based on event type
   */
  private getBehaviorWeight(eventType: string): number {
    const weights: Record<string, number> = {
      recommendation_click: 1.0,
      try_on_complete: 1.5,
      favorite: 1.2,
      purchase: 2.0,
      unfavorite: -0.5,
    };
    return weights[eventType] || 0.5;
  }

  // ==================== Query Interfaces ====================

  /**
   * Get decision history for a session
   */
  async getSessionDecisions(sessionId: string): Promise<UserDecision[]> {
    const decisions = await this.prisma.userDecision.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });

    return decisions.map((d) => ({
      id: d.id,
      sessionId: d.sessionId,
      nodeId: d.nodeId,
      nodeType: d.nodeType as DecisionNodeType,
      chosenOptionId: d.chosenOptionId,
      rejectedOptionIds: d.rejectedOptionIds,
      decisionTime: d.decisionTime,
      timestamp: d.timestamp,
    }));
  }

  /**
   * Get decision statistics for a user
   */
  async getUserDecisionStats(userId: string): Promise<{
    totalDecisions: number;
    decisionsByType: Record<string, number>;
    topChoices: Array<{ choice: string; count: number }>;
    averageDecisionTime: number;
  }> {
    const decisions = await this.prisma.userDecision.findMany({
      where: { userId },
    });

    const decisionsByType: Record<string, number> = {};
    const choiceCounts: Record<string, number> = {};
    let totalTime = 0;
    let validTimeCount = 0;

    for (const decision of decisions) {
      // Count by type
      decisionsByType[decision.nodeType] = (decisionsByType[decision.nodeType] || 0) + 1;

      // Count choices (would need to join with option data for display names)
      choiceCounts[decision.chosenOptionId] = (choiceCounts[decision.chosenOptionId] || 0) + 1;

      // Sum decision times
      if (decision.decisionTime > 0) {
        totalTime += decision.decisionTime;
        validTimeCount++;
      }
    }

    const topChoices = Object.entries(choiceCounts)
      .map(([choice, count]) => ({ choice, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDecisions: decisions.length,
      decisionsByType,
      topChoices,
      averageDecisionTime: validTimeCount > 0 ? totalTime / validTimeCount : 0,
    };
  }

  /**
   * Get current decision node for a session
   */
  async getCurrentNode(sessionId: string): Promise<DecisionNode | null> {
    const tree = await this.getTree(sessionId);
    if (!tree) {return null;}

    return tree.nodes.get(tree.currentNodeId) || null;
  }

  /**
   * Skip a decision node
   */
  async skipNode(sessionId: string, nodeId: string): Promise<DecisionTreeResult> {
    const tree = await this.getTree(sessionId);
    if (!tree) {
      return {
        success: false,
        isComplete: false,
        message: "决策树不存在",
      };
    }

    const currentNode = tree.nodes.get(nodeId);
    if (!currentNode) {
      return {
        success: false,
        isComplete: false,
        message: "节点不存在",
      };
    }

    // Record skip as a decision with no choice
    const decision: UserDecision = {
      id: randomUUID(),
      sessionId,
      nodeId,
      nodeType: currentNode.nodeType,
      chosenOptionId: "skipped",
      rejectedOptionIds: [],
      decisionTime: 0,
      timestamp: new Date(),
    };

    tree.decisions.push(decision);

    // Move to next node
    const nextNodeType = this.getNextNodeType(currentNode.nodeType, tree);

    if (!nextNodeType) {
      tree.status = "completed";
      await this.persistTree(tree);
      return {
        success: true,
        tree,
        isComplete: true,
        message: "决策流程已完成",
      };
    }

    const context = await this.buildContextFromDecisions(tree);
    const userProfile = await this.getUserProfile(tree.userId);

    const nextNode = await this.buildNextNode(nextNodeType, context, userProfile, currentNode);
    nextNode.parentNodeId = currentNode.nodeId;

    tree.nodes.set(nextNode.nodeId, nextNode);
    tree.currentNodeId = nextNode.nodeId;
    tree.updatedAt = new Date();

    await this.persistTree(tree);

    return {
      success: true,
      tree,
      currentNode,
      nextNode,
      isComplete: false,
      message: "已跳过当前节点",
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Call LLM API
   */
  private async callLLM(
    messages: Array<{ role: string; content: string }>,
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

  /**
   * Get display name for body type
   */
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

  /**
   * Get display name for occasion
   */
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

  /**
   * Get display name for color season
   */
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

/**
 * GLM-5 Function Calling Agent Tools Service
 *
 * This service provides tool functions that can be called by LLM agents (GLM-5)
 * for the AI Stylist functionality.
 */

import { randomUUID } from "crypto";

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import axios, { AxiosInstance } from "axios";

import { PrismaService } from '../../../common/prisma/prisma.service";
import { RedisService } from '../../../common/redis/redis.service";
import { StyleUnderstandingService } from '../ai/services/style-understanding.service";
import {
  RecommendationsService,
  type RecommendedItem,
} from '../../platform/recommendations/recommendations.service";

import { SystemContextService } from "./system-context.service";

// Import shared types
import {
  type PropertyDefinition,
  type GLM5FunctionTool,
  type FunctionCall,
  type FunctionResult,
  type GLM5Message,
  type GLM5ToolCall,
  type GLM5Choice,
  type GLM5Response,
  type ClothingItemBasic,
  type StyleAnalysisResult,
  type TryOnServiceResponse,
  type ToolExecutionResult,
  type AgentLoopResult,
  type GetUserProfileInput,
  type UserProfileResult,
  type SearchClothingInput,
  type ClothingSearchResult,
  type RecommendOutfitInput,
  type OutfitRecommendationResult,
  type VirtualTryOnInput,
  type VirtualTryOnResult,
  type RecordUserDecisionInput,
  type UserDecisionResult,
  type MLItemRecommendation,
  type GetSystemContextInput,
  type SystemContextResult,
} from "./types";

// GLM-5 Tool Definitions
export const GLM5_AGENT_TOOLS: GLM5FunctionTool[] = [
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Get user body profile information including body type, skin tone, color season, measurements, and style preferences.",
      parameters: {
        type: "object",
        description: "Parameters for getting user profile",
        properties: {
          userId: {
            type: "string",
            description: "The unique identifier of the user",
          },
        },
        required: ["userId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_clothing",
      description: "Search the clothing database with natural language query and optional filters.",
      parameters: {
        type: "object",
        description: "Parameters for searching clothing",
        properties: {
          query: { type: "string", description: "Search query" },
          filters: { type: "object", description: "Optional filters" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommend_outfit",
      description: "Generate personalized outfit recommendations based on user context and preferences.",
      parameters: {
        type: "object",
        description: "Parameters for outfit recommendation",
        properties: {
          context: { type: "object", description: "Context for recommendation" },
          preferences: { type: "object", description: "User preferences" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "virtual_try_on",
      description: "Execute virtual try-on to show how clothing would look on the user.",
      parameters: {
        type: "object",
        description: "Parameters for virtual try-on",
        properties: {
          personImage: { type: "object", description: "User photo" },
          outfit: { type: "object", description: "Clothing items" },
        },
        required: ["personImage", "outfit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_user_decision",
      description: "Record user decision on recommendations for learning and improving future recommendations.",
      parameters: {
        type: "object",
        description: "Parameters for recording user decision",
        properties: {
          sessionId: { type: "string", description: "Session ID" },
          decision: { type: "object", description: "Decision details" },
        },
        required: ["sessionId", "decision"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_system_context",
      description: "Get comprehensive local system context including Git status, database statistics, service health, system resources, and project file information. Use this when users ask about system status, data overview, version info, or 'what's new'.",
      parameters: {
        type: "object",
        description: "Parameters for getting system context",
        properties: {
          refresh: { type: "boolean", description: "Force refresh cached data (default false)" },
          section: { type: "string", enum: ["git", "database", "services", "resources", "files", "all"], description: "Which section to return. Default is 'all'." },
        },
        required: [],
      },
    },
  },
];

@Injectable()
export class AgentToolsService {
  private readonly logger = new Logger(AgentToolsService.name);
  private glmClient!: AxiosInstance;
  private readonly glmApiKey: string;
  private readonly glmModel: string;
  private readonly glmApiUrl: string;
  private readonly mlServiceUrl: string;

  constructor(
    private readonly styleUnderstandingService: StyleUnderstandingService,
    private readonly recommendationsService: RecommendationsService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly systemContextService: SystemContextService,
  ) {
    this.glmApiKey = this.configService.get<string>("GLM_API_KEY", "");
    this.glmModel = this.configService.get<string>("GLM_MODEL", "glm-5");
    this.glmApiUrl = this.configService.get<string>("GLM_API_URL", "https://open.bigmodel.cn/api/paas/v4");
    this.mlServiceUrl = this.configService.get<string>("ML_SERVICE_URL", "http://localhost:8001");
  }

  async onModuleInit(): Promise<void> {
    this.glmClient = axios.create({
      baseURL: this.glmApiUrl,
      timeout: 60000,
      headers: {
        Authorization: `Bearer ${this.glmApiKey}`,
        "Content-Type": "application/json",
      },
    });
    this.logger.log("AgentToolsService initialized with GLM-5 integration");
  }

  getToolDefinitions(): GLM5FunctionTool[] {
    return GLM5_AGENT_TOOLS;
  }

  async executeFunctionCall(call: FunctionCall): Promise<FunctionResult> {
    this.logger.log(`Executing function: ${call.name}`);
    try {
      let result: UserProfileResult | ClothingSearchResult | OutfitRecommendationResult | VirtualTryOnResult | UserDecisionResult | SystemContextResult | Partial<SystemContextResult>;
      
      switch (call.name) {
        case "get_user_profile": {
          const input = this.parseArguments<GetUserProfileInput>(call.arguments);
          result = await this.getUserProfile(input);
          break;
        }
        case "search_clothing": {
          const input = this.parseArguments<SearchClothingInput>(call.arguments);
          result = await this.searchClothing(input);
          break;
        }
        case "recommend_outfit": {
          const input = this.parseArguments<RecommendOutfitInput>(call.arguments);
          result = await this.recommendOutfit(input);
          break;
        }
        case "virtual_try_on": {
          const input = this.parseArguments<VirtualTryOnInput>(call.arguments);
          result = await this.virtualTryOn(input);
          break;
        }
        case "record_user_decision": {
          const input = this.parseArguments<RecordUserDecisionInput>(call.arguments);
          result = await this.recordUserDecision(input);
          break;
        }
        case "get_system_context": {
          const input = this.parseArguments<GetSystemContextInput>(call.arguments);
          result = await this.getSystemContext(input);
          break;
        }
        default:
          return { success: false, error: `Unknown function: ${call.name}` };
      }
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Function execution failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Type-safe argument parser with validation
   */
  private parseArguments<T>(args: Record<string, unknown>): T {
    return args as T;
  }

  // Tool 1: Get User Profile
  async getUserProfile(input: GetUserProfileInput): Promise<UserProfileResult> {
    const { userId } = input;
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`User profile not found: ${userId}`);
    }
    return {
      userId,
      bodyType: profile.bodyType,
      bodyTypeName: profile.bodyType,
      skinTone: profile.skinTone,
      colorSeason: profile.colorSeason,
      height: profile.height,
      weight: profile.weight,
      stylePreferences: (profile.stylePreferences as string[]) || [],
      colorPreferences: (profile.colorPreferences as string[]) || [],
    };
  }

  // Tool 2: Search Clothing
  async searchClothing(input: SearchClothingInput): Promise<ClothingSearchResult> {
    const { query, filters = {}, limit = 20, offset = 0 } = input;
    const where: Prisma.ClothingItemWhereInput = { isActive: true };
    if (filters.category) {where.category = filters.category;}
    if (filters.colors && filters.colors.length > 0) {where.colors = { hasSome: filters.colors };}
    if (filters.styles && filters.styles.length > 0) {where.tags = { hasSome: filters.styles };}

    const [items, total] = await Promise.all([
      this.prisma.clothingItem.findMany({
        where,
        include: { brand: true },
        orderBy: [{ viewCount: "desc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.clothingItem.count({ where }),
    ]);

    // Transform Prisma result to ClothingItemBasic[]
    const clothingItems: ClothingItemBasic[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      colors: item.colors,
      tags: item.tags,
      images: item.images,
      price: Number(item.price),
      brand: item.brand
        ? {
            id: item.brand.id,
            name: item.brand.name,
            logo: item.brand.logo,
          }
        : undefined,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
    }));

    return { items: clothingItems, total, hasMore: offset + limit < total };
  }

  // Tool 3: Recommend Outfit
  async recommendOutfit(input: RecommendOutfitInput): Promise<OutfitRecommendationResult> {
    const { context = {}, preferences = {} } = input;
    let styleQuery = context.stylePreference || "casual";
    if (context.occasion) {styleQuery += ` ${context.occasion}`;}

    const styleAnalysis = await this.styleUnderstandingService.analyzeStyle(styleQuery);

    const recommendations = await this.recommendationsService.getPersonalizedRecommendations(
      context.userId || "",
      { occasion: context.occasion, limit: 10 }
    );

    // Convert StyleAnalysisResult to the expected format
    const analysisResult: StyleAnalysisResult = {
      style: styleAnalysis.style_name || "casual",
      confidence: styleAnalysis.confidence || 0.8,
      keywords: styleAnalysis.core_elements || [],
      occasions: styleAnalysis.occasions || [],
      seasons: styleAnalysis.seasons || [],
      attributes: {
        key_items: styleAnalysis.key_items || [],
        color_palette: styleAnalysis.color_palette || [],
        patterns: styleAnalysis.patterns || [],
        materials: styleAnalysis.materials || [],
        body_type_suggestions: styleAnalysis.body_type_suggestions || {},
        celebrity_references: styleAnalysis.celebrity_references || [],
        brand_references: styleAnalysis.brand_references || [],
        price_range: styleAnalysis.price_range || "",
        similar_styles: styleAnalysis.similar_styles || [],
      },
    };

    return {
      outfitId: `outfit_${Date.now()}_${randomUUID()}`,
      styleAnalysis: analysisResult,
      items: recommendations.map((r: RecommendedItem) => ({
        id: r.item.id,
        name: r.item.name,
        category: r.item.category,
        colors: r.item.colors,
        tags: [],  // tags field not available in RecommendedItem
        images: r.item.images,
        price: Number(r.item.price),
        brand: r.item.brand ? {
          id: r.item.brand.id,
          name: r.item.brand.name,
          logo: r.item.brand.logo,
        } : undefined,
        viewCount: r.item.viewCount,
        likeCount: r.item.likeCount,
      })),
      compatibilityScore: 85,
    };
  }

  // Tool 4: Virtual Try-On
  async virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnResult> {
    const { personImage, outfit } = input;
    let photoUrl: string;
    let userId: string | undefined;

    if (personImage.photoId) {
      const photo = await this.prisma.userPhoto.findUnique({
        where: { id: personImage.photoId },
      });
      if (!photo) {throw new NotFoundException("Photo not found");}
      photoUrl = photo.url;
      userId = photo.userId;
    } else if (personImage.imageUrl) {
      photoUrl = personImage.imageUrl;
    } else {
      throw new Error("Either photoId or imageUrl is required");
    }

    if (!outfit.itemId) {
      throw new Error("Outfit itemId is required");
    }

    const item = await this.prisma.clothingItem.findUnique({
      where: { id: outfit.itemId },
    });
    if (!item) {throw new NotFoundException("Item not found");}
    const garmentImageUrl = item.images[0] || "";
    if (!garmentImageUrl) {
      throw new Error("Item does not have a usable image");
    }

    const tryOnId = randomUUID();
    const { TryOnStatus } = await import("@prisma/client");
    
    try {
      const response = await axios.post<TryOnServiceResponse>(
        `${this.mlServiceUrl}/api/tryon`,
        {
          person_image_url: photoUrl,
          garment_image_url: garmentImageUrl,
          category: "upper_body",
        },
        { timeout: 120000 }
      );

      if (response.data?.success && response.data.result_image_url) {
        if (userId && personImage.photoId) {
          await this.prisma.virtualTryOn.create({
            data: {
              id: tryOnId,
              userId,
              photoId: personImage.photoId,
              itemId: outfit.itemId,
              status: TryOnStatus.completed,
              resultImageUrl: response.data.result_image_url,
            },
          });
        }
        return { tryOnId, status: TryOnStatus.completed, resultImageUrl: response.data.result_image_url };
      }
      return { tryOnId, status: TryOnStatus.failed, resultImageUrl: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Try-on failed: ${errorMessage}`);
      return { tryOnId, status: TryOnStatus.failed, resultImageUrl: null, estimatedWaitTime: 0 };
    }
  }

  // Tool 5: Record User Decision
  async recordUserDecision(input: RecordUserDecisionInput): Promise<UserDecisionResult> {
    const { sessionId, decision } = input;
    await this.prisma.userBehavior.create({
      data: { userId: sessionId, type: decision.type },
    });
    if (decision.itemId) {
      await this.prisma.rankingFeedback.create({
        data: {
          userId: sessionId,
          itemId: decision.itemId,
          action: decision.type,
          weight: this.getDecisionWeight(decision.type),
        },
      });
    }
    return { success: true, recorded: true };
  }

  private getDecisionWeight(type: string): number {
    const weights: Record<string, number> = {
      post_like: 1.0,
      purchase: 2.0,
      try_on_complete: 0.5,
      favorite: 0.8,
      click: -0.2,
    };
    return weights[type] || 0;
  }

  // Tool 6: Get System Context
  async getSystemContext(input: GetSystemContextInput): Promise<SystemContextResult | Partial<SystemContextResult>> {
    const { refresh = false, section } = input;
    const fullContext = await this.systemContextService.getFullContext(refresh);

    if (section && section !== "all") {
      return {
        timestamp: fullContext.timestamp,
        environment: fullContext.environment,
        git: section === "git" ? fullContext.git : undefined,
        database: section === "database" ? fullContext.database : undefined,
        services: section === "services" ? fullContext.services : undefined,
        resources: section === "resources" ? fullContext.resources : undefined,
        projectFiles: section === "files" ? fullContext.projectFiles : undefined,
      } as Partial<SystemContextResult>;
    }
    return fullContext;
  }

  // GLM-5 Integration
  async callGLM5WithTools(
    messages: Array<{ role: string; content: string }>,
    tools?: GLM5FunctionTool[],
  ): Promise<{ message: GLM5Message; toolCalls?: GLM5ToolCall[] }> {
    const payload = {
      model: this.glmModel,
      messages,
      tools: tools || this.getToolDefinitions(),
      tool_choice: "auto",
    };
    const response = await this.glmClient.post<GLM5Response>("/chat/completions", payload);
    const choice = response.data.choices[0];
    if (!choice) {
      throw new Error("No response from GLM-5");
    }
    return { message: choice.message, toolCalls: choice.message.tool_calls };
  }

  async executeAgentLoop(
    userMessage: string,
    systemPrompt: string,
    maxIterations: number = 5,
  ): Promise<AgentLoopResult> {
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];
    const executedToolCalls: ToolExecutionResult[] = [];

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.callGLM5WithTools(messages);
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { response: response.message.content || "", toolCalls: executedToolCalls };
      }
      for (const toolCall of response.toolCalls) {
        const startTime = Date.now();
        const result = await this.executeFunctionCall({
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments) as Record<string, unknown>,
        });
        const executionTime = Date.now() - startTime;
        executedToolCalls.push({
          toolName: toolCall.function.name,
          success: result.success,
          result: result.data,
          executionTime,
        });
        // Tool role message format for GLM-5
        messages.push({
          role: "tool" as const,
          content: JSON.stringify(result),
        });
      }
    }
    return { response: "Processing complete.", toolCalls: executedToolCalls };
  }
}

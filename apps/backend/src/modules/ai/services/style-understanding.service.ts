import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface StyleAnalysisResult {
  style_name: string;
  confidence: number;
  core_elements: string[];
  key_items: string[];
  color_palette: string[];
  patterns: string[];
  materials: string[];
  occasions: string[];
  seasons: string[];
  body_type_suggestions: Record<string, string[]>;
  celebrity_references: string[];
  brand_references: string[];
  price_range: string;
  similar_styles: string[];
}

export interface OutfitSuggestion {
  category: string;
  description: string;
  style_tags: string[];
  color_suggestions: string[];
  item_examples: string[];
  pairing_tips: string;
}

export interface StyleRecommendationResult {
  style_analysis: StyleAnalysisResult;
  outfit_suggestions: OutfitSuggestion[];
  embedding_prompts: string[];
  style_weights: Record<string, number>;
}

export interface RecommendationItem {
  item_id: string;
  score: number;
  category: string;
  style_tags: string[];
  color_tags: string[];
  reasons: string[];
  image_url?: string;
  price?: number;
  brand?: string;
}

export interface FullRecommendationResult {
  style_analysis: StyleAnalysisResult;
  recommendations: RecommendationItem[];
  total: number;
}

@Injectable()
export class StyleUnderstandingService {
  private readonly logger = new Logger(StyleUnderstandingService.name);
  private mlClient!: AxiosInstance;
  private readonly mlServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.mlServiceUrl = this.configService.get<string>(
      "ML_SERVICE_URL",
      "http://localhost:8001",
    );
  }

  async onModuleInit() {
    this.mlClient = axios.create({
      baseURL: this.mlServiceUrl,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async analyzeStyle(
    userInput: string,
    userProfile?: {
      gender?: string;
      age?: number;
      bodyType?: string;
      stylePreferences?: string[];
    },
  ): Promise<StyleAnalysisResult> {
    try {
      const response = await this.mlClient.post("/api/style/analyze", {
        user_input: userInput,
        user_profile: userProfile,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`风格分析失败: ${this.getErrorMessage(error)}`);
      return this.getFallbackStyleAnalysis(userInput);
    }
  }

  async getStyleSuggestions(
    userInput: string,
    bodyType?: string,
    occasion?: string,
  ): Promise<StyleRecommendationResult> {
    try {
      const response = await this.mlClient.post("/api/style/suggestions", {
        user_input: userInput,
        body_type: bodyType,
        occasion: occasion,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`获取风格建议失败: ${this.getErrorMessage(error)}`);
      return this.getFallbackSuggestions(userInput);
    }
  }

  async getRecommendations(
    userInput: string,
    options?: {
      userProfile?: Record<string, any>;
      occasion?: string;
      category?: string;
      topK?: number;
    },
  ): Promise<FullRecommendationResult> {
    try {
      const response = await this.mlClient.post("/api/recommendations", {
        user_input: userInput,
        user_profile: options?.userProfile,
        occasion: options?.occasion,
        category: options?.category,
        top_k: options?.topK || 10,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`获取推荐失败: ${this.getErrorMessage(error)}`);
      return this.getFallbackRecommendations(userInput);
    }
  }

  async getOutfitRecommendation(
    userInput: string,
    options?: {
      userProfile?: Record<string, any>;
      occasion?: string;
    },
  ): Promise<{
    outfit_id: string;
    style_analysis: StyleAnalysisResult;
    items: RecommendationItem[];
    compatibility_score: number;
    total_price?: number;
  }> {
    try {
      const response = await this.mlClient.post("/api/recommendations/outfit", {
        user_input: userInput,
        user_profile: options?.userProfile,
        occasion: options?.occasion,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`获取搭配推荐失败: ${this.getErrorMessage(error)}`);
      return {
        outfit_id: `outfit_${Date.now()}`,
        style_analysis: this.getFallbackStyleAnalysis(userInput),
        items: [],
        compatibility_score: 0,
      };
    }
  }

  quickMatchStyle(userInput: string): { style: string; confidence: number } {
    const styleKeywords: Record<string, string[]> = {
      小红书同款: ["小红书", "网红", "爆款", "种草"],
      法式慵懒: ["法式", "慵懒", "巴黎", "French"],
      韩系: ["韩系", "韩国", "Korean", "韩风"],
      日系: ["日系", "日本", "Japanese", "文艺"],
      街头潮流: ["街头", "潮流", "嘻哈", "streetwear"],
      极简风: ["极简", "简约", "minimalist"],
      复古风: ["复古", "vintage", "怀旧"],
      运动风: ["运动", "健身", "sporty"],
    };

    for (const [style, keywords] of Object.entries(styleKeywords)) {
      for (const keyword of keywords) {
        if (userInput.includes(keyword)) {
          return { style, confidence: 0.9 };
        }
      }
    }

    return { style: "休闲风", confidence: 0.5 };
  }

  private getFallbackStyleAnalysis(userInput: string): StyleAnalysisResult {
    const quickMatch = this.quickMatchStyle(userInput);

    const styleData: Record<string, Partial<StyleAnalysisResult>> = {
      小红书同款: {
        core_elements: ["显瘦", "日常", "拍照好看"],
        key_items: ["白衬衫", "阔腿裤", "针织开衫"],
        color_palette: ["米白", "浅蓝", "卡其"],
        occasions: ["约会", "逛街", "拍照"],
      },
      法式慵懒: {
        core_elements: ["优雅", "随性", "浪漫"],
        key_items: ["条纹衫", "牛仔裤", "芭蕾舞鞋"],
        color_palette: ["海军蓝", "白色", "红色"],
        occasions: ["约会", "咖啡厅", "旅行"],
      },
      韩系: {
        core_elements: ["温柔", "甜美", "年轻"],
        key_items: ["针织背心", "百褶裙", "小白鞋"],
        color_palette: ["粉色", "米色", "浅蓝"],
        occasions: ["约会", "上学", "逛街"],
      },
    };

    const matchedData = styleData[quickMatch.style] || {};

    return {
      style_name: quickMatch.style,
      confidence: quickMatch.confidence,
      core_elements: matchedData.core_elements || ["日常", "舒适"],
      key_items: matchedData.key_items || ["T恤", "牛仔裤"],
      color_palette: matchedData.color_palette || ["白色", "蓝色"],
      patterns: ["纯色"],
      materials: ["棉", "牛仔"],
      occasions: matchedData.occasions || ["日常"],
      seasons: ["春", "秋"],
      body_type_suggestions: {},
      celebrity_references: [],
      brand_references: ["优衣库", "ZARA"],
      price_range: "100-500元",
      similar_styles: ["简约风", "休闲风"],
    };
  }

  private getFallbackSuggestions(userInput: string): StyleRecommendationResult {
    const analysis = this.getFallbackStyleAnalysis(userInput);

    return {
      style_analysis: analysis,
      outfit_suggestions: [
        {
          category: "tops",
          description: `${analysis.style_name}风格上衣`,
          style_tags: analysis.similar_styles,
          color_suggestions: analysis.color_palette.slice(0, 3),
          item_examples: analysis.key_items.slice(0, 2),
          pairing_tips: "选择合身版型，搭配高腰下装",
        },
        {
          category: "bottoms",
          description: `${analysis.style_name}风格下装`,
          style_tags: analysis.similar_styles,
          color_suggestions: analysis.color_palette.slice(0, 3),
          item_examples: ["阔腿裤", "A字裙"],
          pairing_tips: "高腰设计可以优化身材比例",
        },
      ],
      embedding_prompts: [],
      style_weights: {},
    };
  }

  private getFallbackRecommendations(
    userInput: string,
  ): FullRecommendationResult {
    return {
      style_analysis: this.getFallbackStyleAnalysis(userInput),
      recommendations: [],
      total: 0,
    };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}

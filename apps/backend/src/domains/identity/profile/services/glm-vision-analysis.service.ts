import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface BodyVisionResult {
  bodyType: string;
  bodyTypeName: string;
  description: string;
  recommendations: { category: string; advice: string; examples: string[] }[];
  idealStyles: string[];
  recommendStyles: string[];
}

export interface ColorVisionResult {
  colorSeason: string;
  colorSeasonName: string;
  bestColors: string[];
  neutralColors: string[];
  avoidColors: string[];
  metalPreference: string;
  skinTone: string;
  faceShape?: string;
}

@Injectable()
export class GlmVisionAnalysisService {
  private readonly logger = new Logger(GlmVisionAnalysisService.name);
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    const apiKey =
      this.configService.get<string>("GLM_API_KEY") ||
      this.configService.get<string>("ZHIPU_API_KEY");
    const endpoint =
      this.configService.get<string>("GLM_API_URL") || "https://open.bigmodel.cn/api/paas/v4";

    this.client = axios.create({
      baseURL: endpoint,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    this.logger.log("GLM Vision Analysis Service initialized");
  }

  async analyzeBodyType(imageBuffer: Buffer): Promise<BodyVisionResult> {
    const base64 = imageBuffer.toString("base64");

    const prompt = `你是一位专业的时尚造型师和体型分析专家。请根据用户提供的全身照片，进行体型分析。

请严格按照以下JSON格式返回分析结果（不要包含任何其他文字）：
{
  "bodyType": "rectangle | hourglass | triangle | inverted_triangle | oval 之一",
  "bodyTypeName": "体型中文名称",
  "description": "50字以内的体型特征描述",
  "recommendations": [
    {"category": "上衣", "advice": "穿搭建议", "examples": ["具体单品1", "具体单品2"]},
    {"category": "下装", "advice": "穿搭建议", "examples": ["具体单品1", "具体单品2"]},
    {"category": "外套", "advice": "穿搭建议", "examples": ["具体单品1", "具体单品2"]}
  ],
  "idealStyles": ["适合的风格1", "适合的风格2", "适合的风格3"],
  "recommendStyles": ["推荐的单品风格1", "推荐的单品风格2"]
}

体型判定标准：
- rectangle (H型): 肩腰臀宽度相近，身体线条平直
- hourglass (X型): 肩臀相近，腰部明显纤细
- triangle (A型): 臀部比肩宽，下半身较丰满
- inverted_triangle (Y型): 肩部比臀宽，上半身较丰满
- oval (O型): 腰部较粗，四肢相对纤细

请根据照片中人物的肩部、腰部、臀部比例关系进行判定。`;

    const response = await this.callVisionApi(base64, prompt);
    return this.parseBodyResult(response);
  }

  async analyzeColorSeason(imageBuffer: Buffer): Promise<ColorVisionResult> {
    const base64 = imageBuffer.toString("base64");

    const prompt = `你是一位专业的色彩分析师和形象顾问。请根据用户提供的面部/上半身照片，进行个人色彩季节分析。

请严格按照以下JSON格式返回分析结果（不要包含任何其他文字）：
{
  "colorSeason": "spring_warm | spring_light | summer_cool | summer_light | autumn_warm | autumn_deep | winter_cool | winter_deep 之一",
  "colorSeasonName": "季节型中文名称",
  "bestColors": ["最适合的颜色1", "颜色2", "颜色3", "颜色4", "颜色5"],
  "neutralColors": ["中性色1", "中性色2", "中性色3", "中性色4"],
  "avoidColors": ["应避免的颜色1", "颜色2", "颜色3"],
  "metalPreference": "金色或银色偏好及原因",
  "skinTone": "fair | light | medium | olive | tan | dark 之一",
  "faceShape": "oval | round | square | heart | oblong | diamond 之一"
}

色彩季节判定标准：
- spring_warm (暖春型): 暖肤色，偏黄/蜜桃底调，适合温暖明亮的颜色
- spring_light (浅春型): 浅暖肤色，适合柔和的暖色
- summer_cool (冷夏型): 冷肤色，偏粉/蓝底调，适合柔和冷色
- summer_light (浅夏型): 浅冷肤色，适合粉蜡色系
- autumn_warm (暖秋型): 暖深肤色，适合浓郁暖色
- autumn_deep (深秋型): 深暖肤色，适合深沉暖色
- winter_cool (冷冬型): 冷深肤色，适合鲜艳冷色和高对比度
- winter_deep (深冬型): 深冷肤色，适合纯度高、对比强烈的颜色

请根据照片中人物的肤色底调（暖/冷）、明度（深/浅）、对比度来判定。`;

    const response = await this.callVisionApi(base64, prompt);
    return this.parseColorResult(response);
  }

  private async callVisionApi(imageBase64: string, prompt: string): Promise<string> {
    const model = this.configService.get<string>("GLM_VISION_MODEL") || "glm-4v-plus";

    try {
      const { data } = await this.client.post("/chat/completions", {
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      });

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("GLM Vision API returned empty content");
      }

      return content;
    } catch (error) {
      this.logger.error(
        `GLM Vision API call failed: ${error instanceof Error ? error.message : "Unknown"}`
      );
      throw error;
    }
  }

  private parseBodyResult(raw: string): BodyVisionResult {
    const parsed = this.extractJson<BodyVisionResult>(raw);
    return {
      bodyType: parsed.bodyType || "rectangle",
      bodyTypeName: parsed.bodyTypeName || "矩形体型",
      description: parsed.description || "基于AI视觉分析的体型判断结果",
      recommendations: parsed.recommendations || [
        { category: "整体", advice: "建议选择有层次感的搭配", examples: ["V领衬衫", "修身外套"] },
      ],
      idealStyles: parsed.idealStyles || ["casual", "business"],
      recommendStyles: parsed.recommendStyles || ["structured_blazer", "v_neck_tops"],
    };
  }

  private parseColorResult(raw: string): ColorVisionResult {
    const parsed = this.extractJson<ColorVisionResult>(raw);
    return {
      colorSeason: parsed.colorSeason || "autumn_warm",
      colorSeasonName: parsed.colorSeasonName || "暖秋型",
      bestColors: parsed.bestColors || ["深棕色", "橄榄绿", "酒红色", "焦糖色", "芥末黄"],
      neutralColors: parsed.neutralColors || ["米白", "驼色", "深灰", "藏青"],
      avoidColors: parsed.avoidColors || ["荧光粉", "冰蓝", "亮紫色"],
      metalPreference: parsed.metalPreference || "金色",
      skinTone: parsed.skinTone || "medium",
      faceShape: parsed.faceShape,
    };
  }

  private extractJson<T>(text: string): T {
    // Try to find JSON in the response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        // Fall through to direct parse
      }
    }

    // Try direct parse
    try {
      return JSON.parse(text.trim()) as T;
    } catch {
      // Try to find JSON object in text
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        return JSON.parse(braceMatch[0]) as T;
      }
    }

    this.logger.warn("Failed to parse JSON from GLM response, using defaults");
    return {} as T;
  }
}

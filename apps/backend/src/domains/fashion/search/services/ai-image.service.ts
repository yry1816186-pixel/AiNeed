import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import { allowUnverifiedAiFallbacks } from "../../../../common/config/runtime-flags";
import { sanitizeImage } from "../../../../common/security/image-sanitizer";
import {
  type AliyunStyleItem,
  type AliyunAnalysisResponse,
  type BaiduAnalysisResponse,
  type OpenAIAnalysisContent,
} from "../types/search.types";

export interface ImageFeatures {
  colorHistogram: number[];
  dominantColors: string[];
  textureFeatures: number[];
  embedding?: number[];
}

export interface AIAnalysisResult {
  embedding: number[];
  labels: string[];
  colors: string[];
  style?: string;
  category?: string;
}

@Injectable()
export class AIImageService {
  private readonly logger = new Logger(AIImageService.name);
  private readonly provider?: string;
  private readonly allowFallbacks: boolean;
  private readonly localColorPalette: Array<{
    name: string;
    rgb: [number, number, number];
  }> = [
    { name: "黑色", rgb: [24, 24, 24] },
    { name: "白色", rgb: [242, 242, 242] },
    { name: "灰色", rgb: [145, 145, 145] },
    { name: "米色", rgb: [226, 212, 184] },
    { name: "卡其色", rgb: [188, 163, 115] },
    { name: "驼色", rgb: [181, 136, 99] },
    { name: "棕色", rgb: [112, 74, 45] },
    { name: "红色", rgb: [176, 48, 55] },
    { name: "粉色", rgb: [226, 152, 176] },
    { name: "橙色", rgb: [207, 118, 44] },
    { name: "黄色", rgb: [216, 179, 67] },
    { name: "绿色", rgb: [84, 128, 86] },
    { name: "蓝色", rgb: [59, 99, 167] },
    { name: "藏青色", rgb: [42, 58, 95] },
    { name: "紫色", rgb: [112, 82, 140] },
  ];

  constructor(private configService: ConfigService) {
    this.provider = this.configService.get<string>("AI_PROVIDER");
    this.allowFallbacks = allowUnverifiedAiFallbacks(this.configService);
  }

  async analyzeImage(imageBuffer: Buffer): Promise<AIAnalysisResult> {
    if (!this.provider) {
      this.logger.warn(
        "AI image analysis provider is not configured, using local heuristic analysis",
      );
      return this.analyzeLocally(imageBuffer);
    }

    switch (this.provider) {
      case "aliyun":
        return this.analyzeWithAliyun(imageBuffer);
      case "openai":
        return this.analyzeWithOpenAI(imageBuffer);
      case "baidu":
        return this.analyzeWithBaidu(imageBuffer);
      default:
        this.logger.warn(
          `Unsupported AI image analysis provider: ${this.provider}, using local heuristic analysis`,
        );
        return this.analyzeLocally(imageBuffer);
    }
  }

  private async analyzeWithAliyun(
    imageBuffer: Buffer,
  ): Promise<AIAnalysisResult> {
    try {
      const accessKeyId = this.configService.get("ALIYUN_ACCESS_KEY_ID");
      const accessKeySecret = this.configService.get(
        "ALIYUN_ACCESS_KEY_SECRET",
      );

      if (!accessKeyId || !accessKeySecret) {
        this.logger.error("Aliyun credentials are missing for image analysis");
        if (this.allowFallbacks) {
          return this.analyzeWithMock(imageBuffer);
        }
        throw new ServiceUnavailableException(
          "Aliyun image analysis credentials are not configured",
        );
      }

      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        "https://vision.cn-shanghai.aliyuncs.com/",
        {
          Action: "RecognizeImageStyle",
          ImageURL: `data:image/jpeg;base64,${base64Image}`,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          auth: {
            username: accessKeyId,
            password: accessKeySecret,
          },
        },
      );

      const data = response.data as AliyunAnalysisResponse;
      return {
        embedding: this.generateEmbeddingFromLabels(
          (data.Data?.Styles || [])
            .map((style) => style.Style)
            .filter(Boolean) as string[],
        ),
        labels:
          (data.Data?.Styles?.map((style) => style.Style).filter(
            Boolean,
          ) as string[]) || [],
        colors: this.extractColorsFromResponse(data),
        style: data.Data?.Styles?.[0]?.Style,
        category: this.inferCategory(data.Data?.Styles || []),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Aliyun AI analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.handleLocalFallback("Aliyun image analysis failed", imageBuffer);
    }
  }

  private async analyzeWithOpenAI(
    imageBuffer: Buffer,
  ): Promise<AIAnalysisResult> {
    try {
      const apiKey = this.configService.get("OPENAI_API_KEY");

      if (!apiKey) {
        this.logger.error("OpenAI API key is missing for image analysis");
        if (this.allowFallbacks) {
          return this.analyzeWithMock(imageBuffer);
        }
        throw new ServiceUnavailableException(
          "OpenAI image analysis key is not configured",
        );
      }

      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this clothing image and return a JSON with: style (one of: casual, formal, sporty, elegant, streetwear, vintage, minimalist, bohemian), colors (array of 2-3 dominant colors), category (one of: tops, bottoms, dresses, outerwear, accessories, shoes), and labels (array of 3-5 descriptive tags). Only return the JSON, no other text.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 200,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      const rawContent = response.data?.choices?.[0]?.message?.content;
      if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
        throw new Error("OpenAI returned an empty analysis payload");
      }

      const parsed = JSON.parse(rawContent) as OpenAIAnalysisContent;

      return {
        embedding: this.generateEmbeddingFromLabels(parsed.labels || []),
        labels: parsed.labels || [],
        colors: parsed.colors || [],
        style: parsed.style,
        category: parsed.category,
      };
    } catch (error: unknown) {
      this.logger.error(
        `OpenAI analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.handleLocalFallback("OpenAI image analysis failed", imageBuffer);
    }
  }

  private async analyzeWithBaidu(
    imageBuffer: Buffer,
  ): Promise<AIAnalysisResult> {
    try {
      const apiKey = this.configService.get("BAIDU_API_KEY");
      const secretKey = this.configService.get("BAIDU_SECRET_KEY");

      if (!apiKey || !secretKey) {
        this.logger.error("Baidu credentials are missing for image analysis");
        if (this.allowFallbacks) {
          return this.analyzeWithMock(imageBuffer);
        }
        throw new ServiceUnavailableException(
          "Baidu image analysis credentials are not configured",
        );
      }

      const tokenResponse = await axios.post(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      );

      const accessToken = tokenResponse.data.access_token;
      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        `https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general?access_token=${accessToken}`,
        `image=${encodeURIComponent(base64Image)}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const baiduData = response.data as BaiduAnalysisResponse;
      const results = baiduData.result || [];
      const labels = results
        .map((result) => result.keyword)
        .filter(Boolean)
        .slice(0, 5) as string[];

      return {
        embedding: this.generateEmbeddingFromLabels(labels),
        labels,
        colors: this.extractColorsFromBaiduResponse(baiduData),
        category: this.inferCategoryFromLabels(labels),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Baidu AI analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.handleLocalFallback("Baidu image analysis failed", imageBuffer);
    }
  }

  private async handleLocalFallback(
    message: string,
    imageBuffer: Buffer,
  ): Promise<AIAnalysisResult> {
    this.logger.warn(`${message}, falling back to local heuristic analysis`);

    try {
      return await this.analyzeLocally(imageBuffer);
    } catch (localError: unknown) {
      this.logger.error(
        `Local image analysis failed: ${localError instanceof Error ? localError.message : String(localError)}`,
      );

      if (this.allowFallbacks) {
        return this.analyzeWithMock(imageBuffer);
      }

      throw new ServiceUnavailableException(message);
    }
  }

  private async analyzeLocally(imageBuffer: Buffer): Promise<AIAnalysisResult> {
    const sharp = (await import("sharp")).default;
    const image = sanitizeImage(sharp(imageBuffer, { failOn: "none" })).rotate();
    const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);

    const width = metadata.width ?? 1;
    const height = metadata.height ?? 1;
    const aspectRatio = width / Math.max(height, 1);
    const dominant = stats.dominant;
    const meanRgb = [
      Math.round(stats.channels[0]?.mean ?? dominant.r ?? 0),
      Math.round(stats.channels[1]?.mean ?? dominant.g ?? 0),
      Math.round(stats.channels[2]?.mean ?? dominant.b ?? 0),
    ] as [number, number, number];
    const dominantRgb = [
      Math.round(dominant.r ?? meanRgb[0]),
      Math.round(dominant.g ?? meanRgb[1]),
      Math.round(dominant.b ?? meanRgb[2]),
    ] as [number, number, number];
    const shadowRgb = dominantRgb.map((channel) =>
      Math.max(0, Math.round(channel * 0.7)),
    ) as [number, number, number];
    const highlightRgb = dominantRgb.map((channel) =>
      Math.min(255, Math.round(channel * 1.18 + 12)),
    ) as [number, number, number];

    const brightness = this.calculateLuminance(dominantRgb);
    const saturation = this.calculateSaturation(dominantRgb);
    const contrast =
      ((stats.channels[0]?.stdev ?? 0) +
        (stats.channels[1]?.stdev ?? 0) +
        (stats.channels[2]?.stdev ?? 0)) /
      3;

    const colors = Array.from(
      new Set([
        this.mapRgbToColorName(dominantRgb),
        this.mapRgbToColorName(meanRgb),
        this.mapRgbToColorName(
          brightness < 95 ? highlightRgb : shadowRgb,
        ),
      ]),
    ).slice(0, 3);
    const style = this.inferLocalStyle({ brightness, saturation, contrast });
    const category = this.inferLocalCategory({ aspectRatio, brightness, saturation });
    const labels = this.buildLocalLabels({ style, colors, brightness, saturation });

    return {
      embedding: this.generateEmbeddingFromLabels(labels),
      labels,
      colors,
      style,
      category,
    };
  }

  private async analyzeWithMock(
    imageBuffer: Buffer,
  ): Promise<AIAnalysisResult> {
    const crypto = await import("crypto");
    const hash = crypto.createHash("md5").update(imageBuffer).digest("hex");
    const hashNum = parseInt(hash.substring(0, 8), 16);

    const styles = [
      "casual",
      "formal",
      "sporty",
      "elegant",
      "streetwear",
      "vintage",
      "minimalist",
      "bohemian",
    ];
    const categories = [
      "tops",
      "bottoms",
      "dresses",
      "outerwear",
      "accessories",
      "shoes",
    ];
    const colorPalette = [
      "black",
      "white",
      "gray",
      "navy",
      "blue",
      "red",
      "pink",
      "green",
      "brown",
      "beige",
    ];
    const labelSets = [
      ["comfortable", "everyday", "versatile"],
      ["elegant", "sophisticated", "classic"],
      ["trendy", "modern", "stylish"],
      ["casual", "relaxed", "laid-back"],
      ["formal", "professional", "business"],
    ];

    const labels = labelSets[hashNum % labelSets.length] ?? [];
    const primaryColor = colorPalette[hashNum % colorPalette.length] ?? "black";
    const secondaryColor =
      colorPalette[(hashNum + 3) % colorPalette.length] ?? primaryColor;
    const style = styles[hashNum % styles.length] ?? "casual";
    const category = categories[hashNum % categories.length] ?? "tops";

    return {
      embedding: this.generateEmbeddingFromHash(hashNum),
      labels,
      colors: [primaryColor, secondaryColor],
      style,
      category,
    };
  }

  private generateEmbeddingFromLabels(labels: string[]): number[] {
    const embedding: number[] = [];
    const seed = labels.reduce((acc, label) => {
      let hash = 0;
      for (let i = 0; i < label.length; i++) {
        hash = (hash << 5) - hash + label.charCodeAt(i);
        hash = hash & hash;
      }
      return acc + hash;
    }, 0);

    let current = Math.abs(seed);
    for (let i = 0; i < 512; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      embedding.push(((current % 2000) - 1000) / 1000);
    }

    return embedding;
  }

  private calculateLuminance([r, g, b]: [number, number, number]): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  private calculateSaturation([r, g, b]: [number, number, number]): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max === 0) {
      return 0;
    }

    return (max - min) / max;
  }

  private mapRgbToColorName(rgb: [number, number, number]): string {
    const initialBest = this.localColorPalette[0];
    if (!initialBest) {
      return "黑色";
    }

    let best = initialBest;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of this.localColorPalette) {
      const [cr, cg, cb] = candidate.rgb;
      const distance = Math.sqrt(
        Math.pow(rgb[0] - cr, 2) +
          Math.pow(rgb[1] - cg, 2) +
          Math.pow(rgb[2] - cb, 2),
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    return best.name;
  }

  private inferLocalStyle(input: {
    brightness: number;
    saturation: number;
    contrast: number;
  }): AIAnalysisResult["style"] {
    const { brightness, saturation, contrast } = input;

    if (saturation < 0.18 && contrast < 28) {
      return "minimalist";
    }

    if (brightness < 65 && contrast > 38) {
      return "streetwear";
    }

    if (saturation > 0.45 && brightness > 150) {
      return "sporty";
    }

    if (brightness > 165 && saturation < 0.25) {
      return "elegant";
    }

    if (contrast < 24) {
      return "formal";
    }

    return "casual";
  }

  private inferLocalCategory(input: {
    aspectRatio: number;
    brightness: number;
    saturation: number;
  }): AIAnalysisResult["category"] | undefined {
    const { aspectRatio, brightness, saturation } = input;

    if (aspectRatio > 1.25) {
      return "shoes";
    }

    if (aspectRatio < 0.72) {
      return brightness > 150 && saturation < 0.22 ? "dresses" : "outerwear";
    }

    if (aspectRatio < 0.95) {
      return "tops";
    }

    return undefined;
  }

  private buildLocalLabels(input: {
    style?: string;
    colors: string[];
    brightness: number;
    saturation: number;
  }): string[] {
    const labels = new Set<string>();
    const { style, colors, brightness, saturation } = input;

    if (style) {
      labels.add(style);
    }

    if (brightness < 80) {
      labels.add("dark-tone");
    } else if (brightness > 170) {
      labels.add("light-tone");
    } else {
      labels.add("mid-tone");
    }

    if (saturation < 0.2) {
      labels.add("low-saturation");
    } else if (saturation > 0.45) {
      labels.add("high-saturation");
    }

    for (const color of colors) {
      labels.add(color);
    }

    return Array.from(labels).slice(0, 6);
  }

  private generateEmbeddingFromHash(seed: number): number[] {
    const embedding: number[] = [];
    let current = seed;
    for (let i = 0; i < 512; i++) {
      current = (current * 1103515245 + 12345) % 2147483648;
      embedding.push(((current % 2000) - 1000) / 1000);
    }
    return embedding;
  }

  private extractColorsFromResponse(data: AliyunAnalysisResponse): string[] {
    if (data.Data?.Colors) {
      return data.Data.Colors.map((color) => color.ColorName).filter(
        Boolean,
      ) as string[];
    }
    return [];
  }

  private extractColorsFromBaiduResponse(data: BaiduAnalysisResponse): string[] {
    if (Array.isArray(data.color_result)) {
      return (
        data.color_result
          ?.map((color) => color.color_name)
          .filter(Boolean) || []
      ) as string[];
    }

    return [];
  }

  private inferCategory(styles: AliyunStyleItem[]): string {
    if (!styles || styles.length === 0) {return "tops";}
    const styleStr = styles
      .map((s) => s.Style || "")
      .join(" ")
      .toLowerCase();

    if (styleStr.includes("dress")) {return "dresses";}
    if (styleStr.includes("jacket") || styleStr.includes("coat"))
      {return "outerwear";}
    if (styleStr.includes("pants") || styleStr.includes("skirt"))
      {return "bottoms";}
    if (styleStr.includes("shoes") || styleStr.includes("boot")) {return "shoes";}
    if (styleStr.includes("bag") || styleStr.includes("accessory"))
      {return "accessories";}

    return "tops";
  }

  private inferCategoryFromLabels(labels: string[]): string {
    const labelStr = labels.join(" ").toLowerCase();

    if (labelStr.includes("dress")) {return "dresses";}
    if (labelStr.includes("jacket") || labelStr.includes("coat"))
      {return "outerwear";}
    if (
      labelStr.includes("pants") ||
      labelStr.includes("skirt") ||
      labelStr.includes("jeans")
    )
      {return "bottoms";}
    if (
      labelStr.includes("shoes") ||
      labelStr.includes("boot") ||
      labelStr.includes("sneaker")
    )
      {return "shoes";}
    if (
      labelStr.includes("bag") ||
      labelStr.includes("watch") ||
      labelStr.includes("accessory")
    )
      {return "accessories";}

    return "tops";
  }
}

import { mobileRuntimeConfig, requireMobileUrl } from "../../config/runtime";
import { OutfitRecommendationResult, SimilarItemResult } from "../../types/api";
import type { FormDataValue } from "../../types";

const AI_SERVICE_URL = requireMobileUrl(
  mobileRuntimeConfig.aiServiceUrl,
  "AI_SERVICE_URL",
);

/**
 * React Native FormData 文件条目类型
 * RN 的 FormData 不完全符合 Web 标准，需要此类型注解
 */
interface RNFileBody {
  uri: string;
  name: string;
  type: string;
}

class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_SERVICE_URL;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
      });
      return response.ok;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  async analyzeImage(imageUri: string): Promise<{
    category: string;
    style: string[];
    colors: string[];
    occasions: string[];
    seasons: string[];
    confidence: number;
  }> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as RNFileBody);

    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.status}`);
    }

    return response.json();
  }

  async analyzeBody(imageUri: string): Promise<{
    body_type: string;
    skin_tone: string;
    color_season: string;
    recommendations: {
      suitable: string[];
      avoid: string[];
      tips: string[];
    };
  }> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as RNFileBody);

    const response = await fetch(`${this.baseUrl}/api/body-analysis`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Body analysis failed: ${response.status}`);
    }

    return response.json();
  }

  async getColorRecommendations(colorSeason: string): Promise<{
    season: string;
    recommended: string[];
    neutral: string[];
    avoid: string[];
    palette: { name: string; hex: string }[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/colors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color_season: colorSeason }),
    });

    if (!response.ok) {
      throw new Error(`Color recommendations failed: ${response.status}`);
    }

    return response.json();
  }

  async findSimilar(
    imagePath: string,
    topK: number = 10,
  ): Promise<SimilarItemResult[]> {
    const response = await fetch(`${this.baseUrl}/api/similar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: imagePath, top_k: topK }),
    });

    if (!response.ok) {
      throw new Error(`Similar search failed: ${response.status}`);
    }

    return response.json();
  }

  async recommendOutfit(
    baseItemId: string,
    occasion?: string,
  ): Promise<OutfitRecommendationResult> {
    const response = await fetch(`${this.baseUrl}/api/outfit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_item_id: baseItemId, occasion }),
    });

    if (!response.ok) {
      throw new Error(`Outfit recommendation failed: ${response.status}`);
    }

    return response.json();
  }

  async getStats(): Promise<{
    total_items: number;
    total_outfits: number;
    categories: Record<string, number>;
    styles: Record<string, number>;
  }> {
    const response = await fetch(`${this.baseUrl}/api/stats`);

    if (!response.ok) {
      throw new Error(`Stats fetch failed: ${response.status}`);
    }

    return response.json();
  }

  async generateEmbedding(imageUri: string): Promise<number[]> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "image.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }
}

export const aiService = new AIService();
export default aiService;

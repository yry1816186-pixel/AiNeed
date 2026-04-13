import Constants from '@/src/polyfills/expo-constants';
import {
  ClothingCategory,
  ClothingStyle,
  Season,
  Occasion,
} from "../../types/clothing";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface CategorizationResult {
  category: ClothingCategory;
  subcategory?: string;
  style: ClothingStyle[];
  colors: string[];
  seasons: Season[];
  occasions: Occasion[];
  confidence: number;
  tags: string[];
  name?: string;
  brand?: string;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const CATEGORY_LIST: ClothingCategory[] = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
  "activewear",
  "formal",
  "underwear",
  "swimwear",
  "sleepwear",
  "other",
];

const STYLE_LIST: ClothingStyle[] = [
  "casual",
  "formal",
  "sporty",
  "bohemian",
  "streetwear",
  "minimalist",
  "vintage",
  "preppy",
  "chic",
  "business",
  "romantic",
  "edgy",
];

const SEASON_LIST: Season[] = ["spring", "summer", "fall", "winter", "all"];

const OCCASION_LIST: Occasion[] = [
  "everyday",
  "work",
  "date",
  "party",
  "wedding",
  "travel",
  "gym",
  "beach",
  "home",
  "formal_event",
];

declare const process: any;

class ClothingCategorizationService {
  private apiKey: string;

  constructor() {
    this.apiKey =
      Constants.expoConfig?.extra?.OPENAI_KEY ||
      (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_OPENAI_KEY : undefined) ||
      "";
  }

  async categorize(imageUri: string): Promise<CategorizationResult> {
    if (!this.apiKey) {
      console.warn(
        "OpenAI API key not configured, returning default categorization",
      );
      return this.getDefaultResult();
    }

    try {
      const base64Image = await this.imageToBase64(imageUri);

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a fashion expert. Analyze the clothing item in the image and return a JSON object with these fields:
- category: one of [${CATEGORY_LIST.join(", ")}]
- subcategory: optional string (e.g., "t-shirt", "jeans", "sneakers")
- style: array of styles from [${STYLE_LIST.join(", ")}]
- colors: array of dominant colors (hex codes preferred)
- seasons: array from [${SEASON_LIST.join(", ")}]
- occasions: array from [${OCCASION_LIST.join(", ")}]
- confidence: number 0-1
- tags: array of descriptive tags
- name: suggested item name
- brand: if visible/identifiable

Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this clothing item and categorize it.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);
      return {
        category: this.validateCategory(parsed.category),
        subcategory: parsed.subcategory,
        style: this.validateArray(parsed.style, STYLE_LIST) as ClothingStyle[],
        colors: parsed.colors || [],
        seasons: this.validateArray(parsed.seasons, SEASON_LIST) as Season[],
        occasions: this.validateArray(
          parsed.occasions,
          OCCASION_LIST,
        ) as Occasion[],
        confidence: parsed.confidence || 0.8,
        tags: parsed.tags || [],
        name: parsed.name,
        brand: parsed.brand,
      };
    } catch (error) {
      console.error("Categorization failed:", error);
      return this.getDefaultResult();
    }
  }

  private async imageToBase64(imageUri: string): Promise<string> {
    if (imageUri.startsWith("data:")) {
      return imageUri;
    }

    const response = await fetch(imageUri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private validateCategory(category: string): ClothingCategory {
    if (CATEGORY_LIST.includes(category as ClothingCategory)) {
      return category as ClothingCategory;
    }
    return "other";
  }

  private validateArray<T>(arr: unknown, validValues: T[]): T[] {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item): item is T => validValues.includes(item));
  }

  private getDefaultResult(): CategorizationResult {
    return {
      category: "other",
      style: ["casual"],
      colors: [],
      seasons: ["all"],
      occasions: ["everyday"],
      confidence: 0,
      tags: [],
    };
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }
}

export const clothingCategorizationService =
  new ClothingCategorizationService();
export default clothingCategorizationService;

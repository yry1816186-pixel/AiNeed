import { apiClient } from "../api/client";
import { ClothingCategory, ClothingStyle, Season, Occasion } from "../../types/clothing";

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

class ClothingCategorizationService {
  async categorize(imageUri: string): Promise<CategorizationResult> {
    try {
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type,
      } satisfies FormDataValue);

      formData.append(
        "validCategories",
        JSON.stringify(CATEGORY_LIST)
      );
      formData.append(
        "validStyles",
        JSON.stringify(STYLE_LIST)
      );
      formData.append(
        "validSeasons",
        JSON.stringify(SEASON_LIST)
      );
      formData.append(
        "validOccasions",
        JSON.stringify(OCCASION_LIST)
      );

      const response = await apiClient.upload<CategorizationResult>(
        "/ai/categorize",
        formData
      );

      if (!response.success || !response.data) {
        console.error("Categorization failed:", response.error);
        return this.getDefaultResult();
      }

      const parsed = response.data;
      return {
        category: this.validateCategory(parsed.category),
        subcategory: parsed.subcategory,
        style: this.validateArray(parsed.style, STYLE_LIST) as ClothingStyle[],
        colors: parsed.colors || [],
        seasons: this.validateArray(parsed.seasons, SEASON_LIST) as Season[],
        occasions: this.validateArray(parsed.occasions, OCCASION_LIST) as Occasion[],
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

  private validateCategory(category: string): ClothingCategory {
    if (CATEGORY_LIST.includes(category as ClothingCategory)) {
      return category as ClothingCategory;
    }
    return "other";
  }

  private validateArray<T>(arr: unknown, validValues: T[]): T[] {
    if (!Array.isArray(arr)) {
      return [];
    }
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
}

export const clothingCategorizationService = new ClothingCategorizationService();
export default clothingCategorizationService;

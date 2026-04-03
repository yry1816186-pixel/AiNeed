export type ClothingCategory =
  | "tops"
  | "bottoms"
  | "dresses"
  | "outerwear"
  | "shoes"
  | "accessories"
  | "activewear"
  | "formal"
  | "underwear"
  | "swimwear"
  | "sleepwear"
  | "other";

export type ClothingStyle =
  | "casual"
  | "formal"
  | "sporty"
  | "bohemian"
  | "streetwear"
  | "minimalist"
  | "vintage"
  | "preppy"
  | "chic"
  | "business"
  | "romantic"
  | "edgy";

export type Season = "spring" | "summer" | "fall" | "winter" | "all";

export type Occasion =
  | "everyday"
  | "work"
  | "date"
  | "party"
  | "wedding"
  | "travel"
  | "gym"
  | "beach"
  | "home"
  | "formal_event";

export interface ClothingItem {
  id: string;
  imageUri: string;
  thumbnailUri?: string;
  externalUrl?: string;
  externalId?: string;
  category: ClothingCategory;
  subcategory?: string;
  name?: string;
  brand?: string;
  size?: string;
  color: string;
  colorHex?: string;
  colors?: string[];
  style: ClothingStyle[];
  seasons: Season[];
  occasions: Occasion[];
  tags: string[];
  notes?: string;
  price?: number;
  purchaseDate?: string;
  wearCount: number;
  lastWorn?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClothingItemInput {
  imageUri: string;
  category?: ClothingCategory;
  subcategory?: string;
  name?: string;
  brand?: string;
  size?: string;
  color?: string;
  colorHex?: string;
  style?: ClothingStyle[];
  seasons?: Season[];
  occasions?: Occasion[];
  tags?: string[];
  notes?: string;
  price?: number;
}

export interface ClothingFilter {
  category?: ClothingCategory | null;
  seasons?: Season[];
  occasions?: Occasion[];
  styles?: ClothingStyle[];
  colors?: string[];
  isFavorite?: boolean;
  searchQuery?: string;
}

export interface ClothingSortOptions {
  field: "createdAt" | "updatedAt" | "wearCount" | "name";
  direction: "asc" | "desc";
}

export const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  tops: "上装",
  bottoms: "下装",
  dresses: "连衣裙",
  outerwear: "外套",
  shoes: "鞋履",
  accessories: "配饰",
  activewear: "运动装",
  formal: "正装",
  underwear: "内衣",
  swimwear: "泳装",
  sleepwear: "睡衣",
  other: "其他",
};

export const STYLE_LABELS: Record<ClothingStyle, string> = {
  casual: "休闲",
  formal: "正式",
  sporty: "运动",
  bohemian: "波西米亚",
  streetwear: "街头",
  minimalist: "极简",
  vintage: "复古",
  preppy: "学院风",
  chic: "时髦",
  business: "通勤",
  romantic: "浪漫",
  edgy: "先锋",
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: "春季",
  summer: "夏季",
  fall: "秋季",
  winter: "冬季",
  all: "四季",
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  everyday: "日常",
  work: "通勤",
  date: "约会",
  party: "派对",
  wedding: "婚礼",
  travel: "旅行",
  gym: "健身",
  beach: "海边",
  home: "居家",
  formal_event: "正式场合",
};

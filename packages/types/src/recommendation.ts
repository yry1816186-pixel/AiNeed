export interface StyleRecommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  items: RecommendedItem[];
  reason: string;
  score: number;
  createdAt: Date;
}

export enum RecommendationType {
  Daily = 'daily',
  Occasion = 'occasion',
  Seasonal = 'seasonal',
  Trending = 'trending',
}

export interface RecommendedItem {
  clothingItem?: import('./clothing').ClothingItem;
  score?: number;
  matchReasons?: string[];
  similarityScore?: number;
}

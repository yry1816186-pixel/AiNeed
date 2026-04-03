import { ClothingItem, ClothingCategory } from "./clothing";

export interface OutfitItem {
  clothingId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface Outfit {
  id: string;
  name: string;
  description?: string;
  items: OutfitItem[];
  thumbnailUri?: string;
  occasions: string[];
  seasons: string[];
  style?: string;
  rating: number;
  wearCount: number;
  lastWorn?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutfitInput {
  name: string;
  description?: string;
  items: OutfitItem[];
  occasions?: string[];
  seasons?: string[];
  style?: string;
}

export interface OutfitCanvasState {
  items: OutfitItem[];
  selectedItemId: string | null;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface OutfitSuggestion {
  baseItemId: string;
  suggestedItems: {
    itemId: string;
    category: ClothingCategory;
    reason: string;
    confidence: number;
  }[];
  occasion?: string;
  style?: string;
}

export interface OutfitTemplate {
  id: string;
  name: string;
  categories: ClothingCategory[];
  thumbnailUri: string;
  occasions: string[];
  seasons: string[];
}

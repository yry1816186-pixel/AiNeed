export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore?: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ClothingAnalysisResult {
  category: string;
  subcategory?: string;
  style: string[];
  colors: string[];
  occasions: string[];
  seasons: string[];
  confidence: number;
  tags: string[];
}

export interface SimilarItemResult {
  itemId: string;
  similarity: number;
  imageUri: string;
  category: string;
}

export interface OutfitRecommendationResult {
  outfitId: string;
  items: string[];
  score: number;
  occasion: string;
  style: string;
  reasons: string[];
}

export interface VirtualTryOnResult {
  id: string;
  originalImageUri: string;
  clothingImageUri: string;
  resultImageUri: string;
  createdAt: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  brands?: string[];
  inStock?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  imageUri: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  selected?: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

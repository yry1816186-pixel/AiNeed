// ============================================
// 共享 API 类型定义
// 前后端通用，确保类型一致性
// ============================================

// ============ 用户相关 ============
export interface User {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  bodyType?: BodyType;
  skinTone?: SkinTone;
  faceShape?: FaceShape;
  colorSeason?: ColorSeason;
  height?: number;
  weight?: number;
  stylePreferences?: StylePreference[];
  colorPreferences?: string[];
  createdAt: string;
  updatedAt: string;
}

export type BodyType = 'rectangle' | 'triangle' | 'inverted_triangle' | 'hourglass' | 'oval';
export type SkinTone = 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'dark';
export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond';
export type ColorSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface StylePreference {
  name: string;
  weight: number;
}

// ============ 商品相关 ============
export interface ClothingItem {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  colors: string[];
  sizes: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  tags: string[];
  stock: number;
  isActive: boolean;
  viewCount: number;
  likeCount: number;
  brand?: Brand;
  brandId: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'accessories'
  | 'shoes'
  | 'bags'
  | 'jewelry';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  website?: string;
  category?: string;
  style?: string[];
  priceRange?: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  followerCount: number;
  verified: boolean;
  createdAt: string;
}

// ============ 会员订阅相关 ============
export interface MembershipPlan {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  originalPrice?: number;
  currency: string;
  duration: number;
  features: Record<string, PlanFeature>;
  description?: string;
  isRecommended?: boolean;
  isActive: boolean;
}

export interface PlanFeature {
  limit: number | boolean;
  used?: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan?: MembershipPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  usage: Record<string, UsageInfo>;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface UsageInfo {
  limit: number;
  used: number;
}

// ============ 通知相关 ============
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'try_on_complete'
  | 'recommendation'
  | 'price_drop'
  | 'customization_update'
  | 'system'
  | 'subscription'
  | 'social'
  | 'order';

// ============ 试衣相关 ============
export interface VirtualTryOn {
  id: string;
  userId: string;
  photoId: string;
  itemId: string;
  status: TryOnStatus;
  resultImageUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  photo?: Photo;
  item?: ClothingItem;
}

export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Photo {
  id: string;
  userId: string;
  type: PhotoType;
  url: string;
  thumbnailUrl?: string;
  analysisResult?: AnalysisResult;
  analysisStatus: AnalysisStatus;
  createdAt: string;
}

export type PhotoType = 'full_body' | 'upper_body' | 'face' | 'other';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisResult {
  bodyType?: BodyType;
  skinTone?: SkinTone;
  faceShape?: FaceShape;
  colorSeason?: ColorSeason;
  confidence: number;
  rawResult?: Record<string, unknown>;
}

// ============ 收藏相关 ============
export interface Favorite {
  id: string;
  userId: string;
  itemId: string;
  folderId?: string;
  item: ClothingItem;
  createdAt: string;
}

export interface FavoriteFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  itemCount: number;
  createdAt: string;
}

// ============ 订单相关 ============
export interface Order {
  id: string;
  userId: string;
  orderNo: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  finalAmount: number;
  shippingAddress: ShippingAddress;
  paymentMethod?: string;
  paymentTime?: string;
  shipTime?: string;
  receiveTime?: string;
  expressCompany?: string;
  expressNo?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

// ============ AI 造型师相关 ============
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  timestamp: string;
  isFallback?: boolean;
  error?: string;
}

// ============ 商家相关 ============
export interface MerchantDashboard {
  overview: {
    totalProducts: number;
    totalViews: number;
    totalTryOns: number;
    totalFavorites: number;
  };
  sales: {
    totalViews: number;
    totalAddToCart: number;
    totalFavorites: number;
    totalTryOns: number;
    conversionRate: string;
    period: DateRange;
  };
  topProducts: MerchantProduct[];
}

export interface MerchantProduct {
  id: string;
  name: string;
  price: number;
  viewCount: number;
  likeCount: number;
  tryOnCount: number;
  images: string[];
  category: string;
}

export interface MerchantAudience {
  totalUsers: number;
  bodyTypeDistribution: Record<string, number>;
  colorSeasonDistribution: Record<string, number>;
  stylePreferences: Record<string, number>;
}

export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// ============ API 响应包装 ============
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

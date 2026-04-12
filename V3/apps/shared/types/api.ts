import type {
  Gender,
  BodyType,
  ColorSeason,
  BudgetRange,
  ProductType,
  Material,
  DesignStatus,
  InteractionType,
  MessageType,
  ClothingSlot,
} from './enums';
import type {
  User,
  UserProfile,
  Category,
  Brand,
  ClothingItem,
  Outfit,
  OutfitItem,
  ChatSession,
  ChatMessage,
  WardrobeItem,
  Favorite,
  CommunityPost,
  PostComment,
  Notification,
  AvatarTemplate,
  UserAvatar,
  CustomDesign,
  CustomOrder,
  ProductTemplate,
  BespokeStudio,
  BespokeOrder,
  BespokeMessage,
  BespokeQuote,
  BespokeReview,
  OutfitImage,
  DesignReport,
  ShippingAddress,
} from './models';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface SendCodeDto {
  phone: string;
}

export interface VerifyCodeDto {
  phone: string;
  code: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UpdateProfileDto {
  nickname?: string;
  avatarUrl?: string;
  gender?: Gender;
  birthYear?: number;
  height?: number;
  weight?: number;
  bodyType?: BodyType;
  colorSeason?: ColorSeason;
  language?: string;
}

export interface UpdatePreferencesDto {
  styleTags?: string[];
  occasionTags?: string[];
  colorPreferences?: string[];
  budgetRange?: BudgetRange;
}

export interface UpdateBodyProfileDto {
  bodyType?: BodyType;
  colorSeason?: ColorSeason;
  measurements?: Record<string, number>;
  sourceImageUrl?: string;
}

export interface CreateClothingDto {
  brandId?: string;
  categoryId?: string;
  name: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  currency?: string;
  gender?: Gender;
  seasons?: string[];
  occasions?: string[];
  styleTags?: string[];
  colors?: string[];
  materials?: string[];
  fitType?: string;
  imageUrls?: string[];
  sourceUrl?: string;
  purchaseUrl?: string;
  sourceName?: string;
}

export interface ClothingQueryDto extends PaginationDto {
  categoryId?: string;
  brandId?: string;
  gender?: Gender;
  season?: string;
  occasion?: string;
  styleTag?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateSessionDto {
  title?: string;
  context?: Record<string, unknown>;
}

export interface SendMessageDto {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAvatarDto {
  templateId: string;
  avatarParams: Record<string, unknown>;
}

export interface UpdateAvatarDto {
  avatarParams?: Record<string, unknown>;
  clothingMap?: Record<string, unknown>;
  thumbnailUrl?: string;
}

export interface DressAvatarDto {
  clothingMap: Record<string, { color: string; type: string; pattern?: string }>;
}

export interface CreateDesignDto {
  name: string;
  designData: Record<string, unknown>;
  patternImageUrl?: string;
  previewImageUrl?: string;
  productType: ProductType;
  productTemplateId?: string;
  isPublic?: boolean;
  price?: number;
  tags?: string[];
}

export interface UpdateDesignDto {
  name?: string;
  designData?: Record<string, unknown>;
  patternImageUrl?: string;
  previewImageUrl?: string;
  isPublic?: boolean;
  price?: number;
  tags?: string[];
  status?: DesignStatus;
}

export interface DesignQueryDto extends PaginationDto {
  productType?: ProductType;
  status?: DesignStatus;
  isPublic?: boolean;
}

export interface CreateCustomOrderDto {
  designId: string;
  material: Material;
  size: string;
  quantity?: number;
  shippingAddress: ShippingAddress;
}

export interface CreateOutfitDto {
  name?: string;
  description?: string;
  occasion?: string;
  season?: string;
  styleTags?: string[];
  isPublic?: boolean;
}

export interface UpdateOutfitDto {
  name?: string;
  description?: string;
  occasion?: string;
  season?: string;
  styleTags?: string[];
  isPublic?: boolean;
}

export interface AddOutfitItemDto {
  clothingId: string;
  slot: ClothingSlot;
  sortOrder?: number;
}

export interface AddToWardrobeDto {
  clothingId?: string;
  customName?: string;
  imageUrl?: string;
  category?: string;
  color?: string;
  brand?: string;
  notes?: string;
}

export interface UpdateWardrobeItemDto {
  customName?: string;
  imageUrl?: string;
  category?: string;
  color?: string;
  brand?: string;
  notes?: string;
}

export interface CreateFavoriteDto {
  targetType: string;
  targetId: string;
}

export interface CreatePostDto {
  title?: string;
  content: string;
  imageUrls?: string[];
  tags?: string[];
  outfitId?: string;
}

export interface CreateCommentDto {
  content: string;
  parentId?: string;
}

export interface CreateRoomDto {
  userIds: string[];
}

export interface SendMessageRoomDto {
  content: string;
  messageType?: MessageType;
}

export interface CreateBespokeOrderDto {
  studioId: string;
  title?: string;
  description: string;
  referenceImages?: string[];
  budgetRange?: string;
  deadline?: string;
  measurements?: Record<string, unknown>;
  assignedStylistId?: string;
}

export interface CreateBespokeStudioDto {
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  city?: string;
  address?: string;
  specialties?: string[];
  serviceTypes?: string[];
  priceRange?: string;
  portfolioImages?: string[];
}

export interface UpdateBespokeStudioDto {
  name?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  city?: string;
  address?: string;
  specialties?: string[];
  serviceTypes?: string[];
  priceRange?: string;
  portfolioImages?: string[];
}

export interface CreateBespokeQuoteDto {
  totalPrice: number;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  estimatedDays?: number;
  validUntil?: string;
  notes?: string;
}

export interface CreateBespokeReviewDto {
  rating: number;
  content?: string;
  images?: string[];
  isAnonymous?: boolean;
}

export interface ReportDesignDto {
  reason: string;
  description?: string;
}

export interface GenerateOutfitImageDto {
  outfitData: Record<string, unknown>;
  prompt?: string;
}

export interface OutfitImageQueryDto extends PaginationDto {
  status?: string;
}

export interface RecordInteractionDto {
  clothingId: string;
  interactionType: InteractionType;
  durationMs?: number;
  context?: Record<string, unknown>;
}

export interface AnalyzeBodyDto {
  imageUrl: string;
}

export interface SearchQueryDto extends PaginationDto {
  q: string;
  type?: 'clothing' | 'post' | 'design' | 'all';
  searchType?: 'text' | 'semantic' | 'hybrid';
  categoryId?: string;
  gender?: Gender;
  minPrice?: number;
  maxPrice?: number;
  styleTag?: string;
  color?: string;
}

export interface CreateCategoryDto {
  name: string;
  nameEn?: string;
  slug: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  nameEn?: string;
  slug?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface CreateBrandDto {
  name: string;
  logoUrl?: string;
  description?: string;
}

export interface UpdateBrandDto {
  name?: string;
  logoUrl?: string;
  description?: string;
}

export interface CreateStyleRuleDto {
  category: string;
  ruleType: string;
  condition: Record<string, unknown>;
  recommendation: string;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateStyleRuleDto {
  category?: string;
  ruleType?: string;
  condition?: Record<string, unknown>;
  recommendation?: string;
  priority?: number;
  isActive?: boolean;
}

export interface CreateProductTemplateDto {
  productType: ProductType;
  material: Material;
  baseCost: number;
  suggestedPrice: number;
  uvMapUrl: string;
  previewModelUrl?: string;
  availableSizes: string[];
  printArea: { x: number; y: number; width: number; height: number };
  podProvider?: string;
  podProductId?: string;
}

export interface UpdateProductTemplateDto {
  productType?: ProductType;
  material?: Material;
  baseCost?: number;
  suggestedPrice?: number;
  uvMapUrl?: string;
  previewModelUrl?: string;
  availableSizes?: string[];
  printArea?: { x: number; y: number; width: number; height: number };
  podProvider?: string;
  podProductId?: string;
  isActive?: boolean;
}

export interface RecommendationQueryDto extends PaginationDto {
  occasion?: string;
  styleTag?: string;
  budgetRange?: BudgetRange;
  season?: string;
}

export interface QueryRulesDto {
  category?: string;
  ruleType?: string;
}

export interface EmbedTextDto {
  text: string;
  model?: string;
}

export interface EmbedBatchDto {
  texts: string[];
  model?: string;
}

export interface SearchSimilarDto {
  vector: number[];
  limit?: number;
  threshold?: number;
  filter?: Record<string, unknown>;
}

export interface BatchIndexDto {
  collection: string;
  ids?: string[];
}

export type UserResponse = Omit<User, 'passwordHash'>;
export type UserProfileResponse = UserProfile;
export type ClothingItemResponse = ClothingItem;
export type OutfitResponse = Outfit & { items?: OutfitItem[] };
export type ChatSessionResponse = ChatSession;
export type ChatMessageResponse = ChatMessage;
export type WardrobeItemResponse = WardrobeItem;
export type CommunityPostResponse = CommunityPost & {
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl'>;
};
export type PostCommentResponse = PostComment & {
  user?: Pick<User, 'id' | 'nickname' | 'avatarUrl'>;
};
export type NotificationResponse = Notification;
export type AvatarTemplateResponse = AvatarTemplate;
export type UserAvatarResponse = UserAvatar;
export type CustomDesignResponse = CustomDesign;
export type CustomOrderResponse = CustomOrder;
export type ProductTemplateResponse = ProductTemplate;
export type BespokeStudioResponse = BespokeStudio;
export type BespokeOrderResponse = BespokeOrder;
export type BespokeMessageResponse = BespokeMessage;
export type BespokeQuoteResponse = BespokeQuote;
export type BespokeReviewResponse = BespokeReview;
export type OutfitImageResponse = OutfitImage;
export type FavoriteResponse = Favorite;
export type CategoryResponse = Category;
export type BrandResponse = Brand;
export type StyleRuleResponse = import('./models').StyleRule;
export type DesignReportResponse = DesignReport;

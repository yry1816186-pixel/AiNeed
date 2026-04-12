import type {
  Gender,
  BodyType,
  ColorSeason,
  ClothingSlot,
  InteractionType,
  OrderStatus,
  BespokeOrderStatus,
  PostStatus,
  DesignStatus,
  NotificationType,
  ProductType,
  Material,
  TryOnStatus,
  OutfitImageStatus,
  MessageType,
  BespokeQuoteStatus,
  DesignReportStatus,
  UserRole,
} from './enums';

export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  passwordHash: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  gender: Gender | null;
  birthYear: number | null;
  height: number | null;
  weight: number | null;
  bodyType: BodyType | null;
  colorSeason: ColorSeason | null;
  role: UserRole;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  gender: Gender | null;
  height: number | null;
  weight: number | null;
  bodyType: BodyType | null;
  colorSeason: ColorSeason | null;
  role: UserRole;
  language: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  styleTags: string[];
  occasionTags: string[];
  colorPreferences: string[];
  budgetRange: string | null;
  createdAt: string;
}

export interface BodyProfile {
  id: string;
  userId: string;
  bodyType: BodyType | null;
  colorSeason: ColorSeason | null;
  measurements: Record<string, unknown> | null;
  analysisResult: BodyAnalysisResult | null;
  sourceImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BodyAnalysisResult {
  bodyType: string;
  colorSeason: string;
  measurements: Record<string, number>;
  confidence: number;
  recommendations: string[];
}

export interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
}

export interface ClothingItem {
  id: string;
  brandId: string | null;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: string;
  gender: Gender | null;
  seasons: string[];
  occasions: string[];
  styleTags: string[];
  colors: string[];
  materials: string[];
  fitType: string | null;
  imageUrls: string[];
  sourceUrl: string | null;
  purchaseUrl: string | null;
  sourceName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Outfit {
  id: string;
  userId: string | null;
  name: string | null;
  description: string | null;
  occasion: string | null;
  season: string | null;
  styleTags: string[];
  isPublic: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface OutfitItem {
  id: string;
  outfitId: string;
  clothingId: string;
  slot: ClothingSlot;
  sortOrder: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  context: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface TryonResult {
  id: string;
  userId: string;
  clothingId: string;
  sourceImageUrl: string;
  resultImageUrl: string | null;
  provider: string | null;
  status: TryOnStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UserInteraction {
  id: string;
  userId: string;
  clothingId: string;
  interactionType: InteractionType;
  durationMs: number | null;
  context: Record<string, unknown> | null;
  createdAt: string;
}

export interface WardrobeItem {
  id: string;
  userId: string;
  clothingId: string | null;
  customName: string | null;
  imageUrl: string | null;
  category: string | null;
  color: string | null;
  brand: string | null;
  notes: string | null;
  addedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

export interface StyleRule {
  id: string;
  category: string;
  ruleType: string;
  condition: Record<string, unknown>;
  recommendation: string;
  priority: number;
  isActive: boolean;
}

export interface CommunityPost {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  imageUrls: string[];
  tags: string[];
  outfitId: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isFeatured: boolean;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  likesCount: number;
  createdAt: string;
}

export interface UserFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  createdAt: string;
}

export interface ChatRoomParticipant {
  roomId: string;
  userId: string;
  joinedAt: string;
}

export interface DirectMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string | null;
  content: string | null;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AvatarTemplate {
  id: string;
  name: string;
  gender: Gender;
  thumbnailUrl: string | null;
  drawingConfig: Record<string, unknown>;
  parameters: AvatarParameterDefs;
  defaultClothingMap: Record<string, ClothingMapEntry> | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AvatarParameterDefs {
  faceShape: { min: number; max: number; default: number; label: string };
  eyeShape: { options: string[]; default: string; label: string };
  skinTone: { options: string[]; default: string; label: string };
  hairStyle: { options: Array<{ id: string; name: string; thumbnailUrl: string }>; default: string };
  hairColor: { options: string[]; default: string };
}

export interface ClothingMapEntry {
  color: string;
  type: string;
  pattern?: string;
}

export interface UserAvatar {
  id: string;
  userId: string;
  templateId: string;
  avatarParams: Record<string, unknown>;
  clothingMap: Record<string, ClothingMapEntry> | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomDesign {
  id: string;
  userId: string;
  name: string;
  designData: DesignData;
  patternImageUrl: string | null;
  previewImageUrl: string | null;
  productType: ProductType;
  productTemplateId: string | null;
  isPublic: boolean;
  price: number | null;
  likesCount: number;
  purchasesCount: number;
  downloadsCount: number;
  tags: string[];
  status: DesignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DesignData {
  patternId?: string;
  patternUrl?: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  tileMode: 'none' | 'repeat' | 'mirror';
  opacity: number;
  filters?: { brightness?: number; contrast?: number; hue?: number };
}

export interface CustomOrder {
  id: string;
  userId: string;
  designId: string;
  productType: ProductType;
  material: Material;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderStatus;
  podOrderId: string | null;
  trackingNumber: string | null;
  shippingAddress: ShippingAddress;
  paymentInfo: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode?: string;
}

export interface ProductTemplate {
  id: string;
  productType: ProductType;
  material: Material;
  baseCost: number;
  suggestedPrice: number;
  uvMapUrl: string;
  previewModelUrl: string | null;
  availableSizes: string[];
  printArea: { x: number; y: number; width: number; height: number };
  podProvider: string | null;
  podProductId: string | null;
  isActive: boolean;
}

export interface DesignLike {
  userId: string;
  designId: string;
  createdAt: string;
}

export interface DesignReport {
  id: string;
  reporterId: string;
  designId: string;
  reason: string;
  description: string | null;
  reviewResult: Record<string, unknown> | null;
  status: DesignReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface BespokeStudio {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  description: string | null;
  city: string | null;
  address: string | null;
  specialties: string[];
  serviceTypes: string[];
  priceRange: string | null;
  portfolioImages: string[];
  rating: number;
  reviewCount: number;
  orderCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BespokeOrder {
  id: string;
  userId: string;
  studioId: string;
  status: BespokeOrderStatus;
  title: string | null;
  description: string;
  referenceImages: string[];
  budgetRange: string | null;
  deadline: string | null;
  measurements: Record<string, unknown> | null;
  assignedStylistId: string | null;
  statusHistory: Array<{ status: string; at: string; by: string; note?: string }>;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BespokeMessage {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

export interface BespokeQuote {
  id: string;
  orderId: string;
  studioId: string;
  totalPrice: number;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  estimatedDays: number | null;
  validUntil: string | null;
  notes: string | null;
  status: BespokeQuoteStatus;
  createdAt: string;
}

export interface BespokeReview {
  id: string;
  orderId: string;
  userId: string;
  studioId: string;
  rating: number;
  content: string | null;
  images: string[];
  isAnonymous: boolean;
  createdAt: string;
}

export interface OutfitImage {
  id: string;
  userId: string;
  outfitData: Record<string, unknown>;
  prompt: string | null;
  imageUrl: string | null;
  status: OutfitImageStatus;
  cost: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PreReviewDetail {
  result: PreReviewResult;
  phashDuplicate: boolean;
  semanticSimilars: Array<{
    designId: string;
    similarity: number;
    reason: string;
  }>;
  ipMatches: Array<{
    ipName: string;
    similarity: number;
    category: string;
  }>;
  llmVerdict?: {
    isCopycat: boolean;
    confidence: number;
    reason: string;
  };
  reviewedBy?: string;
  reviewedAt?: string;
}

export type PreReviewResult = 'pass' | 'flag' | 'reject';

export interface SearchResult {
  items: Array<ClothingItem | CommunityPost | CustomDesign>;
  total: number;
  page: number;
  limit: number;
  query: string;
  searchType: 'text' | 'semantic' | 'hybrid';
}

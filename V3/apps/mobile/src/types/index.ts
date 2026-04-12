export interface User {
  id: string;
  phone?: string;
  email?: string;
  nickname?: string;
  avatarUrl?: string;
  gender?: string;
  height?: number;
  weight?: number;
  bodyType?: string;
  colorSeason?: string;
  role?: string;
  language?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string };
  meta?: { total?: number; page?: number; limit?: number };
}

export interface LoginPayload {
  phone: string;
  code: string;
}

export interface SendCodePayload {
  phone: string;
}

export type StylistOccasion = 'work' | 'date' | 'sport' | 'casual' | 'party' | 'campus';

export type StylistBudget = 'under100' | 'under200' | 'over500';

export type StylistStyleTag = 'minimal' | 'korean' | 'guochao' | 'japanese' | 'western' | 'neoChinese';

export interface StylistSession {
  id: string;
  userId: string;
  title?: string;
  context?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StylistMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: StylistMessageMetadata;
  createdAt: string;
}

export interface StylistMessageMetadata {
  outfits?: StylistOutfit[];
  outfitImage?: StylistOutfitImage;
  [key: string]: unknown;
}

export interface StylistOutfit {
  id: string;
  name: string;
  description?: string;
  occasion?: string;
  season?: string;
  styleTags: string[];
  items: StylistOutfitItem[];
  styleDescription?: string;
}

export interface StylistOutfitItem {
  id: string;
  clothingId: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  slot: string;
  reason: string;
  purchaseUrl?: string;
}

export interface StylistOutfitImage {
  id: string;
  imageUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt?: string;
}

export interface CreateSessionPayload {
  occasion?: StylistOccasion;
  budget?: StylistBudget;
  styleTags?: StylistStyleTag[];
}

export interface SendMessagePayload {
  content: string;
}

export type SseEventType = 'text' | 'outfit' | 'done' | 'error';

export interface SseEvent {
  type: SseEventType;
  data: string;
}

export const OCCASION_LABELS: Record<StylistOccasion, string> = {
  work: '工作',
  date: '约会',
  sport: '运动',
  casual: '休闲',
  party: '聚会',
  campus: '校园',
};

export const OCCASION_ICONS: Record<StylistOccasion, string> = {
  work: '💼',
  date: '💕',
  sport: '🏃',
  casual: '☕',
  party: '🎉',
  campus: '📚',
};

export const BUDGET_LABELS: Record<StylistBudget, string> = {
  under100: '100内',
  under200: '200内',
  over500: '500+',
};

export const STYLE_TAG_LABELS: Record<StylistStyleTag, string> = {
  minimal: '简约',
  korean: '韩系',
  guochao: '国潮',
  japanese: '日系',
  western: '欧美',
  neoChinese: '新中式',
};

export interface SocialUser {
  id: string;
  nickname?: string;
  avatarUrl?: string;
}

export interface FollowItem {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  user?: SocialUser;
}

export interface FollowToggleResult {
  isFollowing: boolean;
}

export interface FollowStatus {
  isFollowing: boolean;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  title?: string;
  content: string;
  imageUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isFeatured: boolean;
  createdAt: string;
  user?: SocialUser;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'system' | 'order_status' | 'tryon_complete';

export type NotificationReferenceType = 'post' | 'comment' | 'user' | 'order' | 'custom_order' | 'bespoke_order' | 'tryon' | 'outfit' | 'design';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title?: string;
  content?: string;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  system: '🔔',
  order_status: '📦',
  tryon_complete: '👗',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  like: '点赞',
  comment: '评论',
  follow: '关注',
  system: '系统通知',
  order_status: '订单状态',
  tryon_complete: '试衣完成',
};

export type BespokeOrderStatus =
  | 'submitted'
  | 'quoted'
  | 'paid'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type BespokeQuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export type BespokeMessageType = 'text' | 'image' | 'file';

export interface BespokeStudio {
  id: string;
  name: string;
  logoUrl?: string;
  city?: string;
  specialties?: string[];
  rating?: number;
}

export interface BespokeOrder {
  id: string;
  userId: string;
  studioId: string;
  status: BespokeOrderStatus;
  title?: string;
  description: string;
  referenceImages: string[];
  budgetRange?: string;
  deadline?: string;
  measurements?: Record<string, number>;
  assignedStylistId?: string;
  statusHistory: Array<{
    status: string;
    at: string;
    by: string;
    note?: string;
  }>;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  studio?: BespokeStudio;
}

export interface BespokeMessage {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  messageType: BespokeMessageType;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; nickname?: string; avatarUrl?: string };
}

export interface BespokeQuoteItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface BespokeQuote {
  id: string;
  orderId: string;
  studioId: string;
  totalPrice: number;
  items: BespokeQuoteItem[];
  estimatedDays?: number;
  validUntil?: string;
  notes?: string;
  status: BespokeQuoteStatus;
  createdAt: string;
}

export interface BespokeReview {
  id: string;
  orderId: string;
  userId: string;
  studioId: string;
  rating: number;
  content?: string;
  images?: string[];
  isAnonymous: boolean;
  createdAt: string;
}

export interface CreateBespokeOrderPayload {
  studioId: string;
  title?: string;
  description: string;
  referenceImages?: string[];
  budgetRange?: string;
  deadline?: string;
  measurements?: Record<string, number>;
}

export interface SendBespokeMessagePayload {
  content: string;
  messageType?: BespokeMessageType;
  attachments?: string[];
}

export interface CreateBespokeQuotePayload {
  totalPrice: number;
  items: BespokeQuoteItem[];
  estimatedDays?: number;
  validUntil?: string;
  notes?: string;
}

export interface CreateBespokeReviewPayload {
  rating: number;
  content?: string;
  images?: string[];
  isAnonymous?: boolean;
}

export const BESPOKE_ORDER_STATUS_LABELS: Record<BespokeOrderStatus, string> = {
  submitted: '已提交',
  quoted: '已报价',
  paid: '已支付',
  in_progress: '制作中',
  completed: '已完成',
  cancelled: '已取消',
};

export const BESPOKE_ORDER_STATUS_COLORS: Record<BespokeOrderStatus, string> = {
  submitted: '#FF9800',
  quoted: '#2196F3',
  paid: '#4CAF50',
  in_progress: '#9C27B0',
  completed: '#4CAF50',
  cancelled: '#F44336',
};

export const BUDGET_RANGE_OPTIONS = [
  { value: '1000-3000', label: '¥1,000 - ¥3,000' },
  { value: '3000-8000', label: '¥3,000 - ¥8,000' },
  { value: '8000-20000', label: '¥8,000 - ¥20,000' },
  { value: '20000+', label: '¥20,000+' },
] as const;

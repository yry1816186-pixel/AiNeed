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

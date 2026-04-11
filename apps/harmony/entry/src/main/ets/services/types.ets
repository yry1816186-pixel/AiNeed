/**
 * AI 造型师相关类型定义
 * 注意：ArkTS 是 TypeScript 的子集，需要遵循特定语法规范
 */

// AI 造型师动作类型
export type AiStylistActionType =
  | 'ask_question'
  | 'show_preference_buttons'
  | 'request_photo_upload'
  | 'poll_analysis'
  | 'confirm_preferences'
  | 'generate_outfit'
  | 'show_outfit_cards';

// AI 造型师动作
export interface AiStylistAction {
  type: AiStylistActionType;
  field?: string;
  options?: string[];
  canSkip?: boolean;
  photoType?: string; // 'front' | 'side' | 'full_body' | 'half_body' | 'face'
}

// 用户偏好槽位
export interface AiStylistSlots {
  occasion?: string;
  weather?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredStyles: string[];
  styleAvoidances: string[];
  fitGoals: string[];
  preferredColors: string[];
}

// 身材档案
export interface AiStylistBodyProfile {
  bodyType?: string;
  skinTone?: string;
  faceShape?: string;
  colorSeason?: string;
  height?: number;
  weight?: number;
  shapeFeatures: string[];
}

// 会话状态
export interface AiStylistSessionState {
  sceneReady: boolean;
  bodyReady: boolean;
  styleReady: boolean;
  candidateReady: boolean;
  commerceReady: boolean;
  currentStage: string;
  slots: AiStylistSlots;
  bodyProfile: AiStylistBodyProfile;
  lastPhotoId?: string;
  lastPhotoStatus?: string;
  photoRequested?: boolean;
  photoSkipped?: boolean;
}

// 穿搭单品
export interface AiStylistOutfitItem {
  itemId?: string;
  category: string;
  name: string;
  reason: string;
  imageUrl?: string;
  externalUrl?: string;
  price?: number;
  brand?: string;
  score?: number;
}

// 穿搭方案
export interface AiStylistOutfitPlan {
  title: string;
  items: AiStylistOutfitItem[];
  styleExplanation: string[];
  estimatedTotalPrice?: number;
}

// 穿搭推荐结果
export interface AiStylistResolution {
  lookSummary: string;
  whyItFits: string[];
  outfits: AiStylistOutfitPlan[];
}

// 进度信息
export interface AiStylistProgress {
  stage: string;
  title: string;
  detail: string;
  etaSeconds?: number;
  canLeaveAndResume: boolean;
  isWaiting: boolean;
}

// 槽位更新（简化版，避免使用 Partial）
export interface SlotUpdates {
  occasion?: string;
  weather?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredStyles?: string[];
  styleAvoidances?: string[];
  fitGoals?: string[];
  preferredColors?: string[];
}

// 会话响应
export interface AiStylistSessionResponse {
  success: boolean;
  message: string;
  assistantMessage: string;
  timestamp: string;
  sessionId?: string;
  nextAction?: AiStylistAction;
  sessionState?: AiStylistSessionState;
  slotUpdates?: SlotUpdates;
  missingFields?: string[];
  previewRecommendations?: AiStylistOutfitItem[];
  result?: AiStylistResolution;
  photoId?: string;
  analysisStatus?: string;
  progress?: AiStylistProgress;
  sessionExpiresAt?: string;
  isFallback?: boolean;
  error?: string;
}

// 建议响应
export interface AiStylistSuggestionResponse {
  suggestions: SuggestionItem[];
}

// 建议项
export interface SuggestionItem {
  text: string;
  icon: string;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  role: string; // 'user' | 'assistant'
  content: string;
  timestamp: string;
}

// 会话列表项
export interface SessionListItem {
  id: string;
  createdAt: string;
  status: string;
  resultPreview?: string;
}

// 会话列表响应
export interface SessionListResponse {
  items: SessionListItem[];
  total: number;
  page: number;
  limit: number;
}

// API 响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 创建会话请求
export interface CreateSessionRequest {
  entry?: string;
  goal?: string;
  context?: Record<string, string>;
}

// 发送消息请求
export interface SendMessageRequest {
  message: string;
}

// 上传照片请求
export interface UploadPhotoRequest {
  file: string;
  type: string;
}

// 删除会话响应
export interface DeleteSessionResponse {
  success: boolean;
  message: string;
}

// 对话历史项
export interface ConversationHistoryItem {
  role: string;
  content: string;
}

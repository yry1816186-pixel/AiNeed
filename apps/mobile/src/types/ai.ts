/**
 * AI 服务相关类型定义
 */

// AI 会话
export interface AISession {
  id: string;
  userId: string;
  title?: string;
  messages: AIMessage[];
  context?: AIContext;
  createdAt: string;
  updatedAt: string;
}

// AI 消息
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  recommendations?: AIRecommendation[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// AI 上下文
export interface AIContext {
  userProfile?: {
    gender?: string;
    bodyType?: string;
    skinTone?: string;
    colorSeason?: string;
    preferences?: string[];
  };
  currentOccasion?: string;
  season?: string;
  budget?: string;
  preferredStyle?: string;
}

// AI 推荐
export interface AIRecommendation {
  type: 'clothing' | 'outfit' | 'style' | 'color';
  itemId?: string;
  items?: string[];
  reason: string;
  confidence: number;
  tags?: string[];
}

// AI 分析结果
export interface AIAnalysisResult {
  type: 'body' | 'color' | 'style' | 'outfit';
  data: Record<string, unknown>;
  confidence: number;
  suggestions: string[];
}

// AI 造型师请求
export interface AIStylistRequest {
  message: string;
  sessionId?: string;
  context?: AIContext;
  attachments?: Array<{
    type: 'image' | 'clothing';
    uri: string;
  }>;
}

// AI 造型师响应
export interface AIStylistResponse {
  message: string;
  recommendations?: AIRecommendation[];
  followUpQuestions?: string[];
  metadata?: Record<string, unknown>;
}

// 虚拟试衣请求
export interface VirtualTryOnRequest {
  userId: string;
  userPhotoId: string;
  clothingId: string;
  options?: {
    preserveBackground?: boolean;
    enhanceDetails?: boolean;
  };
}

// 虚拟试衣响应
export interface VirtualTryOnResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultImageUri?: string;
  processingTime?: number;
  error?: string;
}

// AI 服务配置
export interface AIServiceConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// AI 模型类型
export type AIModelType =
  | 'chat'
  | 'recommendation'
  | 'analysis'
  | 'generation'
  | 'classification';

// AI 任务状态
export interface AITaskStatus {
  taskId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

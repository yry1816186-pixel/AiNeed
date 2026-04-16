/**
 * AI Core domain shared types
 * Aligned with Prisma schema enums for type safety across domains
 */

// ==================== AI Stylist ====================

export enum AiStylistSessionStatus {
  Active = 'active',
  Archived = 'archived',
}

// ==================== AI Analysis ====================

export enum AnalysisStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

// ==================== AI Model Types ====================

export interface AiModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface AiModelResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

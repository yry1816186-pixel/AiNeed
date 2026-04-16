/**
 * Queue Module Interfaces
 * Defines data structures for AI task jobs
 */

import { JobType, JobStatus } from './queue.constants';

export interface BaseJobData {
  jobId: string;
  userId: string;
  type: JobType;
  createdAt: string;
  priority?: number;
  callbackUrl?: string;
}

export interface StyleAnalysisJobData extends BaseJobData {
  type: 'style_analysis';
  userInput: string;
  userProfile?: {
    bodyType?: string;
    skinTone?: string;
    colorSeason?: string;
    stylePreferences?: string[];
    occasionPreferences?: string[];
  };
}

export interface VirtualTryOnJobData extends BaseJobData {
  type: 'virtual_tryon';
  photoId: string;
  userPhotoUrl: string;
  itemId: string;
  clothingImageUrl: string;
  category?: string;
}

export interface WardrobeMatchJobData extends BaseJobData {
  type: 'wardrobe_match';
  wardrobeItems: string[];
  targetStyle?: string;
  occasion?: string;
  season?: string;
}

export interface ImageAnalysisJobData extends BaseJobData {
  type: 'image_analysis';
  imagePath: string;
  analysisType: 'full' | 'color' | 'style' | 'body';
}

export interface BodyAnalysisJobData extends BaseJobData {
  type: 'body_analysis';
  imagePath: string;
}

export interface RecommendationJobData extends BaseJobData {
  type: 'recommendation';
  userInput: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userProfile?: Record<string, any>;
  occasion?: string;
  category?: string;
  topK?: number;
}

export type AITaskJobData =
  | StyleAnalysisJobData
  | VirtualTryOnJobData
  | WardrobeMatchJobData
  | ImageAnalysisJobData
  | BodyAnalysisJobData
  | RecommendationJobData;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface JobResult<T = any> {
  jobId: string;
  status: JobStatus;
  result?: T;
  error?: string;
  processedAt?: string;
  duration?: number;
}

export interface StyleAnalysisResult {
  styleName: string;
  confidence: number;
  coreElements: string[];
  keyItems: string[];
  colorPalette: string[];
  patterns: string[];
  materials: string[];
  occasions: string[];
  seasons: string[];
  bodyTypeSuggestions: Record<string, string[]>;
  celebrityReferences: string[];
  brandReferences: string[];
  priceRange: string;
  similarStyles: string[];
}

export interface VirtualTryOnResult {
  tryOnId: string;
  resultImageUrl: string;
  provider: string;
}

export interface WardrobeMatchResult {
  matches: Array<{
    itemId: string;
    score: number;
    reasons: string[];
  }>;
  suggestions: string[];
}

export interface JobProgress {
  jobId: string;
  progress: number;
  stage: string;
  message?: string;
}

export interface TaskCreatedResponse {
  jobId: string;
  status: JobStatus;
  estimatedWaitTime: number;
  message: string;
}

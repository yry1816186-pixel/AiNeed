import type { PhotoType, AnalysisStatus } from './enums';

export interface PhotoQualityReport {
  overall: number;
  brightness: number;
  sharpness: number;
  contrast: number;
  pose: number;
  background: number;
  issues: PhotoQualityIssue[];
  isAcceptable: boolean;
}

export interface PhotoQualityIssue {
  type: 'brightness' | 'sharpness' | 'contrast' | 'pose' | 'background' | 'occlusion';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export interface QualityCheckPayload {
  photoType: PhotoType;
  imageUri: string;
  minWidth?: number;
  minHeight?: number;
  maxFileSize?: number;
}

export interface EnhancementResult {
  enhancedUri: string;
  originalUri: string;
  adjustments: {
    brightness?: number;
    contrast?: number;
    sharpness?: number;
  };
  beforeScore: number;
  afterScore: number;
}

export interface UserPhoto {
  id: string;
  userId: string;
  type: PhotoType;
  url: string;
  thumbnailUrl?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  analysisResult?: Record<string, unknown>;
  analysisStatus: AnalysisStatus;
  analyzedAt?: string;
  createdAt: string;
}

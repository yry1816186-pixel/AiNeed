export interface UserPhoto {
  id: string;
  userId: string;
  type: PhotoType;
  url: string;
  thumbnailUrl?: string;
  analysisResult?: PhotoAnalysisResult;
  status: PhotoStatus;
  createdAt: Date;
}

export enum PhotoType {
  Front = 'front',
  Side = 'side',
  FullBody = 'full_body',
  HalfBody = 'half_body',
  Face = 'face',
}

export enum PhotoStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export interface PhotoAnalysisResult {
  bodyType?: import('./profile').BodyType;
  skinTone?: import('./profile').SkinTone;
  faceShape?: import('./profile').FaceShape;
  confidence: number;
  rawResult: Record<string, unknown>;
  analyzedAt: Date;
}

export interface VirtualTryOn {
  id: string;
  userId: string;
  photoId: string;
  clothingItemId: string;
  resultImageUrl?: string;
  status: TryOnStatus;
  createdAt: Date;
  completedAt?: Date;
}

export enum TryOnStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

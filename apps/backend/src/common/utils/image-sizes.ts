export type ImageSizeName = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

export interface ImageSizeConfig {
  name: ImageSizeName;
  width: number;
  height: number;
  fit: 'cover' | 'inside';
  quality: number;
}

export const IMAGE_SIZES: Record<ImageSizeName, ImageSizeConfig> = {
  thumbnail: { name: 'thumbnail', width: 200, height: 200, fit: 'cover', quality: 70 },
  small: { name: 'small', width: 400, height: 400, fit: 'inside', quality: 75 },
  medium: { name: 'medium', width: 800, height: 800, fit: 'inside', quality: 80 },
  large: { name: 'large', width: 1200, height: 1200, fit: 'inside', quality: 85 },
  original: { name: 'original', width: 0, height: 0, fit: 'inside', quality: 90 },
};

export const DEFAULT_SIZES: ImageSizeName[] = ['thumbnail', 'small', 'medium', 'large', 'original'];

export function getStoragePath(userId: string, photoId: string, size: ImageSizeName, format: string = 'webp'): string {
  return `photos/${userId}/${photoId}/${size}.${format}`;
}

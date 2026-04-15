// eslint-disable-next-line import/no-unresolved
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface CompressImageOptions {
  maxWidth?: number;
  quality?: number;
}

/**
 * Compress an image before upload to reduce bandwidth and improve upload speed.
 * Uses expo-image-manipulator to resize and re-encode as JPEG.
 *
 * @param uri - Local file URI of the image to compress
 * @param options - Compression options
 * @param options.maxWidth - Maximum width in pixels (default 1920). Images wider than this are scaled down proportionally.
 * @param options.quality - JPEG quality from 0 to 1 (default 0.8)
 * @returns URI of the compressed image
 */
export async function compressImage(
  uri: string,
  options?: CompressImageOptions
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1920;
  const quality = options?.quality ?? 0.8;

  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: quality, format: SaveFormat.JPEG }
  );

  return result.uri;
}

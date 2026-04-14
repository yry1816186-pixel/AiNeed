/**
 * Image URL optimization utilities.
 *
 * Transforms image URLs with size/quality/format parameters for
 * progressive loading and responsive sizing.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg";
}

export interface SrcSetEntry {
  url: string;
  width: number;
}

/**
 * Build an optimized image URL with sizing and quality params.
 *
 * - picsum.photos URLs: add query params for width, height, blur
 * - MinIO / other URLs: add query params for image processing
 * - Unknown hosts: return unchanged URL
 */
export function getOptimizedImageUrl(
  url: string,
  options: ImageOptimizationOptions = {},
): string {
  if (!url) return url;

  const {
    width,
    height,
    quality = 80,
    format,
  } = options;

  try {
    const parsed = new URL(url);

    // picsum.photos supports width/height/blurr/grayscale params
    if (parsed.hostname === "picsum.photos" || parsed.hostname === "fastly.picsum.photos") {
      if (width) parsed.searchParams.set("w", String(width));
      if (height) parsed.searchParams.set("h", String(height));
      return parsed.toString();
    }

    // MinIO / generic image host: append optimization query params
    if (width) parsed.searchParams.set("width", String(width));
    if (height) parsed.searchParams.set("height", String(height));
    if (quality !== 80) parsed.searchParams.set("quality", String(quality));
    if (format) parsed.searchParams.set("format", format);

    return parsed.toString();
  } catch {
    // Not a valid URL - return as-is
    return url;
  }
}

/**
 * Generate a tiny placeholder URL for blur-hash style progressive loading.
 * Uses a very small image (10px wide, low quality).
 */
export function getPlaceholder(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "picsum.photos" || parsed.hostname === "fastly.picsum.photos") {
      parsed.searchParams.set("w", "10");
      parsed.searchParams.set("h", "10");
      parsed.searchParams.set("blur", "5");
      return parsed.toString();
    }

    parsed.searchParams.set("width", "10");
    parsed.searchParams.set("quality", "20");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Generate multiple sizes for responsive images.
 *
 * Returns an array of { url, width } objects for each requested width.
 */
export function getSrcSet(
  url: string,
  widths: number[],
): SrcSetEntry[] {
  if (!url || !widths.length) return [];

  return widths.map((w) => ({
    url: getOptimizedImageUrl(url, { width: w }),
    width: w,
  }));
}

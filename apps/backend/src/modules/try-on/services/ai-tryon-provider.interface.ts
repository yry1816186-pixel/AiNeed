import * as crypto from "crypto";

export interface TryOnRequest {
  personImageUrl: string;
  garmentImageUrl: string;
  category?: "upper_body" | "lower_body" | "full_body" | "dress";
  hd?: boolean;
}

export interface TryOnResponse {
  resultImageUrl: string;
  processingTime?: number;
  confidence?: number;
  provider: string;
  rawResponse?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TryOnProvider {
  readonly name: string;
  readonly priority: number;
  isAvailable(): Promise<boolean>;
  virtualTryOn(request: TryOnRequest): Promise<TryOnResponse>;
}

export function generateTryOnCacheKey(
  personImageUrl: string,
  garmentImageUrl: string,
  category: string = "upper_body",
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${personImageUrl}|${garmentImageUrl}|${category}`)
    .digest("hex");
  return `tryon:${hash}`;
}

export function generateStableCacheKey(
  photoId: string,
  itemId: string,
  category?: string,
): string {
  const parts = [photoId, itemId, category ?? "upper_body"];
  const hash = crypto
    .createHash("sha256")
    .update(parts.join("|"))
    .digest("hex");
  return `tryon:stable:${hash}`;
}

import { upload, get, post } from "./request";

export interface SearchItem {
  id: string;
  name: string;
  images: string[];
  price: number;
  currency: string;
  category: string;
  similarityScore: number;
  matchReasons: string[];
}

/**
 * Search by uploading an image file (from camera/album).
 * Uses Taro.uploadFile for multipart form data.
 */
export async function searchByImage(
  tempFilePath: string,
  limit: number = 5
): Promise<SearchItem[]> {
  const result = await upload<SearchItem[] | { items: SearchItem[] }>(
    `/search/image?limit=${limit}`,
    tempFilePath
  );

  // Handle both array and wrapped response formats
  if (Array.isArray(result)) {
    return result;
  }
  return result.items || [];
}

/**
 * Search by providing an image URL.
 */
export async function searchByImageUrl(imageUrl: string, limit: number = 5): Promise<SearchItem[]> {
  return await post<SearchItem[]>(`/search/image/url?limit=${limit}`, {
    imageUrl,
  });
}

/**
 * Get items similar to a specific item by ID.
 */
export async function getSimilarItems(itemId: string, limit: number = 5): Promise<SearchItem[]> {
  return await get<SearchItem[]>(`/search/similar/${itemId}`, { limit });
}

import Constants from '@/src/polyfills/expo-constants';

const FAL_API_URL = "https://fal.run/fal-ai/birefnet/v2";

interface BackgroundRemovalResult {
  imageUri: string;
  originalUri: string;
  success: boolean;
  error?: string;
}

interface FalResponse {
  images: {
    url: string;
    width: number;
    height: number;
    content_type: string;
  }[];
}

declare const process: { env: Record<string, string | undefined> };

class BackgroundRemovalService {
  private apiKey: string;

  constructor() {
    this.apiKey =
      Constants.expoConfig?.extra?.FAL_KEY ||
      (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_FAL_KEY : undefined) ||
      "";
  }

  async removeBackground(imageUri: string): Promise<BackgroundRemovalResult> {
    if (!this.apiKey) {
      console.warn("FAL API key not configured, returning original image");
      return {
        imageUri,
        originalUri: imageUri,
        success: false,
        error: "API key not configured",
      };
    }

    try {
      const response = await fetch(FAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${this.apiKey}`,
        },
        body: JSON.stringify({
          image_url: imageUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FAL API error: ${response.status} - ${errorText}`);
      }

      const data: FalResponse = await response.json();

      if (data.images && data.images.length > 0) {
        return {
          imageUri: data.images[0].url,
          originalUri: imageUri,
          success: true,
        };
      }

      throw new Error("No image returned from API");
    } catch (error) {
      console.error("Background removal failed:", error);
      return {
        imageUri,
        originalUri: imageUri,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async removeBackgroundBatch(
    imageUris: string[],
  ): Promise<BackgroundRemovalResult[]> {
    const results = await Promise.all(
      imageUris.map((uri) => this.removeBackground(uri)),
    );
    return results;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }
}

export const backgroundRemovalService = new BackgroundRemovalService();
export default backgroundRemovalService;

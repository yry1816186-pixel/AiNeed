import { apiClient } from "../api/client";

interface BackgroundRemovalResult {
  imageUri: string;
  originalUri: string;
  success: boolean;
  error?: string;
}

class BackgroundRemovalService {
  async removeBackground(imageUri: string): Promise<BackgroundRemovalResult> {
    try {
      const formData = new FormData();
      const filename = imageUri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri: imageUri,
        name: filename,
        type,
      } satisfies FormDataValue);

      const response = await apiClient.upload<{ imageUri: string }>(
        "/ai/remove-background",
        formData
      );

      if (!response.success || !response.data) {
        return {
          imageUri,
          originalUri: imageUri,
          success: false,
          error: response.error?.message || "Background removal failed",
        };
      }

      return {
        imageUri: response.data.imageUri,
        originalUri: imageUri,
        success: true,
      };
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

  async removeBackgroundBatch(imageUris: string[]): Promise<BackgroundRemovalResult[]> {
    const results = await Promise.all(imageUris.map((uri) => this.removeBackground(uri)));
    return results;
  }
}

export const backgroundRemovalService = new BackgroundRemovalService();
export default backgroundRemovalService;

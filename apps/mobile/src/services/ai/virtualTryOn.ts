import { tryOnApi } from '../api/tryon.api';
import type { TryOnResult } from '../api/tryon.api';

interface TryOnOptions {
  category?: string;
  preserveBackground?: boolean;
  enhanceQuality?: boolean;
}

class VirtualTryOnService {
  async tryOn(
    personPhotoId: string,
    clothingItemId: string,
    _options?: TryOnOptions,
  ): Promise<TryOnResult> {
    const response = await tryOnApi.create(personPhotoId, clothingItemId);
    if (!response.success || !response.data) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Virtual try-on request failed');
    }
    return this.pollUntilComplete(response.data.id);
  }

  async tryOnMultiple(
    personPhotoId: string,
    clothingItemIds: string[],
  ): Promise<TryOnResult[]> {
    const results = await Promise.all(
      clothingItemIds.map((itemId) => this.tryOn(personPhotoId, itemId)),
    );
    return results;
  }

  async getStatus(tryOnId: string): Promise<TryOnResult> {
    const response = await tryOnApi.getStatus(tryOnId);
    if (!response.success || !response.data) {
      throw new Error(typeof response.error === 'string' ? response.error : 'Failed to get try-on status');
    }
    return response.data;
  }

  private async pollUntilComplete(
    tryOnId: string,
    maxAttempts: number = 60,
    intervalMs: number = 3000,
  ): Promise<TryOnResult> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getStatus(tryOnId);
      if (result.status === 'completed') {
        return result;
      }
      if (result.status === 'failed') {
        throw new Error(result.errorMessage || 'Virtual try-on failed');
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error('Virtual try-on timed out');
  }
}

export const virtualTryOnService = new VirtualTryOnService();
export default virtualTryOnService;

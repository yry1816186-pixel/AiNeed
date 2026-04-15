import { tryOnApi } from "../api/tryon.api";
import type { TryOnResult } from "../api/tryon.api";
import { wsService } from "../websocket";

interface TryOnOptions {
  category?: string;
  preserveBackground?: boolean;
  enhanceQuality?: boolean;
}

/** Simple counting semaphore for concurrency control */
class Semaphore {
  private current = 0;
  private waitQueue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      next();
    } else {
      this.current--;
    }
  }
}

const TRYON_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

class VirtualTryOnService {
  private readonly semaphore = new Semaphore(3);

  async tryOn(
    personPhotoId: string,
    clothingItemId: string,
    _options?: TryOnOptions
  ): Promise<TryOnResult> {
    const response = await tryOnApi.create(personPhotoId, clothingItemId);
    if (!response.success || !response.data) {
      throw new Error(
        typeof response.error === "string" ? response.error : "Virtual try-on request failed"
      );
    }
    return this.waitForCompletion(response.data.id);
  }

  async tryOnMultiple(personPhotoId: string, clothingItemIds: string[]): Promise<TryOnResult[]> {
    const results = await Promise.all(
      clothingItemIds.map((itemId) =>
        this.tryOnWithConcurrency(personPhotoId, itemId)
      )
    );
    return results;
  }

  /** Wraps tryOn with semaphore-based concurrency control */
  private async tryOnWithConcurrency(
    personPhotoId: string,
    clothingItemId: string
  ): Promise<TryOnResult> {
    await this.semaphore.acquire();
    try {
      return await this.tryOn(personPhotoId, clothingItemId);
    } finally {
      this.semaphore.release();
    }
  }

  async getStatus(tryOnId: string): Promise<TryOnResult> {
    const response = await tryOnApi.getStatus(tryOnId);
    if (!response.success || !response.data) {
      throw new Error(
        typeof response.error === "string" ? response.error : "Failed to get try-on status"
      );
    }
    return response.data;
  }

  /**
   * Wait for try-on completion, preferring WebSocket when available,
   * falling back to HTTP polling with exponential backoff.
   */
  private waitForCompletion(tryOnId: string): Promise<TryOnResult> {
    if (wsService.isConnected()) {
      return this.waitForCompletionViaWs(tryOnId);
    }
    return this.waitForCompletionViaPolling(tryOnId);
  }

  private waitForCompletionViaWs(tryOnId: string): Promise<TryOnResult> {
    return new Promise<TryOnResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Virtual try-on timed out"));
      }, TRYON_TIMEOUT_MS);

      let settled = false;

      const unsubComplete = wsService.onTryOnComplete(tryOnId, (payload) => {
        if (payload.tryOnId !== tryOnId) { return; }
        if (settled) { return; }
        settled = true;
        cleanup();

        if (payload.status === "completed") {
          // Build a partial TryOnResult from the WS payload and merge with a fresh getStatus call
          // to ensure all fields (photo, item, createdAt, etc.) are populated.
          this.getStatus(tryOnId)
            .then((fullResult) => resolve(fullResult))
            .catch(() => {
              // Fallback: construct from WS payload alone
              resolve(this.wsPayloadToResult(payload));
            });
        } else {
          reject(new Error(payload.errorMessage || "Virtual try-on failed"));
        }
      });

      // Optionally listen to progress events — currently just keeps the subscription
      // active so the WS connection stays relevant for this tryOnId.
      const unsubProgress = wsService.onTryOnProgress(tryOnId, () => {
        // Progress updates are handled by the UI layer via wsService directly.
      });

      const cleanup = () => {
        clearTimeout(timeout);
        unsubComplete();
        unsubProgress();
      };
    });
  }

  /**
   * Fallback: HTTP polling with exponential backoff (2s -> 4s -> 8s -> 8s ...).
   */
  private async waitForCompletionViaPolling(tryOnId: string): Promise<TryOnResult> {
    const startTime = Date.now();
    let delayMs = 2000;
    const maxDelayMs = 8000;

    while (Date.now() - startTime < TRYON_TIMEOUT_MS) {
      const result = await this.getStatus(tryOnId);
      if (result.status === "completed") {
        return result;
      }
      if (result.status === "failed") {
        throw new Error(result.errorMessage || "Virtual try-on failed");
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
    throw new Error("Virtual try-on timed out");
  }

  /** Construct a TryOnResult from WebSocket event payload (minimal fields). */
  private wsPayloadToResult(payload: {
    tryOnId: string;
    status: "completed" | "failed";
    resultImageUrl?: string;
    errorMessage?: string;
  }): TryOnResult {
    return {
      id: payload.tryOnId,
      status: payload.status,
      resultImageUrl: payload.resultImageUrl,
      errorMessage: payload.errorMessage,
      photo: { id: "" },
      item: { id: "", name: "", mainImage: "" },
      createdAt: new Date().toISOString(),
    };
  }
}

export const virtualTryOnService = new VirtualTryOnService();
export default virtualTryOnService;

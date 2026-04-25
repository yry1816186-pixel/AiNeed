import crypto from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

// ==================== Type Definitions ====================

export interface TaobaoItem {
  itemId: string;
  title: string;
  price: number;
  originalPrice?: number;
  images: string[];
  mainImage: string;
  category: string;
  categoryPath?: string;
  brand?: string;
  description?: string;
  url?: string;
  volume?: number;
  commissionRate?: number;
  sellerId?: string;
  shopName?: string;
}

export interface TaobaoSearchResult {
  items: TaobaoItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TaobaoCategory {
  categoryId: number;
  categoryName: string;
  parentId?: number;
  children?: TaobaoCategory[];
}

interface TaobaoRawItem {
  num_iid?: number | string;
  title?: string;
  pict_url?: string;
  small_images?: string | string[];
  reserve_price?: string;
  zk_final_price?: string;
  cat_name?: string;
  cat_leaf_name?: string;
  brand_name?: string;
  item_url?: string;
  volume?: number | string;
  tk_rate?: string;
  seller_id?: number | string;
  shop_title?: string;
  title_short?: string;
}

interface TaobaoCategoryRaw {
  cid?: number;
  name?: string;
  parent_cid?: number;
  subcategories?: TaobaoCategoryRaw[];
}

interface TaobaoAPIError {
  code?: number;
  msg?: string;
  sub_code?: string;
  sub_msg?: string;
}

// ==================== Rate Limiter ====================

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      // Calculate wait time until the oldest request exits the window
      const oldestInWindow = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 1;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      // Re-check after waiting
      return this.acquire();
    }

    this.timestamps.push(now);
  }
}

// ==================== Service ====================

@Injectable()
export class TaobaoClientService {
  private readonly logger = new Logger(TaobaoClientService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly endpoint: string;
  private readonly rateLimiter: RateLimiter;

  private readonly MAX_RETRIES = 3;
  private readonly BASE_BACKOFF_MS = 1000;

  constructor(private readonly configService: ConfigService) {
    this.appKey = this.configService.get<string>("TAOBAO_APP_KEY", "");
    this.appSecret = this.configService.get<string>("TAOBAO_APP_SECRET", "");
    this.endpoint = this.configService.get<string>(
      "TAOBAO_API_ENDPOINT",
      "https://eco.taobao.com/router/rest"
    );

    // Rate limit: 100 requests per minute
    this.rateLimiter = new RateLimiter(100, 60_000);

    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "XunO/1.0",
      },
    });

    if (this.appKey) {
      this.logger.log("Taobao client initialized with APP_KEY");
    } else {
      this.logger.warn("TAOBAO_APP_KEY not configured — Taobao API calls will fail");
    }
  }

  // ==================== Public API ====================

  /**
   * Search items via Taobao API (taobao.tbk.dg.material.optional)
   * Supports keyword search with pagination, price range, and category filter
   */
  async searchItems(
    keyword: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<TaobaoSearchResult> {
    this.validateCredentials();

    const params: Record<string, string | number> = {
      method: "taobao.tbk.dg.material.optional",
      app_key: this.appKey,
      timestamp: this.formatTimestamp(),
      format: "json",
      v: "2.0",
      sign_method: "md5",
      q: keyword,
      page_no: page,
      page_size: Math.min(pageSize, 100),
    };

    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();

      const sign = this.generateSign(params);
      const response = await this.axiosInstance.get(this.endpoint, {
        params: { ...params, sign },
      });

      this.checkErrorResponse(response.data);

      const resultData = response.data?.tbk_dg_material_optional_response;
      const rawItems: TaobaoRawItem[] = resultData?.result_list?.map_data || [];

      return {
        items: rawItems.map((item) => this.normalizeItem(item)),
        total: resultData?.total_results || 0,
        page,
        pageSize,
      };
    }, `searchItems("${keyword}", page=${page})`);
  }

  /**
   * Get item details via Taobao API (taobao.tbk.item.info.get)
   * Returns detailed info for a single item by its ID
   */
  async getItemDetails(itemId: string): Promise<TaobaoItem> {
    this.validateCredentials();

    const params: Record<string, string | number> = {
      method: "taobao.tbk.item.info.get",
      app_key: this.appKey,
      timestamp: this.formatTimestamp(),
      format: "json",
      v: "2.0",
      sign_method: "md5",
      num_iids: itemId,
    };

    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();

      const sign = this.generateSign(params);
      const response = await this.axiosInstance.get(this.endpoint, {
        params: { ...params, sign },
      });

      this.checkErrorResponse(response.data);

      const rawItems: TaobaoRawItem[] =
        response.data?.tbk_item_info_get_response?.results?.n_tbk_item || [];

      if (rawItems.length === 0) {
        throw new Error(`Taobao item not found: ${itemId}`);
      }

      return this.normalizeItem(rawItems[0]);
    }, `getItemDetails("${itemId}")`);
  }

  /**
   * Get category list via Taobao API (taobao.tbk.item.category.get)
   * Returns available product categories for filtering
   */
  async getCategories(): Promise<TaobaoCategory[]> {
    this.validateCredentials();

    const params: Record<string, string | number> = {
      method: "taobao.tbk.item.category.get",
      app_key: this.appKey,
      timestamp: this.formatTimestamp(),
      format: "json",
      v: "2.0",
      sign_method: "md5",
    };

    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();

      const sign = this.generateSign(params);
      const response = await this.axiosInstance.get(this.endpoint, {
        params: { ...params, sign },
      });

      this.checkErrorResponse(response.data);

      const rawCategories: TaobaoCategoryRaw[] =
        response.data?.tbk_item_category_get_response?.results?.n_tbk_category || [];

      return rawCategories.map((cat) => this.normalizeCategory(cat));
    }, "getCategories()");
  }

  // ==================== Private Helpers ====================

  /**
   * Generate Taobao API signature (MD5-based)
   * Format: MD5(secret + key1value1key2value2... + secret).toUpperCase()
   */
  private generateSign(params: Record<string, string | number>): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map((key) => `${key}${params[key]}`).join("");
    return crypto
      .createHash("md5")
      .update(this.appSecret + signString + this.appSecret)
      .digest("hex")
      .toUpperCase();
  }

  /**
   * Format timestamp for Taobao API (yyyy-MM-dd HH:mm:ss)
   */
  private formatTimestamp(): string {
    return new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z/, "");
  }

  /**
   * Normalize raw Taobao item to TaobaoItem
   */
  private normalizeItem(raw: TaobaoRawItem): TaobaoItem {
    const images = this.parseImageList(raw.pict_url, raw.small_images);
    return {
      itemId: String(raw.num_iid || ""),
      title: String(raw.title || ""),
      price: parseFloat(String(raw.zk_final_price || raw.reserve_price || 0)),
      originalPrice: parseFloat(String(raw.reserve_price || 0)) || undefined,
      images,
      mainImage: images[0] || "",
      category: String(raw.cat_name || ""),
      categoryPath: raw.cat_leaf_name ? String(raw.cat_leaf_name) : undefined,
      brand: raw.brand_name ? String(raw.brand_name) : undefined,
      description: String(raw.title_short || raw.title || ""),
      url: raw.item_url ? String(raw.item_url) : undefined,
      volume: raw.volume ? parseInt(String(raw.volume), 10) : undefined,
      commissionRate: raw.tk_rate ? parseFloat(String(raw.tk_rate)) : undefined,
      sellerId: raw.seller_id ? String(raw.seller_id) : undefined,
      shopName: raw.shop_title ? String(raw.shop_title) : undefined,
    };
  }

  /**
   * Normalize raw category to TaobaoCategory
   */
  private normalizeCategory(raw: TaobaoCategoryRaw): TaobaoCategory {
    return {
      categoryId: raw.cid || 0,
      categoryName: String(raw.name || ""),
      parentId: raw.parent_cid,
      children: raw.subcategories?.map((sub) => this.normalizeCategory(sub)),
    };
  }

  /**
   * Parse image URLs from various Taobao response formats
   */
  private parseImageList(mainImage?: string, smallImages?: string | string[]): string[] {
    const images: string[] = [];

    if (mainImage) {
      images.push(mainImage);
    }

    if (Array.isArray(smallImages)) {
      images.push(...smallImages.filter(Boolean));
    } else if (typeof smallImages === "string" && smallImages) {
      images.push(...smallImages.split(",").filter(Boolean));
    }

    // Deduplicate
    return [...new Set(images)];
  }

  /**
   * Check Taobao API error response
   */
  private checkErrorResponse(data: Record<string, unknown>): void {
    const errorResp = data?.error_response as TaobaoAPIError | undefined;
    if (errorResp) {
      const message = errorResp.sub_msg || errorResp.msg || "Unknown Taobao API error";
      const code = errorResp.code || errorResp.sub_code || "UNKNOWN";
      throw new Error(`Taobao API error [${code}]: ${message}`);
    }
  }

  /**
   * Validate that API credentials are configured
   */
  private validateCredentials(): void {
    if (!this.appKey || !this.appSecret) {
      throw new Error(
        "Taobao API credentials not configured. " +
          "Please set TAOBAO_APP_KEY and TAOBAO_APP_SECRET environment variables."
      );
    }
  }

  /**
   * Execute API call with retry logic (3 attempts, exponential backoff)
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on credential errors
        if (lastError.message.includes("credentials not configured")) {
          throw lastError;
        }

        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          this.logger.warn(
            `${context} failed (attempt ${attempt}/${this.MAX_RETRIES}): ${lastError.message}. ` +
              `Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error(
            `${context} failed after ${this.MAX_RETRIES} attempts: ${lastError.message}`
          );
        }
      }
    }

    throw lastError!;
  }
}

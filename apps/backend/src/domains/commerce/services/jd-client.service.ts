import crypto from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

// ==================== Type Definitions ====================

export interface JDItem {
  skuId: string;
  skuName: string;
  brandName?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  mainImage: string;
  category: string;
  subcategory?: string;
  description?: string;
  url?: string;
  commissionRate?: number;
  goodCommentsShare?: number;
  inOrderCount30Days?: number;
  materialUrl?: string;
}

export interface JDSearchResult {
  items: JDItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface JDRawImageInfo {
  imageList?: string;
  whiteImage?: string;
}

interface JDRawCategoryInfo {
  cid1Name?: string;
  cid2Name?: string;
  cid3Name?: string;
}

interface JDRawItem {
  skuId?: number | string;
  skuName?: string;
  brandName?: string;
  price?: number | string;
  originalPrice?: number | string;
  imageInfo?: JDRawImageInfo;
  categoryInfo?: JDRawCategoryInfo;
  materialUrl?: string;
  goodCommentsShare?: number | string;
  inOrderCount30Days?: number | string;
  commissionInfo?: {
    commission?: number | string;
    commissionRate?: number | string;
  };
  spuid?: number | string;
  shopName?: string;
  owner?: string;
  comments?: number | string;
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
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0]!;
      const waitTime = this.windowMs - (now - oldestInWindow) + 1;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      return this.acquire();
    }

    this.timestamps.push(now);
  }
}

// ==================== Service ====================

@Injectable()
export class JDClientService {
  private readonly logger = new Logger(JDClientService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly endpoint: string;
  private readonly rateLimiter: RateLimiter;

  private readonly MAX_RETRIES = 3;
  private readonly BASE_BACKOFF_MS = 1000;

  constructor(private readonly configService: ConfigService) {
    this.appKey = this.configService.get<string>("JD_APP_KEY", "");
    this.appSecret = this.configService.get<string>("JD_APP_SECRET", "");
    this.endpoint = this.configService.get<string>(
      "JD_API_ENDPOINT",
      "https://api.jd.com/routerjson"
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
      this.logger.log("JD client initialized with APP_KEY");
    } else {
      this.logger.warn("JD_APP_KEY not configured — JD API calls will fail");
    }
  }

  // ==================== Public API ====================

  /**
   * Search items via JD API (jd.union.open.goods.query)
   * Supports keyword search with pagination
   */
  async searchItems(
    keyword: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<JDSearchResult> {
    this.validateCredentials();

    const goodsReq = {
      keyword,
      pageIndex: page,
      pageSize: Math.min(pageSize, 100),
    };

    const params: Record<string, string | number> = {
      method: "jd.union.open.goods.query",
      app_key: this.appKey,
      timestamp: Date.now(),
      format: "json",
      v: "1.0",
      sign_method: "md5",
      param_json: JSON.stringify({ goodsReq }),
    };

    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();

      const sign = this.generateSign(params);
      const response = await this.axiosInstance.get(this.endpoint, {
        params: { ...params, sign },
      });

      this.checkErrorResponse(response.data);

      const resultData = response.data?.jd_union_open_goods_query_responce;
      const rawItems: JDRawItem[] = resultData?.result?.data || [];

      return {
        items: rawItems.map((item) => this.normalizeItem(item)),
        total: resultData?.result?.totalCount || 0,
        page,
        pageSize,
      };
    }, `searchItems("${keyword}", page=${page})`);
  }

  /**
   * Get item details via JD API (jd.union.open.goods.promotiongoodsinfo.query)
   * Returns detailed info for a single SKU by its ID
   */
  async getItemDetails(skuId: string): Promise<JDItem> {
    this.validateCredentials();

    const params: Record<string, string | number> = {
      method: "jd.union.open.goods.promotiongoodsinfo.query",
      app_key: this.appKey,
      timestamp: Date.now(),
      format: "json",
      v: "1.0",
      sign_method: "md5",
      param_json: JSON.stringify({ skuIds: skuId }),
    };

    return this.executeWithRetry(async () => {
      await this.rateLimiter.acquire();

      const sign = this.generateSign(params);
      const response = await this.axiosInstance.get(this.endpoint, {
        params: { ...params, sign },
      });

      this.checkErrorResponse(response.data);

      const rawItems: JDRawItem[] =
        response.data?.jd_union_open_goods_promotiongoodsinfo_query_responce?.result?.data || [];

      if (rawItems.length === 0) {
        throw new Error(`JD item not found: ${skuId}`);
      }

      return this.normalizeItem(rawItems[0]!);
    }, `getItemDetails("${skuId}")`);
  }

  // ==================== Private Helpers ====================

  /**
   * Generate JD API signature (MD5-based)
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
   * Normalize raw JD item to JDItem
   */
  private normalizeItem(raw: JDRawItem): JDItem {
    const images = this.parseImageList(raw.imageInfo);
    return {
      skuId: String(raw.skuId || ""),
      skuName: String(raw.skuName || ""),
      brandName: raw.brandName ? String(raw.brandName) : undefined,
      price: parseFloat(String(raw.price || 0)),
      originalPrice: raw.originalPrice ? parseFloat(String(raw.originalPrice)) : undefined,
      images,
      mainImage: images[0] || "",
      category: String(raw.categoryInfo?.cid1Name || ""),
      subcategory: raw.categoryInfo?.cid2Name ? String(raw.categoryInfo.cid2Name) : undefined,
      description: String(raw.skuName || ""),
      url: raw.materialUrl ? String(raw.materialUrl) : undefined,
      commissionRate: raw.commissionInfo?.commissionRate
        ? parseFloat(String(raw.commissionInfo.commissionRate))
        : undefined,
      goodCommentsShare: raw.goodCommentsShare
        ? parseFloat(String(raw.goodCommentsShare))
        : undefined,
      inOrderCount30Days: raw.inOrderCount30Days
        ? parseInt(String(raw.inOrderCount30Days), 10)
        : undefined,
      materialUrl: raw.materialUrl ? String(raw.materialUrl) : undefined,
    };
  }

  /**
   * Parse image URLs from JD imageInfo object
   */
  private parseImageList(imageInfo?: JDRawImageInfo): string[] {
    const images: string[] = [];

    if (imageInfo?.whiteImage) {
      images.push(imageInfo.whiteImage);
    }

    if (imageInfo?.imageList) {
      const listImages = imageInfo.imageList.split(",").filter(Boolean);
      images.push(...listImages);
    }

    return [...new Set(images)];
  }

  /**
   * Check JD API error response
   */
  private checkErrorResponse(data: Record<string, unknown>): void {
    const errorResp = data?.error_response as
      | { code?: string; zh_desc?: string; en_desc?: string }
      | undefined;
    if (errorResp) {
      const message = errorResp.zh_desc || errorResp.en_desc || "Unknown JD API error";
      const code = errorResp.code || "UNKNOWN";
      throw new Error(`JD API error [${code}]: ${message}`);
    }
  }

  /**
   * Validate that API credentials are configured
   */
  private validateCredentials(): void {
    if (!this.appKey || !this.appSecret) {
      throw new Error(
        "JD API credentials not configured. " +
          "Please set JD_APP_KEY and JD_APP_SECRET environment variables."
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

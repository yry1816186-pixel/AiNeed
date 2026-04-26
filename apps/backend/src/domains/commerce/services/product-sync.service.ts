import crypto from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { QdrantService } from "../../platform/recommendations/services/qdrant.service";

import { JDClientService, JDItem } from "./jd-client.service";
import { TaobaoClientService, TaobaoItem } from "./taobao-client.service";

// ==================== Type Definitions ====================

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  embedded: number;
}

interface SyncableItem {
  externalId: string;
  source: "TAOBAO" | "JD";
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  mainImage: string;
  category: string;
  subcategory?: string;
  brand?: string;
  url?: string;
  volume?: number;
  commissionRate?: number;
  tags?: string[];
}

// ==================== Service ====================

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taobaoClient: TaobaoClientService,
    private readonly jdClient: JDClientService,
    private readonly qdrantService: QdrantService
  ) {}

  // ==================== Public API ====================

  /**
   * Full sync: fetch all products from Taobao and JD, deduplicate, upsert, and embed.
   * Typically called once daily (3 AM) via scheduler.
   */
  async syncFull(): Promise<SyncResult> {
    this.logger.log("Starting full sync from Taobao and JD...");

    const result: SyncResult = { added: 0, updated: 0, skipped: 0, embedded: 0 };

    try {
      // Fetch from both sources in parallel
      const [taobaoItems, jdItems] = await Promise.allSettled([
        this.fetchAllTaobaoItems(),
        this.fetchAllJDItems(),
      ]);

      const allItems: SyncableItem[] = [];

      if (taobaoItems.status === "fulfilled") {
        allItems.push(...taobaoItems.value);
        this.logger.log(`Fetched ${taobaoItems.value.length} items from Taobao`);
      } else {
        this.logger.error(`Taobao fetch failed: ${taobaoItems.reason}`);
      }

      if (jdItems.status === "fulfilled") {
        allItems.push(...jdItems.value);
        this.logger.log(`Fetched ${jdItems.value.length} items from JD`);
      } else {
        this.logger.error(`JD fetch failed: ${jdItems.reason}`);
      }

      this.logger.log(`Total items before dedup: ${allItems.length}`);

      // Deduplicate
      const dedupedItems = this.deduplicateItems(allItems);
      this.logger.log(`Items after dedup: ${dedupedItems.length}`);

      // Upsert to database
      const upsertResults = await this.upsertItems(dedupedItems);
      result.added = upsertResults.added;
      result.updated = upsertResults.updated;
      result.skipped = upsertResults.skipped;

      // Trigger embeddings for new/updated items
      const embeddedCount = await this.triggerEmbeddings(upsertResults.itemIds);
      result.embedded = embeddedCount;

      this.logger.log(
        `Full sync completed: added=${result.added}, updated=${result.updated}, ` +
          `skipped=${result.skipped}, embedded=${result.embedded}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Full sync failed: ${errorMessage}`);
      throw error;
    }

    return result;
  }

  /**
   * Incremental sync: fetch only products modified since the given date.
   * Typically called hourly via scheduler.
   */
  async syncIncremental(since: Date): Promise<SyncResult> {
    this.logger.log(`Starting incremental sync since ${since.toISOString()}...`);

    const result: SyncResult = { added: 0, updated: 0, skipped: 0, embedded: 0 };

    try {
      // For incremental sync, we re-fetch recent items and check for updates
      const [taobaoItems, jdItems] = await Promise.allSettled([
        this.fetchRecentTaobaoItems(since),
        this.fetchRecentJDItems(since),
      ]);

      const allItems: SyncableItem[] = [];

      if (taobaoItems.status === "fulfilled") {
        allItems.push(...taobaoItems.value);
        this.logger.log(`Fetched ${taobaoItems.value.length} recent items from Taobao`);
      } else {
        this.logger.error(`Taobao incremental fetch failed: ${taobaoItems.reason}`);
      }

      if (jdItems.status === "fulfilled") {
        allItems.push(...jdItems.value);
        this.logger.log(`Fetched ${jdItems.value.length} recent items from JD`);
      } else {
        this.logger.error(`JD incremental fetch failed: ${jdItems.reason}`);
      }

      // Deduplicate
      const dedupedItems = this.deduplicateItems(allItems);

      // Filter to only items that might have changed (by checking updatedAt)
      const changedItems = await this.filterChangedItems(dedupedItems, since);

      // Upsert to database
      const upsertResults = await this.upsertItems(changedItems);
      result.added = upsertResults.added;
      result.updated = upsertResults.updated;
      result.skipped = upsertResults.skipped;

      // Trigger embeddings for new/updated items
      const embeddedCount = await this.triggerEmbeddings(upsertResults.itemIds);
      result.embedded = embeddedCount;

      this.logger.log(
        `Incremental sync completed: added=${result.added}, updated=${result.updated}, ` +
          `skipped=${result.skipped}, embedded=${result.embedded}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Incremental sync failed: ${errorMessage}`);
      throw error;
    }

    return result;
  }

  /**
   * Sync hot/trending items from both sources.
   * Typically called every 15 minutes via scheduler.
   * Prioritizes embedding for hot items.
   */
  async syncHotItems(): Promise<SyncResult> {
    this.logger.log("Starting hot items sync...");

    const result: SyncResult = { added: 0, updated: 0, skipped: 0, embedded: 0 };

    try {
      // Fetch trending items from both sources
      const hotKeywords = this.getHotKeywords();

      const [taobaoResults, jdResults] = await Promise.allSettled([
        this.fetchTaobaoHotItems(hotKeywords),
        this.fetchJDHotItems(hotKeywords),
      ]);

      const allItems: SyncableItem[] = [];

      if (taobaoResults.status === "fulfilled") {
        allItems.push(...taobaoResults.value);
        this.logger.log(`Fetched ${taobaoResults.value.length} hot items from Taobao`);
      } else {
        this.logger.error(`Taobao hot items fetch failed: ${taobaoResults.reason}`);
      }

      if (jdResults.status === "fulfilled") {
        allItems.push(...jdResults.value);
        this.logger.log(`Fetched ${jdResults.value.length} hot items from JD`);
      } else {
        this.logger.error(`JD hot items fetch failed: ${jdResults.reason}`);
      }

      // Deduplicate
      const dedupedItems = this.deduplicateItems(allItems);

      // Upsert to database
      const upsertResults = await this.upsertItems(dedupedItems);
      result.added = upsertResults.added;
      result.updated = upsertResults.updated;
      result.skipped = upsertResults.skipped;

      // Prioritize embedding for hot items (always re-embed to keep fresh)
      const embeddedCount = await this.triggerEmbeddings(upsertResults.itemIds);
      result.embedded = embeddedCount;

      // Mark hot items as featured
      await this.markAsFeatured(upsertResults.itemIds);

      this.logger.log(
        `Hot items sync completed: added=${result.added}, updated=${result.updated}, ` +
          `skipped=${result.skipped}, embedded=${result.embedded}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Hot items sync failed: ${errorMessage}`);
      throw error;
    }

    return result;
  }

  // ==================== Deduplication ====================

  /**
   * Deduplicate items using hash of title + brand + category as dedup key.
   * Also deduplicates by sourceId + source combination.
   */
  private deduplicateItems(items: SyncableItem[]): SyncableItem[] {
    const seen = new Map<string, SyncableItem>();

    for (const item of items) {
      // Primary dedup: sourceId + source
      const sourceKey = `${item.source}:${item.externalId}`;
      if (seen.has(sourceKey)) {
        continue;
      }

      // Secondary dedup: hash of title + brand + category
      const contentHash = this.generateDedupHash(item.name, item.brand, item.category);
      const dedupKey = `${item.source}:${contentHash}`;

      if (seen.has(dedupKey)) {
        // Keep the item with higher volume or more recent data
        const existing = seen.get(dedupKey)!;
        if ((item.volume || 0) > (existing.volume || 0)) {
          seen.set(dedupKey, item);
          seen.set(sourceKey, item);
        }
        continue;
      }

      seen.set(sourceKey, item);
      seen.set(dedupKey, item);
    }

    return Array.from(seen.values()).filter(
      (item, index, self) => index === self.findIndex((i) => i === item)
    );
  }

  /**
   * Generate dedup hash from title + brand + category
   */
  private generateDedupHash(title: string, brand?: string, category?: string): string {
    const normalizedTitle = (title || "").toLowerCase().trim();
    const normalizedBrand = (brand || "").toLowerCase().trim();
    const normalizedCategory = (category || "").toLowerCase().trim();
    const dedupString = `${normalizedTitle}|${normalizedBrand}|${normalizedCategory}`;
    return crypto.createHash("md5").update(dedupString).digest("hex");
  }

  // ==================== Database Upsert ====================

  /**
   * Upsert items to database via Prisma.
   * Uses externalId + source as the unique identifier.
   */
  private async upsertItems(
    items: SyncableItem[]
  ): Promise<{ added: number; updated: number; skipped: number; itemIds: string[] }> {
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const itemIds: string[] = [];

    for (const item of items) {
      try {
        // Check if item exists by externalId and source
        const existing = await this.prisma.clothingItem.findFirst({
          where: {
            externalId: item.externalId,
            source: item.source as Prisma.EnumDataSourceFilter,
            isDeleted: false,
          },
          select: { id: true, updatedAt: true },
        });

        if (existing) {
          // Update existing item
          await this.prisma.clothingItem.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              images: item.images,
              mainImage: item.mainImage,
              subcategory: item.subcategory,
              externalUrl: item.url,
              tags: item.tags || [],
              isActive: true,
            },
          });
          itemIds.push(existing.id);
          updated++;
        } else {
          // Create new item
          const clothingItem = await this.prisma.clothingItem.create({
            data: {
              name: item.name,
              description: item.description,
              price: item.price,
              originalPrice: item.originalPrice,
              images: item.images,
              mainImage: item.mainImage,
              category: this.mapToClothingCategory(item.category) as any,
              subcategory: item.subcategory,
              source: item.source as any,
              externalId: item.externalId,
              externalUrl: item.url,
              tags: item.tags || [],
              currency: "CNY",
              stock: 999, // Default stock for synced items
              isActive: true,
            },
          });
          itemIds.push(clothingItem.id);
          added++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to upsert item ${item.source}:${item.externalId}: ${errorMessage}`
        );
        skipped++;
      }
    }

    return { added, updated, skipped, itemIds };
  }

  // ==================== Embedding Trigger ====================

  /**
   * Trigger FashionSigLIP embedding for items via QdrantService.upsertBatch()
   */
  private async triggerEmbeddings(itemIds: string[]): Promise<number> {
    if (itemIds.length === 0) {
      return 0;
    }

    let embeddedCount = 0;

    try {
      // Fetch items that need embedding
      const items = await this.prisma.clothingItem.findMany({
        where: {
          id: { in: itemIds },
          isActive: true,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          tags: true,
          mainImage: true,
        },
      });

      // Generate embeddings in batches
      const batchSize = 20;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        try {
          const points = await Promise.all(
            batch.map(async (item) => {
              // Build text for embedding from item metadata
              const embeddingText = [
                item.name,
                item.description,
                item.category,
                ...(item.tags || []),
              ]
                .filter(Boolean)
                .join(" ");

              const vector = await this.qdrantService.getTextEmbedding(embeddingText);

              return {
                id: item.id,
                vector,
                payload: {
                  category: item.category,
                  name: item.name,
                  mainImage: item.mainImage,
                  isActive: true,
                },
              };
            })
          );

          await this.qdrantService.upsertBatch(points);
          embeddedCount += points.length;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Embedding batch failed (items ${i}-${i + batch.length}): ${errorMessage}`
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Embedding trigger failed: ${errorMessage}`);
    }

    return embeddedCount;
  }

  // ==================== Data Fetching ====================

  /**
   * Fetch all Taobao items across multiple pages
   */
  private async fetchAllTaobaoItems(): Promise<SyncableItem[]> {
    const items: SyncableItem[] = [];
    const maxPages = 5; // Limit pages to avoid excessive API calls
    const pageSize = 100;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const result = await this.taobaoClient.searchItems("", page, pageSize);
        items.push(...result.items.map((item) => this.mapTaobaoItem(item)));

        if (result.items.length < pageSize) {
          break; // No more items
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Taobao fetch page ${page} failed: ${errorMessage}`);
        break;
      }
    }

    return items;
  }

  /**
   * Fetch all JD items across multiple pages
   */
  private async fetchAllJDItems(): Promise<SyncableItem[]> {
    const items: SyncableItem[] = [];
    const maxPages = 5;
    const pageSize = 100;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const result = await this.jdClient.searchItems("", page, pageSize);
        items.push(...result.items.map((item) => this.mapJDItem(item)));

        if (result.items.length < pageSize) {
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`JD fetch page ${page} failed: ${errorMessage}`);
        break;
      }
    }

    return items;
  }

  /**
   * Fetch recent Taobao items (for incremental sync)
   */
  private async fetchRecentTaobaoItems(_since: Date): Promise<SyncableItem[]> {
    // Taobao API doesn't have a direct "modified since" filter,
    // so we fetch the latest page of results
    try {
      const result = await this.taobaoClient.searchItems("", 1, 50);
      return result.items.map((item) => this.mapTaobaoItem(item));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Taobao recent fetch failed: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Fetch recent JD items (for incremental sync)
   */
  private async fetchRecentJDItems(_since: Date): Promise<SyncableItem[]> {
    try {
      const result = await this.jdClient.searchItems("", 1, 50);
      return result.items.map((item) => this.mapJDItem(item));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`JD recent fetch failed: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Fetch Taobao hot items by trending keywords
   */
  private async fetchTaobaoHotItems(keywords: string[]): Promise<SyncableItem[]> {
    const items: SyncableItem[] = [];

    for (const keyword of keywords) {
      try {
        const result = await this.taobaoClient.searchItems(keyword, 1, 20);
        items.push(...result.items.map((item) => this.mapTaobaoItem(item)));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Taobao hot items fetch for "${keyword}" failed: ${errorMessage}`);
      }
    }

    return items;
  }

  /**
   * Fetch JD hot items by trending keywords
   */
  private async fetchJDHotItems(keywords: string[]): Promise<SyncableItem[]> {
    const items: SyncableItem[] = [];

    for (const keyword of keywords) {
      try {
        const result = await this.jdClient.searchItems(keyword, 1, 20);
        items.push(...result.items.map((item) => this.mapJDItem(item)));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`JD hot items fetch for "${keyword}" failed: ${errorMessage}`);
      }
    }

    return items;
  }

  // ==================== Mapping Helpers ====================

  private mapTaobaoItem(item: TaobaoItem): SyncableItem {
    return {
      externalId: item.itemId,
      source: "TAOBAO",
      name: item.title,
      description: item.description,
      price: item.price,
      originalPrice: item.originalPrice,
      images: item.images,
      mainImage: item.mainImage,
      category: item.category,
      subcategory: item.categoryPath,
      brand: item.brand,
      url: item.url,
      volume: item.volume,
      commissionRate: item.commissionRate,
      tags: [item.category, item.brand].filter(Boolean) as string[],
    };
  }

  private mapJDItem(item: JDItem): SyncableItem {
    return {
      externalId: item.skuId,
      source: "JD",
      name: item.skuName,
      description: item.description,
      price: item.price,
      originalPrice: item.originalPrice,
      images: item.images,
      mainImage: item.mainImage,
      category: item.category,
      subcategory: item.subcategory,
      brand: item.brandName,
      url: item.materialUrl || item.url,
      volume: item.inOrderCount30Days,
      commissionRate: item.commissionRate,
      tags: [item.category, item.subcategory, item.brandName].filter(Boolean) as string[],
    };
  }

  /**
   * Map free-text category to Prisma ClothingCategory enum.
   * Falls back to 'tops' if no match found.
   */
  private mapToClothingCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      上衣: "tops",
      衬衫: "tops",
      T恤: "tops",
      卫衣: "tops",
      毛衣: "tops",
      针织衫: "tops",
      下装: "bottoms",
      裤子: "bottoms",
      裙装: "dresses",
      连衣裙: "dresses",
      半身裙: "dresses",
      外套: "outerwear",
      大衣: "outerwear",
      夹克: "outerwear",
      羽绒服: "outerwear",
      鞋靴: "footwear",
      运动鞋: "footwear",
      配饰: "accessories",
      运动: "activewear",
      泳装: "swimwear",
      // English mappings
      tops: "tops",
      bottoms: "bottoms",
      dresses: "dresses",
      outerwear: "outerwear",
      footwear: "footwear",
      accessories: "accessories",
      activewear: "activewear",
      swimwear: "swimwear",
    };

    const lowerCategory = (category || "").toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key.toLowerCase())) {
        return value;
      }
    }

    return "tops"; // Default fallback
  }

  // ==================== Utility Helpers ====================

  /**
   * Filter items that have changed since the given date
   */
  private async filterChangedItems(items: SyncableItem[], since: Date): Promise<SyncableItem[]> {
    const changedItems: SyncableItem[] = [];

    for (const item of items) {
      const existing = await this.prisma.clothingItem.findFirst({
        where: {
          externalId: item.externalId,
          source: item.source as Prisma.EnumDataSourceFilter,
          isDeleted: false,
        },
        select: { id: true, updatedAt: true },
      });

      // Include if new or updated since the given date
      if (!existing || existing.updatedAt < since) {
        changedItems.push(item);
      }
    }

    return changedItems;
  }

  /**
   * Get hot/trending keywords for fashion items
   */
  private getHotKeywords(): string[] {
    // In production, these would come from a trending keywords service
    // or be dynamically determined from user search analytics
    const currentMonth = new Date().getMonth();
    const seasonalKeywords: Record<number, string[]> = {
      0: ["羽绒服", "毛衣", "冬季外套"], // Jan
      1: ["羽绒服", "毛衣", "冬季外套"], // Feb
      2: ["风衣", "针织衫", "春季外套"], // Mar
      3: ["衬衫", "薄外套", "春装"], // Apr
      4: ["连衣裙", "T恤", "夏装"], // May
      5: ["短袖", "短裤", "凉鞋"], // Jun
      6: ["短袖", "短裤", "凉鞋"], // Jul
      7: ["短袖", "短裤", "凉鞋"], // Aug
      8: ["衬衫", "薄外套", "秋装"], // Sep
      9: ["风衣", "针织衫", "秋季外套"], // Oct
      10: ["羽绒服", "毛衣", "冬季外套"], // Nov
      11: ["羽绒服", "毛衣", "冬季外套"], // Dec
    };

    return seasonalKeywords[currentMonth] || ["时尚", "新品", "热销"];
  }

  /**
   * Mark items as featured (for hot items)
   */
  private async markAsFeatured(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    try {
      await this.prisma.clothingItem.updateMany({
        where: {
          id: { in: itemIds },
          isDeleted: false,
        },
        data: {
          isFeatured: true,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to mark items as featured: ${errorMessage}`);
    }
  }
}

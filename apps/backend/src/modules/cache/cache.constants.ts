/**
 * Cache Key Constants
 * 缓存键前缀和 TTL 常量定义
 */

// 缓存键前缀
export const CACHE_KEYS = {
  // 用户相关
  USER: "user",
  USER_PROFILE: "user:profile",
  USER_STATS: "user:stats",

  // 衣柜相关
  WARDROBE_LIST: "wardrobe:list",
  WARDROBE_ITEM: "wardrobe:item",

  // 穿搭相关
  OUTFIT_LIST: "outfit:list",
  OUTFIT_RECOMMENDATIONS: "outfit:recommendations",
  OUTFIT_DETAIL: "outfit:detail",

  // 服装相关
  CLOTHING_LIST: "clothing:list",
  CLOTHING_DETAIL: "clothing:detail",
  CLOTHING_FEATURED: "clothing:featured",
  CLOTHING_TAGS: "clothing:tags",

  // 品牌相关
  BRAND_LIST: "brand:list",
  BRAND_DETAIL: "brand:detail",
} as const;

// TTL 常量（秒）
export const CACHE_TTL = {
  // 用户信息: 1小时
  USER: 60 * 60,

  // 用户资料: 30分钟
  USER_PROFILE: 30 * 60,

  // 衣柜列表: 5分钟
  WARDROBE_LIST: 5 * 60,

  // 衣柜单品: 10分钟
  WARDROBE_ITEM: 10 * 60,

  // 穿搭推荐: 10分钟
  OUTFIT_RECOMMENDATIONS: 10 * 60,

  // 穿搭列表: 5分钟
  OUTFIT_LIST: 5 * 60,

  // 服装列表: 3分钟
  CLOTHING_LIST: 3 * 60,

  // 服装详情: 10分钟
  CLOTHING_DETAIL: 10 * 60,

  // 精选服装: 5分钟
  CLOTHING_FEATURED: 5 * 60,

  // 热门标签: 30分钟
  CLOTHING_TAGS: 30 * 60,

  // 品牌列表: 1小时
  BRAND_LIST: 60 * 60,

  // 品牌详情: 30分钟
  BRAND_DETAIL: 30 * 60,

  // 短期缓存: 1分钟
  SHORT: 60,

  // 中期缓存: 5分钟
  MEDIUM: 5 * 60,

  // 长期缓存: 1小时
  LONG: 60 * 60,

  // 超长缓存: 24小时
  VERY_LONG: 24 * 60 * 60,
} as const;

/**
 * 生成缓存键的辅助函数
 */
export class CacheKeyBuilder {
  static user(userId: string): string {
    return `${CACHE_KEYS.USER}:${userId}`;
  }

  static userProfile(userId: string): string {
    return `${CACHE_KEYS.USER_PROFILE}:${userId}`;
  }

  static userStats(userId: string): string {
    return `${CACHE_KEYS.USER_STATS}:${userId}`;
  }

  static wardrobeList(userId: string, page?: number, limit?: number): string {
    const pagination = page && limit ? `:${page}:${limit}` : "";
    return `${CACHE_KEYS.WARDROBE_LIST}:${userId}${pagination}`;
  }

  static wardrobeItem(itemId: string): string {
    return `${CACHE_KEYS.WARDROBE_ITEM}:${itemId}`;
  }

  static outfitList(userId: string, page?: number, limit?: number): string {
    const pagination = page && limit ? `:${page}:${limit}` : "";
    return `${CACHE_KEYS.OUTFIT_LIST}:${userId}${pagination}`;
  }

  static outfitRecommendations(userId: string, options?: Record<string, unknown>): string {
    const optionsHash = options ? `:${JSON.stringify(options)}` : "";
    return `${CACHE_KEYS.OUTFIT_RECOMMENDATIONS}:${userId}${optionsHash}`;
  }

  static outfitDetail(outfitId: string): string {
    return `${CACHE_KEYS.OUTFIT_DETAIL}:${outfitId}`;
  }

  static clothingList(filters: Record<string, unknown>): string {
    const filterHash = JSON.stringify(filters);
    return `${CACHE_KEYS.CLOTHING_LIST}:${filterHash}`;
  }

  static clothingDetail(itemId: string): string {
    return `${CACHE_KEYS.CLOTHING_DETAIL}:${itemId}`;
  }

  static clothingFeatured(limit: number): string {
    return `${CACHE_KEYS.CLOTHING_FEATURED}:${limit}`;
  }

  static clothingTags(limit: number): string {
    return `${CACHE_KEYS.CLOTHING_TAGS}:${limit}`;
  }

  static brandList(): string {
    return CACHE_KEYS.BRAND_LIST;
  }

  static brandDetail(brandId: string): string {
    return `${CACHE_KEYS.BRAND_DETAIL}:${brandId}`;
  }
}

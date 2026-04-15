/**
 * @deprecated 使用 common/redis/RedisKeyBuilder 替代，此文件将在下个版本移除
 */

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
  OUTFIT_COMBINATIONS: "outfit:combinations",
  OUTFIT_DETAIL: "outfit:detail",

  // 风格指南
  STYLE_GUIDE: "recommendations:style-guide",

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

  // 搭配组合推荐: 1小时
  OUTFIT_COMBINATIONS: 60 * 60,

  // 风格指南: 30分钟
  STYLE_GUIDE: 30 * 60,

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

  // Phase 9: Performance-specific TTLs
  PRODUCT_DETAIL: 5 * 60,       // 5 min
  PRODUCT_LIST: 2 * 60,         // 2 min
  RECOMMENDATION: 3 * 60,       // 3 min
  CATEGORY: 10 * 60,            // 10 min
  DASHBOARD_STATS: 5 * 60,      // 5 min
  USER_PROFILE_CACHE: 10 * 60,  // 10 min
  SEARCH_RESULTS: 60,           // 1 min
} as const;

/**
 * 生成缓存键的辅助函数
 */
/**
 * @deprecated 请使用 common/redis/RedisKeyBuilder 作为唯一权威缓存键构建器。
 * CacheKeyBuilder 将在下个版本移除，所有缓存键构建逻辑应迁移至 RedisKeyBuilder。
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

  static outfitCombinations(userId: string, options?: Record<string, unknown>): string {
    const optionsHash = options ? `:${JSON.stringify(options)}` : "";
    return `${CACHE_KEYS.OUTFIT_COMBINATIONS}:${userId}${optionsHash}`;
  }

  static outfitDetail(outfitId: string): string {
    return `${CACHE_KEYS.OUTFIT_DETAIL}:${outfitId}`;
  }

  static styleGuide(userId: string): string {
    return `${CACHE_KEYS.STYLE_GUIDE}:${userId}`;
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

  // Phase 9: Performance-specific key builders
  static recommendations(userId: string, type: string): string {
    return `cache:rec:${userId}:${type}`;
  }

  static categoryList(): string {
    return "cache:category:all";
  }

  static dashboardStats(period: string): string {
    return `cache:dashboard:${period}`;
  }

  static searchResults(query: string, filters: Record<string, unknown>): string {
    const hash = JSON.stringify({ q: query, f: filters });
    return `cache:search:${hash}`;
  }
}

// Phase 9: Cache invalidation patterns by event
export const CACHE_INVALIDATION_PATTERNS: Record<string, string[]> = {
  "product.updated": ["cache:product:*", "cache:category:*"],
  "product.created": ["cache:product:*", "cache:category:*"],
  "product.deleted": ["cache:product:*", "cache:category:*"],
  "order.created": ["cache:dashboard:*"],
  "order.updated": ["cache:dashboard:*"],
  "user.profile_updated": ["cache:profile:*", "user:profile:*"],
};

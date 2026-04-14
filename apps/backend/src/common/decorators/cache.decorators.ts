import { SetMetadata } from "@nestjs/common";

export const CACHE_KEY_METADATA = "cache:key";
export const CACHE_TTL_METADATA = "cache:ttl";
export const CACHE_CLEAR_METADATA = "cache:clear";

/**
 * Set cache key pattern for the endpoint.
 * Use in combination with @CacheTTL() on GET endpoints.
 */
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);

/**
 * Set cache TTL in seconds.
 */
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);

/**
 * Invalidate cache patterns after the handler executes.
 * Used on mutation endpoints (POST/PUT/PATCH/DELETE).
 */
export const CacheClear = (patterns: string[]) =>
  SetMetadata(CACHE_CLEAR_METADATA, patterns);

# AiNeed Backend Performance Report

**Date:** 2026-04-14
**Environment:** localhost:3001, Node v24, Windows 11, RTX 4060
**Test User:** perf-test@example.com

---

## 1. API Response Time Baselines

Methodology: 5 sequential requests per endpoint using curl with wall-clock timing (ms). First request includes cold-start/JIT overhead; subsequent requests reflect warm cache.

### Response Time Summary

| Endpoint | Min (ms) | Max (ms) | Avg (ms) | P50 (ms) | P95 (ms) | Auth |
|---|---|---|---|---|---|---|
| GET /api/v1/auth/me | 40 | 98 | 57 | 48 | 98 | Bearer |
| GET /api/v1/profile | 40 | 81 | 50 | 43 | 81 | Bearer |
| GET /api/v1/clothing?limit=10 | 36 | 118 | 59 | 40 | 118 | Bearer |
| GET /api/v1/recommendations | 48 | 177 | 85 | 60 | 177 | Bearer |
| GET /api/v1/health | 43 | 53 | 50 | 53 | 53 | None |

### Detailed Per-Run Data

**GET /api/v1/auth/me:** 98, 40, 47, 48, 50
**GET /api/v1/profile:** 81, 42, 40, 43, 43
**GET /api/v1/clothing?limit=10:** 118, 40, 66, 37, 36
**GET /api/v1/recommendations:** 177, 48, 60, 54, 84
**GET /api/v1/health:** 53, 53, 43, 46, 53

### Observations

- **Cold-start penalty**: First requests show 2-3x higher latency (98ms vs 48ms for auth/me, 177ms vs 60ms for recommendations).
- **Recommendations is the slowest endpoint** at 85ms avg, with the highest variance (48-177ms range).
- **Health endpoint is stable** with minimal variance (43-53ms), indicating Redis/DB connection checks are efficient.
- **Clothing list is well-optimized** after warm-up (36-40ms for subsequent requests).

---

## 2. N+1 Query Findings

### clothing.service.ts

**Status: Mostly resolved, one remaining issue**

- `getItems()` / `performDatabaseQuery()`: **GOOD** -- Uses batch brand lookup pattern. Collects all brandIds from items, then fetches brands in a single `findMany({ where: { id: { in: brandIds } } })` query, and maps via a `brandsMap`. This correctly avoids N+1 for the list endpoint.

- `getSubcategories()` (line 522-553): **N+1 DETECTED** -- For each distinct category+subcategory combination, a separate `count()` query is executed inside a `for` loop:
  ```typescript
  for (const item of items) {
    // ...
    const count = await this.prisma.clothingItem.count({
      where: { category: cat, subcategory: item.subcategory, isActive: true, isDeleted: false },
    });
  }
  ```
  This issues N queries where N = number of distinct subcategories. Should use a single `groupBy` query instead.

- `getOutfitRecommendations()` (line 559-614): **N+1 DETECTED** -- Nested loop queries: outer loop iterates `limit` times (default 5), inner loop iterates `categories` (2-3 per outfit). Each inner iteration issues a separate `findMany`. Total queries = limit * categories (up to 15 queries for 5 outfits with 3 categories each).

- `search()`: **GOOD** -- Uses `include: { brand }` in a single query.

- `getFeaturedItems()`: **GOOD** -- Single query with `include: { brand: true }`.

- `getItemById()`: **GOOD** -- Single query with `select` including `brand: true`.

### recommendations.service.ts

**Status: Multiple N+1 patterns detected**

- `buildUserInteractionSummary()` (line 308-378): **Multiple sequential queries, but parallelized** -- Three queries (favorites, behaviors, cartItems) are correctly run with `Promise.all`. However, two additional follow-up queries are not parallelized:
  1. `extractPreferredColors()` issues a separate `findMany` for color data
  2. A separate `findMany` for `viewedItems` category statistics
  
  These two could be merged or parallelized with the initial batch.

- `getOutfitRecommendations()` (line 196-228): **N+1 DETECTED** -- Iterates over outfit templates and calls `assembleOutfit()` for each one sequentially. Each `assembleOutfit()` in turn calls `fetchCandidateItems()` per slot, resulting in templates.length * slots.length queries (up to 5 * 4 = 20 sequential DB queries).

- `assembleOutfit()` (line 634-691): **N+1 DETECTED** -- Loops over template slots, calling `fetchCandidateItems()` for each slot category sequentially. These could be parallelized with `Promise.all`.

- `extractPreferredColors()` (line 380-400): **GOOD** -- Single batch query for item colors.

### order.service.ts

**Status: Mostly good, one issue**

- `create()`: **GOOD** -- Uses batch `findMany({ where: { id: { in: itemIds } } })` to fetch all items at once (comment says "修复 N+1 查询问题"). Uses `itemMap` for lookup.

- `cancel()` (line 354-398): **N+1 DETECTED** -- Inside a transaction, iterates over order items and issues a separate `update` for each item's stock restoration:
  ```typescript
  for (const item of orderWithItems?.items || []) {
    await tx.clothingItem.update({
      where: { id: item.itemId },
      data: { stock: { increment: item.quantity } },
    });
  }
  ```
  This issues N update queries for N items. Should use a batch `updateMany` with raw SQL or individual updates in parallel.

- `findAll()` / `getOrdersByTab()`: **GOOD** -- Uses `Promise.all` for count + findMany. Uses `include: { items: true, address: true }` for eager loading.

- `findOne()`: **GOOD** -- Single query with `include`.

### cart.service.ts

**Status: Good, well-optimized**

- `getCart()`: **GOOD** -- Single query with nested `include: { item: { include: { brand } } }`. Proper eager loading.

- `addItem()`: **GOOD** -- Single findUnique with include, then single create/update.

- `getCartSummary()`: **GOOD** -- Single query with `select: { quantity, selected, item: { select: { price } } }`. Lightweight and efficient.

- `getCartSummaryWithCoupon()`: **GOOD** -- Same efficient pattern as getCartSummary.

- `moveToFavorites()` (line 480-503): **Minor N+1** -- Loops over cart items and calls `upsert` for each one sequentially inside a transaction. Could use `createMany` for new favorites.

---

## 3. Cache Strategy Assessment

### Current Cache Coverage

| Service | Method | Cache Key Pattern | TTL | Assessment |
|---|---|---|---|---|
| ClothingService | getItems() | `clothing:list:*` | CACHE_TTL.CLOTHING_LIST | Good -- cached with filter-aware keys |
| ClothingService | getItemById() | `clothing:detail:*` | CACHE_TTL.CLOTHING_DETAIL | Good -- per-item cache |
| ClothingService | getFeaturedItems() | `clothing:featured:*` | CACHE_TTL.CLOTHING_FEATURED | Good |
| ClothingService | getPopularTags() | `clothing:tags:*` | CACHE_TTL.CLOTHING_TAGS | Good |
| RecommendationsService | getPersonalizedRecommendations() | `outfit:recs:*` | CACHE_TTL.OUTFIT_RECOMMENDATIONS | Good -- personalized cache |
| OrderService | *none* | N/A | N/A | **Missing** -- No caching at all |
| CartService | *none* | N/A | N/A | **Missing** -- No caching (acceptable for mutable data) |

### Cache Invalidation

- ClothingService correctly invalidates on `update()` and `remove()`:
  - Deletes detail cache for specific item
  - Deletes pattern `clothing:list` for all list caches
  - Uses `Promise.all` for parallel invalidation

### Missing Caching Opportunities

1. **ClothingService.getSubcategories()** -- No cache. Results change infrequently; ideal candidate for long-TTL cache.

2. **ClothingService.search()** -- No cache. Popular search terms could benefit from short-TTL caching.

3. **ClothingService.getOutfitRecommendations()** -- No cache on the per-item outfit method (different from RecommendationsService which does cache).

4. **RecommendationsService.getOutfitRecommendations()** -- **No cache** despite being the most expensive endpoint. The `getPersonalizedRecommendations()` method is cached, but `getOutfitRecommendations()` (the endpoint tested at `/api/v1/recommendations`) is NOT cached.

5. **RecommendationsService.getStyleGuide()** -- No cache. Profile data changes infrequently.

### Cache Key Design

- `CacheKeyBuilder` pattern is well-designed with structured key generation.
- Clothing list keys include all filter parameters, ensuring cache correctness.
- Recommendation keys include userId, category, occasion, season, and limit.

---

## 4. Prisma `include` vs Separate Query Patterns

### Proper include Usage

| Location | Pattern | Assessment |
|---|---|---|
| ClothingService.getItems() | Brand fetched in separate batch query | Good -- avoids include + select conflict |
| ClothingService.getItemById() | `select: { ... brand: true }` | Good |
| ClothingService.search() | `include: { brand }` | Good |
| RecommendationsService.fetchCandidateItems() | `select: { ... brand: { select } }` | Good |
| OrderService.findAll() | `include: { items: true, address: true }` | Good |
| CartService.getCart() | `include: { item: { include: { brand } } }` | Good |

### Issues Found

1. **ClothingService.getItems()** uses a separate brand query rather than `include`. This was a deliberate choice (comment says "延迟加载 brand 信息，避免 N+1 查询"), but it means the list query does NOT use `select: { ... brand: { select } }` directly. The separate brand query pattern adds one extra round-trip that could be avoided with a nested `select`. However, this is a minor optimization -- the current approach is still O(1) queries, not N+1.

2. **ClothingService.getOutfitRecommendations()** uses `include: { brand }` inside a loop, which is correct for each individual query, but the problem is the loop itself creates multiple queries.

---

## 5. Recommendations for Optimization

### Critical (High Impact)

1. **Cache RecommendationsService.getOutfitRecommendations()** -- This is the most expensive endpoint (177ms cold, 60-84ms warm) and has NO caching. Add `CacheService.getOrSet()` with `CACHE_TTL.OUTFIT_RECOMMENDATIONS`, similar to `getPersonalizedRecommendations()`.

2. **Fix N+1 in ClothingService.getSubcategories()** -- Replace the loop-based count queries with a single `groupBy`:
   ```typescript
   const counts = await this.prisma.clothingItem.groupBy({
     by: ['category', 'subcategory'],
     where: { isActive: true, isDeleted: false },
     _count: { id: true },
   });
   ```

3. **Fix N+1 in RecommendationsService.assembleOutfit()** -- Parallelize slot queries:
   ```typescript
   const slotResults = await Promise.all(
     template.slots.map(slot => this.fetchCandidateItems(profile, interactions, { category: slot, ... }, 10))
   );
   ```

4. **Fix N+1 in ClothingService.getOutfitRecommendations()** -- Parallelize category queries per iteration, or batch all category queries upfront.

### Important (Medium Impact)

5. **Fix N+1 in OrderService.cancel()** -- Replace sequential stock update loop with batch updates inside the transaction.

6. **Parallelize RecommendationsService.buildUserInteractionSummary() follow-up queries** -- The `extractPreferredColors()` and `viewedItems` queries could be run in parallel with the initial `Promise.all` batch.

7. **Add caching to ClothingService.getSubcategories()** -- Results change infrequently; use a medium-TTL cache (5-15 min).

8. **Add caching to ClothingService.search()** -- Use short-TTL cache (1-2 min) for popular search queries.

9. **Add caching to RecommendationsService.getStyleGuide()** -- Profile-based, changes infrequently.

### Nice-to-Have (Low Impact)

10. **Merge ClothingService list brand query into the main select** -- Use nested `select: { ... brand: { select: { id, name, logo } } }` instead of a separate brand query. Saves one DB round-trip.

11. **Batch CartService.moveToToFavorites()** upserts -- Use `createMany` or parallel `Promise.all` for favorite creation.

12. **Add connection pooling monitoring** -- Health endpoint shows Redis latency at 7ms and DB at 7ms, which is good. Consider adding connection pool metrics to health checks.

---

## 6. Summary

| Metric | Value |
|---|---|
| Avg response time (warm) | 37-60ms |
| Avg response time (cold) | 81-177ms |
| Worst endpoint | /api/v1/recommendations (85ms avg) |
| N+1 patterns found | 4 critical, 2 minor |
| Cache coverage | Clothing: good, Recommendations: partial, Order/Cart: none |
| Most impactful fix | Cache the recommendations endpoint |

The backend performs reasonably well for a development environment. The primary optimization target is the recommendations endpoint, which combines uncached expensive queries with sequential N+1 patterns in outfit assembly. Caching this endpoint alone could reduce its response time from 85ms avg to under 10ms for repeat requests.
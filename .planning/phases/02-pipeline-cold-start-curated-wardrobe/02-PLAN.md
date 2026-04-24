---
wave: 1
depends_on: [01-PLAN.md]
files_modified:
  - apps/backend/prisma/schema.prisma
  - apps/backend/src/domains/fashion/wardrobe/wardrobe.service.ts
  - apps/backend/src/domains/fashion/wardrobe/wardrobe.controller.ts
  - apps/backend/src/domains/fashion/wardrobe/wardrobe.module.ts
  - apps/backend/src/domains/fashion/wardrobe/dto/wardrobe-query.dto.ts
  - apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
  - apps/backend/src/domains/platform/recommendations/services/wardrobe-complementary.service.ts
  - apps/backend/src/domains/platform/recommendations/recommendations.module.ts
requirements_addressed: [CUR-01, CUR-02]
autonomous: true
---

# Plan 02: Curated Wardrobe Model + Preference Complementary Logic

**Objective:** Introduce the CuratedWardrobe concept with three sections (savedOutfits, wishlistedItems, purchasedItems) replacing the ownedItems model. Build preference-complementary recommendation logic that suggests unexplored style directions.

## Task 1: Add CuratedWardrobe sections to schema (CUR-01)

<read_first>

- apps/backend/prisma/schema.prisma (lines 1624-1719 — UserClothing, Outfit, OutfitItem)
- apps/backend/prisma/schema.prisma (lines 549-563 — Favorite model)
- apps/backend/prisma/schema.prisma (lines 1507-1582 — Order, OrderItem)
  </read_first>

<action>
The curated wardrobe uses EXISTING models with a unifying view layer, rather than creating entirely new models. This avoids migration complexity while delivering the three-section UX.

1. **savedOutfits** → Already exists as `Outfit` model. No schema change needed.

2. **wishlistedItems** → Already exists as `Favorite` model (ClothingItem favorites). Add a `section` field to distinguish between general favorites and curated wishlist:
   a. Add enum `WardrobeSection { saved_outfit wishlisted purchased }` to schema
   b. Add `section WardrobeSection @default(wishlisted)` to `Favorite` model
   c. This allows the same Favorite model to serve both general favorites and curated wishlist
   d. Run `npx prisma migrate dev --name add_wardrobe_section`

3. **purchasedItems** → Already exists as `OrderItem` linked through `Order`. Create a DB view or service-layer query that resolves:

   - `Order` where `userId` AND `status` in `['paid', 'shipped', 'received', 'completed']`
   - Join with `OrderItem` and `ClothingItem` to get full item details
   - No schema change needed — this is a service-layer aggregation

4. **CuratedWardrobeService** (new service in wardrobe domain):
   a. Method `getCuratedWardrobe(userId)` returns:

   ```typescript
   interface CuratedWardrobe {
     savedOutfits: Outfit[]; // from Outfit model
     wishlistedItems: ClothingItem[]; // from Favorite with section=wishlisted
     purchasedItems: ClothingItem[]; // from Order + OrderItem where status=completed
   }
   ```

   b. Method `moveToWishlist(userId, itemId)` — add to favorites with section=wishlisted
   c. Method `removeFromWishlist(userId, itemId)` — remove from favorites
   d. Method `markAsPurchased(userId, itemId)` — auto-detected from orders, or manual mark
   e. Method `getSectionStats(userId)` — counts per section + style distribution

5. Add WardrobeSection enum to `prisma-enums.ts` type file.
   </action>

<acceptance_criteria>

- `WardrobeSection` enum added to Prisma schema
- `Favorite` model has `section` field with default `wishlisted`
- `CuratedWardrobeService` with `getCuratedWardrobe`, `moveToWishlist`, `removeFromWishlist`, `getSectionStats`
- Prisma migration runs successfully
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 2: Curated Wardrobe controller endpoints (CUR-01 API)

<read_first>

- apps/backend/src/domains/fashion/wardrobe/wardrobe.controller.ts
- apps/backend/src/domains/fashion/wardrobe/wardrobe.module.ts
  </read_first>

<action>
1. Add new endpoints to `WardrobeController` (or create a separate `CuratedWardrobeController`):
   a. `GET /wardrobe/curated` — returns full CuratedWardrobe (all three sections)
   b. `GET /wardrobe/curated/wishlist` — paginated wishlist items
   b. `POST /wardrobe/curated/wishlist/:itemId` — add to wishlist
   c. `DELETE /wardrobe/curated/wishlist/:itemId` — remove from wishlist
   d. `GET /wardrobe/curated/purchased` — paginated purchased items (from orders)
   e. `GET /wardrobe/curated/stats` — section counts + style distribution

2. Add query DTO for filtering:

   - `section` filter (saved_outfit | wishlisted | purchased)
   - `category` filter
   - `season` filter
   - `sort` (newest/oldest/most_worn)

3. Register `CuratedWardrobeService` in `WardrobeModule`.
   </action>

<acceptance_criteria>

- All 5 curated wardrobe endpoints functional
- Proper auth guards (JWT required)
- Pagination support on list endpoints
- Swagger/OpenAPI decorators on all endpoints
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 3: Preference-complementary recommendation logic (CUR-02)

<read_first>

- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
- apps/backend/src/domains/fashion/wardrobe/wardrobe.service.ts
  </read_first>

<action>
1. Create `WardrobeComplementaryService` in recommendations services directory:
   a. Method `getUnexploredStyles(userId)`:
      - Query user's wardrobe items (UserClothing + Favorite) to get existing style distribution
      - Compare against the full style universe (`minimalist, classic, romantic, edgy, casual, sporty, streetwear, elegant, trendy, bohemian`)
      - Return styles with < 10% representation in user's wardrobe — these are "unexplored"

b. Method `getComplementaryRecommendations(userId, context)`: - Get user's dominant styles from preference learning - Get unexplored styles from wardrobe analysis - Find items that BRIDGE the user's current style with unexplored directions - Example: user is "minimalist" heavy → recommend items that are "minimalist + elegant" or "minimalist + classic" as bridge pieces - Use the `styleItemMapping` from ColdStartService for item lookup - Score bridge items higher than pure-explore items (bridge = familiar + new, explore = purely new)

c. Method `getStyleGaps(userId)`: - Analyze wardrobe category coverage: does user have enough tops/bottoms/outerwear/accessories/footwear? - Return gap categories where user has < 2 items - This feeds into the orchestrator for "complete your wardrobe" recommendations

2. Integrate into `RecommendationOrchestrator`:
   a. Inject `WardrobeComplementaryService`
   b. In the `recommend()` method, after `fuseAndExplain()`:

   - Mix in 1-2 complementary recommendations (10-15% of result set)
   - These are marked with `source: "wardrobe-complementary"` and `reason: "探索新风格方向"` or `"补全你的${gapCategory}收藏"`
     c. In `getColdStartRecommendations()`:
   - Skip complementary logic (no wardrobe data yet)

3. The complementary items should have their `explanation.why` clearly state the bridge logic:
   - "这件单品可以搭配你现有的${existingStyle}风格，同时探索${newStyle}方向"
   - "你的衣橱缺少${gapCategory}，这件能补全整体搭配"
     </action>

<acceptance_criteria>

- `WardrobeComplementaryService` with `getUnexploredStyles`, `getComplementaryRecommendations`, `getStyleGaps`
- Orchestrator mixes 1-2 complementary items into regular recommendations
- Complementary items have clear explanation text
- Cold-start users skip complementary logic
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Final Quality Gate

```bash
# Verify WardrobeSection enum exists
grep -n "WardrobeSection" apps/backend/prisma/schema.prisma
# Should show the enum and Favorite.section field

# Verify CuratedWardrobeService
grep -n "getCuratedWardrobe\|moveToWishlist\|getSectionStats" apps/backend/src/domains/fashion/wardrobe/curated-wardrobe.service.ts
# Should show all methods

# Verify complementary service
grep -n "getUnexploredStyles\|getComplementaryRecommendations\|getStyleGaps" apps/backend/src/domains/platform/recommendations/services/wardrobe-complementary.service.ts
# Should show all methods

# Verify orchestrator integration
grep -n "WardrobeComplementary\|wardrobe-complementary" apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
# Should show injection and usage

# Type check
cd C:/AiNeed/apps/backend && npx tsc --noEmit
echo "Exit code: $?"
```

**SUCCESS CRITERIA:**

- Three curated wardrobe sections queryable via API (CUR-01)
- Favorite model extended with WardrobeSection enum
- Preference-complementary recommendations mixed into results (CUR-02)
- `tsc --noEmit` zero errors

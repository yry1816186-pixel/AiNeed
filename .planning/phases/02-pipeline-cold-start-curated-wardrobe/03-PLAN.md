---
wave: 2
depends_on: [01-PLAN.md, 02-PLAN.md]
files_modified:
  - apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
  - apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts
  - apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts
  - apps/backend/prisma/seeds/clothing.seed.ts
  - apps/backend/prisma/seeds/feature-flag.seed.ts
requirements_addressed: [REC-04, REC-05]
autonomous: true
---

# Plan 03: Pipeline Verification + Output Standardization + Seed Matrix

**Objective:** Ensure every recommendation path produces the standardized `RecommendationOutput` (items + outfit + explanation). Verify degraded pipeline produces visible outfits. Verify mock data covers the scenario × category × price matrix.

## Task 1: Standardize all output paths to RecommendationOutput (REC-04)

<read_first>

- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts (lines 520-580)
  </read_first>

<action>
The orchestrator currently returns `RecommendationResult[]` from most methods. The `RecommendationOutput` type (with items + outfit + explanation) exists but is not used consistently. Standardize the public API.

1. In `recommendation.types.ts`, verify `RecommendationOutput` interface:

   ```typescript
   export interface RecommendationOutput {
     items: RecommendationOutputItem[];
     outfit?: { name: string; description: string; items: RecommendationOutputItem[] };
     explanation: RecommendationExplanationDetail; // why, alternative, nextAction, confidence
     experimentId?: string;
     degraded?: boolean;
   }
   ```

2. Add a private method `toRecommendationOutput(results: RecommendationResult[], context?: { occasion?: string; season?: string; weather?: string }, isDegraded?: boolean): RecommendationOutput` to the orchestrator:
   a. Map `RecommendationResult[]` → `RecommendationOutputItem[]` (extract id, name, imageUrl, category, price, score, explanation from each result)
   b. Generate outfit grouping: if results span 3+ categories, auto-group into an outfit with a generated name like `"${occasion}搭配方案"`
   c. Use the first result's explanation as the batch explanation, but add ensemble context
   d. Set `degraded` flag when coming from degraded pipeline
   e. Carry `experimentId` from the batch

3. Update public-facing orchestrator methods to return `RecommendationOutput`:
   a. `getRecommendations()` → wrap return in `toRecommendationOutput()`
   b. `getDailyOutfitRecommendation()` → already returns `{ items, outfitName, description }`, convert to `RecommendationOutput`
   c. `getOccasionRecommendations()` → wrap in `toRecommendationOutput()`
   d. `getTrendingRecommendations()` → wrap in `toRecommendationOutput()`
   e. `getColdStartRecommendations()` → wrap in `toRecommendationOutput()`
   f. `degradedPipeline()` → wrap in `toRecommendationOutput()` with `degraded: true`
   g. `getOutfitRecommendations()` → already returns `OutfitRecommendation`, convert to `RecommendationOutput`
   h. Keep `recommend()` as internal method returning `RecommendationResult[]` (used by other orchestrator methods, not exposed)

4. Update controller to return `RecommendationOutput` from all endpoints that call orchestrator methods returning this type.

5. Verify every `RecommendationOutput` has:
   - `items` array with at least 1 item
   - `explanation.why` — non-empty string
   - `explanation.alternative` — non-empty string
   - `explanation.nextAction` — non-empty string
   - `explanation.confidence` — number between 0 and 1
   - `experimentId` — string (present on all paths)
     </action>

<acceptance_criteria>

- All 7 public-facing orchestrator methods return `RecommendationOutput`
- Every output has items + explanation (why, alternative, nextAction, confidence)
- Every output has experimentId
- Degraded outputs have `degraded: true`
- Controller types updated to match
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 2: Degraded pipeline produces visible outfit plans (REC-05)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts (getDegradedRecommendations method)
- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts (degradedPipeline method)
  </read_first>

<action>
1. In `RuleEngineService.getDegradedRecommendations()`:
   a. Enhance the weather+season+scene template system:
      - Define template outfits for each combination: `{season} × {occasion}` → fixed outfit template
      - Example: `winter × interview` → `["深色西装外套", "白色衬衫", "黑色西裤", "牛津鞋"]`
      - Example: `summer × casual` → `["短袖T恤", "短裤", "帆布鞋", "墨镜"]`
      - Have at least 4 templates per major season (spring/summer/autumn/winter) × 3 occasions (daily/interview/date) = 12 minimum templates
   b. When AI is unavailable, look up the matching template and find real ClothingItems that match each template slot by category and tags
   c. Return fully populated items (not just IDs with empty fields as currently happens in `degradedPipeline`)
   d. Include a generated explanation: `"基于${season}${occasion}场景的搭配建议（AI 暂时不可用，使用经典模板）"`

2. Fix `degradedPipeline()` in orchestrator:
   a. Currently returns items with empty name/price/category/images — this must be fixed
   b. After getting `degradedRecs` from rule engine, fetch actual `ClothingItem` records for each recommendation
   c. Populate `item.name`, `item.price`, `item.category`, `item.images`, `item.brand` from the database records
   d. This ensures degraded results are visually complete even when AI is down

3. Test the degraded path manually:
   a. Temporarily force degraded mode and call `GET /recommendations?occasion=interview&season=winter`
   b. Verify items have real names, prices, images
   c. Verify outfit grouping makes sense
   </action>

<acceptance_criteria>

- Degraded pipeline returns items with full data (name, price, category, images, brand)
- Template system covers ≥12 season×occasion combinations
- Every degraded output has explanation mentioning template fallback
- `degraded: true` flag set on output
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 3: Verify mock data covers scenario × category × price matrix (FND-05 carry-over)

<read_first>

- apps/backend/prisma/seeds/clothing.seed.ts
- apps/backend/prisma/seed-massive-clothing.ts
  </read_first>

<action>
1. Write a verification script (or inline check) that analyzes the seed data coverage:
   a. Count items per `category` (tops/bottoms/dresses/outerwear/footwear/accessories/activewear/swimwear)
   b. Count items per price tier: budget (<200), mid (200-500), premium (500-1000), luxury (>1000)
   c. Count items with occasion-relevant tags: interview, date, commute, casual, workout, party, travel
   d. Count items per season tag: spring, summer, autumn, winter

2. Identify gaps in the matrix:
   a. Categories with < 10 items → needs more seed data
   b. Price tiers with < 5 items per category → needs more seed data
   c. Occasions with < 5 items → needs more seed data
   d. Seasons with < 10 items → needs more seed data

3. If gaps exist, add items to `clothing.seed.ts`:
   a. Target: ≥10 items per category × price tier combination
   b. Target: ≥5 items per occasion × category combination
   c. Target: items in all 4 seasons
   d. Use realistic Chinese product names and descriptions
   e. Ensure brand diversity (don't put all items under one brand)

4. The goal: when a cold-start user with `primaryScenarios: ["interview"]` requests recommendations, the system should find ≥5 interview-appropriate items across categories and price points.
   </action>

<acceptance_criteria>

- Every category has ≥10 items across price tiers
- Every major occasion (interview, date, commute, casual, workout, party, travel) has ≥5 items
- All 4 seasons represented in seed data
- Price range spans budget to premium (no luxury needed for sprint)
- Cold-start request for any scenario returns populated results
  </acceptance_criteria>

---

## Task 4: End-to-end pipeline verification

<read_first>

- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/recommendations.controller.ts
  </read_first>

<action>
1. Run the full pipeline verification checklist:
   a. `GET /recommendations` with a test user → returns `RecommendationOutput` with all fields
   b. `GET /recommendations/daily` → returns `RecommendationOutput` with outfit grouping
   c. `GET /recommendations/occasion?occasion=interview` → returns `RecommendationOutput` with interview-appropriate items
   d. `GET /recommendations/trending` → returns `RecommendationOutput` (no auth)
   e. `GET /recommendations/cold-start` → returns `RecommendationOutput` for new user
   f. `GET /recommendations/complete-the-look/:id` → returns `RecommendationOutput`

2. For each endpoint, verify:

   - `items` array is non-empty
   - Each item has `id, name, imageUrl, category, price, score, explanation`
   - `explanation.why` is a meaningful Chinese string (not placeholder)
   - `explanation.confidence` is between 0 and 1
   - `experimentId` is present and non-empty

3. Verify degraded path:
   a. Temporarily mock the AI pipeline to throw an error
   b. Call `GET /recommendations` → should still return `RecommendationOutput` with `degraded: true`
   c. Items should have full data, not empty fields

4. Run `tsc --noEmit` one final time to confirm zero errors.
   </action>

<acceptance_criteria>

- All 6+ endpoints return properly structured `RecommendationOutput`
- No empty fields in any output path
- Degraded path returns visually complete data
- `experimentId` present on all outputs
- `tsc --noEmit` zero errors
  </acceptance_criteria>

---

## Final Quality Gate

```bash
# Verify RecommendationOutput usage
grep -n "RecommendationOutput" apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
# Should show return type annotations on public methods

# Verify degraded pipeline populates items
grep -n "name\|price\|category\|images" apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts | head -20
# Degraded items should have populated fields

# Verify template coverage
grep -c "winter\|summer\|spring\|autumn" apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts
# Should have seasonal template entries

# Verify seed coverage
cd C:/AiNeed/apps/backend && npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const cats = await p.clothingItem.groupBy({ by: ['category'], _count: true });
  cats.forEach(c => console.log(c.category, c._count));
  await p.\$disconnect();
})();
"

# Final type check
cd C:/AiNeed/apps/backend && npx tsc --noEmit
echo "Exit code: $?"
```

**SUCCESS CRITERIA:**

- All recommendation outputs follow `RecommendationOutput` structure (REC-04)
- Degraded pipeline returns visible, complete outfits (REC-05)
- Mock data covers scenario × category × price matrix
- `tsc --noEmit` zero errors
- All Phase 2 success criteria from ROADMAP.md verified

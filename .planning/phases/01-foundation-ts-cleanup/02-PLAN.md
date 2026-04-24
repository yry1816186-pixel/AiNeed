---
wave: 2
depends_on: [01-PLAN.md]
files_modified:
  - apps/backend/src/domains/platform/recommendations/recommendations.controller.ts
  - apps/backend/src/domains/platform/recommendations/recommendations.module.ts
  - apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
  - apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts
  - apps/backend/src/domains/platform/recommendations/services/behavior-tracking.service.ts
  - apps/backend/src/domains/platform/recommendations/services/recommendation-feed.service.ts
  - apps/backend/src/domains/platform/recommendations/services/outfit-completion.service.ts
  - apps/backend/src/domains/platform/recommendations/services/golden-recommendation.service.ts
  - apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts
  - apps/backend/src/domains/platform/recommendations/services/knowledge-graph.service.ts
  - apps/backend/src/domains/platform/recommendations/services/collaborative-filtering.service.ts
requirements_addressed: [REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, GND-04]
autonomous: true
---

# Plan 02: Recommendation Pipeline Architecture + ColdStartService Refactoring

**Objective:** Make Orchestrator the sole entry point for all recommendations (REC-01), refactor ColdStartService to use bodyType + styleExpression + primaryScenarios instead of gender (GND-04), integrate user behavior into scoring (REC-02), and ensure recommendation output includes explanation structure (REC-04).

## Task 1: Extend Orchestrator to be the single entry point

<read_first>

- apps/backend/src/domains/platform/recommendations/recommendations.controller.ts (full file, 564 lines)
- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts (full file, 907 lines)
- apps/backend/src/domains/platform/recommendations/recommendations.module.ts
  </read_first>

<action>
The controller currently bypasses the Orchestrator in 4 places:
1. `getFeed()` → calls `this.feedService.getFeed()` directly (line 215)
2. `getCompleteTheLook()` → calls `this.outfitCompletionService.getCompleteTheLook()` directly (line 427)
3. `getGoldenProfiles()` → calls `this.goldenRecommendationService.getAllGoldenProfiles()` directly (line 524)
4. `getGoldenRecommendation()` → calls `this.goldenRecommendationService.getGoldenRecommendation()` directly (line 537)

For each bypass, add a corresponding method to the Orchestrator that delegates internally:

1. `Orchestrator.getFeed(userId, category, subCategory, page, pageSize)` — wraps feedService, returns typed `FeedResult`
2. `Orchestrator.getCompleteTheLook(clothingId, userId)` — wraps outfitCompletionService, returns typed `OutfitCompletionResult`
3. `Orchestrator.getGoldenProfiles()` — wraps goldenRecommendationService, returns typed `GoldenProfile[]`
4. `Orchestrator.getGoldenRecommendation(profileId)` — wraps goldenRecommendationService, returns typed `GoldenRecommendation`

Then update the controller:

- Remove direct injection of `RecommendationsService`, `OutfitCompletionService`, `BehaviorTrackingService`, `RecommendationFeedService`, `GoldenRecommendationService`
- Controller only injects `RecommendationOrchestrator`
- All endpoints call `this.orchestrator.*` exclusively
- Move behavior tracking logic (`submitFeedback`, `submitBatchFeedback`) into Orchestrator methods `submitFeedback()` and `submitBatchFeedback()`

Update `recommendations.module.ts` to reflect simplified controller dependencies.

Remove `/* eslint-disable @typescript-eslint/no-explicit-any */` from controller top.
</action>

<acceptance_criteria>

- Controller constructor only injects `RecommendationOrchestrator`
- Every endpoint calls `this.orchestrator.*` — no direct service calls
- Controller has zero `any` types (eslint-disable removed)
- `recommendations.module.ts` updated with correct provider list
- `tsc --noEmit` passes
- All 13 controller endpoints still function (verified by existing test patterns)
  </acceptance_criteria>

---

## Task 2: Refactor ColdStartService — remove gender bucketing (GND-04)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts (full file, 867 lines)
- apps/backend/src/domains/identity/auth/dto/auth.dto.ts (for gender field reference)
- apps/backend/src/domains/identity/onboarding/ (for onboarding data structure)
  </read_first>

<action>
1. **Remove `gender` from `UserProfile` interface** (line 23): Delete `gender?: string`. The profile already has `bodyType`, `styleExpression`, `primaryScenarios` which are the replacement dimensions.

2. **Remove gender references in body type rules** (line 42-63): The `hourglass` rule currently maps to `"feminine"` style. Change to neutral alternatives:

   ```typescript
   hourglass: {
     styles: ["elegant", "classic", "tailored"],
     categories: ["dresses", "tops", "bottoms"],
   },
   ```

   Apply same neutralization to all body type entries that have gender-coded styles.

3. **Refactor `getProfileBasedStrategy()`**: Replace any remaining gender-based branching with `bodyType + styleExpression + primaryScenarios` logic:

   - Primary sort: `primaryScenarios` → maps to category/occasion filters
   - Secondary sort: `bodyType` → maps to flattering categories (from bodyTypeRules)
   - Tertiary sort: `styleExpression` → maps to style-item associations

4. **Update `getHybridStrategy()`**: Ensure the hybrid weights matrix uses only neutral dimensions:

   - popularity 30% + survey 25% + color-season 25% + body-type 15% + profile 5%
   - Remove any gender weight or gender-based candidate selection

5. **Add `primaryScenarios` mapping**: Define a new mapping:

   ```typescript
   private readonly scenarioMapping: Record<string, { categories: string[]; styles: string[] }> = {
     commute: { categories: ["tops", "bottoms", "outerwear"], styles: ["smart-casual", "minimalist"] },
     interview: { categories: ["suits", "tops", "bottoms"], styles: ["formal", "classic"] },
     date: { categories: ["dresses", "tops", "bottoms"], styles: ["elegant", "romantic"] },
     casual: { categories: ["tops", "bottoms", "sneakers"], styles: ["casual", "streetwear"] },
     workout: { categories: ["activewear", "shorts"], styles: ["sporty"] },
     party: { categories: ["dresses", "tops", "accessories"], styles: ["trendy", "elegant"] },
   };
   ```

6. **Update callers**: Find all files that pass `gender` to ColdStartService and update them to pass `bodyType + styleExpression + primaryScenarios` instead.
   </action>

<acceptance_criteria>

- `ColdStartService.UserProfile` interface has no `gender` field
- Zero occurrences of `gender` in cold-start.service.ts (grep confirms)
- `bodyTypeRules` has no gender-coded styles like "feminine" or "masculine"
- `scenarioMapping` exists with at least 5 scenario entries
- `getProfileBasedStrategy()` uses only bodyType + styleExpression + primaryScenarios
- `getHybridStrategy()` weights have no gender dimension
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 3: Integrate behavior feedback into recommendation scoring (REC-02)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/behavior-tracking.service.ts
- apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
  </read_first>

<action>
1. In `Orchestrator`, ensure `recordFeedback()` calls `preferenceLearningService.updateWeights()` after recording the feedback.
2. In `preference-learning.service.ts`, verify that the `updateWeights()` method:
   - Accepts typed feedback (not `any`)
   - Adjusts scoring weights: `like` increases category/style/tag affinity, `dislike` decreases
   - Persists updated weights to user profile or a dedicated preference table
3. In the Orchestrator's scoring pipeline (`scoreByRules`, `scoreByVector`, `applyPreferenceLearning`):
   - Ensure `applyPreferenceLearning()` reads the latest preference weights
   - Verify the fusion formula: ruleScore * 0.4 + vectorScore * 0.35 + preferenceScore * 0.25
   - Make the weights configurable via `RecommendationOptions` (default values remain)
4. Type all scoring pipeline methods with the shared types from Plan 01 Task 1.
</action>

<acceptance_criteria>

- `recordFeedback()` calls `preferenceLearningService.updateWeights()` after each feedback
- Scoring pipeline applies preference weights with configurable fusion formula
- All methods have typed parameters (no `any`)
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 4: Ensure recommendation output includes explanation structure (REC-04)

<read_first>

- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/services/recommendation-explainer.service.ts
- apps/backend/src/domains/platform/recommendations/types/ (from Plan 01)
  </read_first>

<action>
Define the mandatory `RecommendationOutput` structure:
```typescript
interface RecommendationExplanation {
  why: string;           // "这件西装与你的面试场景匹配，深色系适合正式场合"
  alternative: string;   // "也可以考虑搭配针织外套，更柔和的印象"
  nextAction: string;    // "试穿看看效果" | "查看相似款" | "保存到衣橱"
  confidence: number;    // 0.0 - 1.0
}

interface RecommendationItem {
id: string;
name: string;
imageUrl: string;
category: string;
price?: number;
score: number;
explanation: RecommendationExplanation;
}

interface RecommendationOutput {
items: RecommendationItem[];
outfit?: OutfitSuggestion;
explanation: RecommendationExplanation;
experimentId?: string; // REC-06: A/B experiment tracking
}

````

1. Ensure all Orchestrator public methods return `RecommendationOutput` or typed variants.
2. Update `recommendation-explainer.service.ts` to generate explanations for every recommendation.
3. Add `experimentId` field to all recommendation outputs (REC-06) — generate UUID v4 for each recommendation batch.
</action>

<acceptance_criteria>
- `RecommendationOutput` interface defined with items, outfit, explanation (why, alternative, nextAction, confidence), experimentId
- All Orchestrator public methods return `RecommendationOutput`
- Every recommendation response includes a non-empty `explanation.why`
- Every response includes `experimentId` (UUID)
- `tsc --noEmit` passes
</acceptance_criteria>

---

## Task 5: Add degradation strategy (REC-05)

<read_first>
- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts
</read_first>

<action>
Add a fallback path in the Orchestrator that activates when the AI pipeline (vector search, ML scoring) is unavailable:

1. Define `DegradedRecommendationStrategy`:
   - Uses weather + season + scene template from rule-engine
   - Returns hardcoded outfit templates by season+scene combination
   - Marks response with `{ degraded: true }` in metadata

2. In the Orchestrator's main flow, wrap the AI pipeline in try/catch:
   ```typescript
   try {
     results = await this.fullAIPipeline(params);
   } catch (error) {
     this.logger.warn('AI pipeline unavailable, falling back to rule engine');
     results = await this.degradedPipeline(params);
   }
````

3. Ensure `rule-engine.service.ts` has a `getDegradedRecommendations()` method that produces valid `RecommendationOutput` with pre-built explanations.
   </action>

<acceptance_criteria>

- Orchestrator has try/catch around AI pipeline with fallback to rule engine
- Degraded responses include `{ degraded: true }` in metadata
- Rule engine can produce complete recommendations without AI services
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Verification

```bash
cd apps/backend

# REC-01: Controller only injects Orchestrator
grep "constructor" src/domains/platform/recommendations/recommendations.controller.ts | grep -c "orchestrator"  # should be 1
grep "constructor" src/domains/platform/recommendations/recommendations.controller.ts | grep -c "Service"  # should be 0

# GND-04: No gender in ColdStartService
grep -c "gender" src/domains/platform/recommendations/services/cold-start.service.ts  # should be 0

# REC-01: No any in controller
grep -c "any" src/domains/platform/recommendations/recommendations.controller.ts  # should be 0

# Full type check
npx tsc --noEmit
```

**Success:** Controller is thin (only Orchestrator), ColdStartService has no gender, all REC-\* requirements met, `tsc --noEmit` passes.

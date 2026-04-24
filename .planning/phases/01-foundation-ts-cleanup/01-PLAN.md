---
wave: 1
depends_on: []
files_modified:
  - apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
  - apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts
  - apps/backend/src/domains/platform/recommendations/services/collaborative-filtering.service.ts
  - apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts
  - apps/backend/src/domains/platform/recommendations/services/outfit-completion.service.ts
  - apps/backend/src/domains/platform/recommendations/services/knowledge-graph.service.ts
  - apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts
  - apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts
  - apps/backend/src/domains/platform/recommendations/services/recommendation-feed.service.ts
  - apps/backend/src/domains/platform/recommendations/services/recommendation-cache.service.ts
  - apps/backend/src/domains/platform/recommendations/services/advanced-recommendation.service.ts
  - apps/backend/src/domains/platform/recommendations/services/golden-recommendation.service.ts
  - apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
  - apps/backend/src/domains/platform/recommendations/services/vector-similarity.service.ts
  - apps/backend/src/domains/platform/recommendations/services/qdrant.service.ts
  - apps/backend/src/domains/platform/recommendations/services/recommendation-explainer.service.ts
  - apps/backend/src/domains/social/community/community.service.ts
  - apps/backend/src/domains/social/consultant/consultant.service.ts
  - apps/backend/src/domains/commerce/order/order.service.ts
  - apps/backend/src/domains/ai-core/ai-stylist/services/item-replacement.service.ts
  - apps/backend/src/domains/ai-core/ai-stylist/decision-engine.service.ts
  - apps/backend/src/domains/identity/profile/services/user-profile.service.ts
  - apps/backend/src/domains/platform/merchant/merchant.service.ts
  - apps/backend/src/domains/platform/notification/services/notification.service.ts
  - apps/backend/src/main.ts
  - apps/backend/src/domains/identity/auth/auth.service.ts
requirements_addressed: [FND-01, GND-04]
autonomous: true
---

# Plan 01: Core Domain `any` Elimination + Console Cleanup

**Objective:** Eliminate `any` types in the 20 highest-density production files across platform/recommendations, social, commerce, ai-core, and identity domains. Replace console.log with proper logger. Target: reduce backend `any` count from ~1050 to ~650.

## Task 1: Define shared recommendation type interfaces

<read_first>

- apps/backend/src/domains/platform/recommendations/types/ (all files)
- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/dto/ (all DTOs)
  </read_first>

<action>
Create or extend type interfaces in `apps/backend/src/domains/platform/recommendations/types/` to replace all `any` usages in the recommendations domain. Define:

1. `RecommendationCandidate` — replaces all `any` in candidate fetching (fields: id, score, metadata, source, category, price, tags, imageUrl, vector?)
2. `RecommendationContext` — structured context object (fields: userId, occasion?, season?, weather?, budget?, bodyType?, styleExpression?, category?)
3. `RecommendationOptions` — options bag (fields: limit, offset?, strategy?, experimentId?)
4. `ScoringResult` — scoring pipeline output (fields: candidate: RecommendationCandidate, ruleScore, vectorScore, preferenceScore, finalScore, explanation)
5. `StrategyOutput` — strategy service return type (fields: candidates, strategyName, confidence, metadata: Record<string, unknown>)
6. `FeedbackPayload` — user feedback structure (fields: userId, clothingId, action: 'like'|'dislike'|'skip', context?)

Export all from `types/index.ts`. These types are the foundation for all subsequent `any` removal in the recommendations domain.
</action>

<acceptance_criteria>

- `apps/backend/src/domains/platform/recommendations/types/` contains interfaces for RecommendationCandidate, RecommendationContext, RecommendationOptions, ScoringResult, StrategyOutput, FeedbackPayload
- `types/index.ts` re-exports all interfaces
- `tsc --noEmit` passes after this change
- No `any` in the new type files
  </acceptance_criteria>

---

## Task 2: Remove `any` from recommendation.orchestrator.ts (12 usages)

<read_first>

- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
- apps/backend/src/domains/platform/recommendations/types/ (from Task 1)
  </read_first>

<action>
1. Remove `/* eslint-disable @typescript-eslint/no-explicit-any */` from line 1
2. Replace all `any` parameters and return types with the new types from Task 1:
   - `getRecommendations(params: any)` → `getRecommendations(params: { userId: string; context?: RecommendationContext; options?: RecommendationOptions })`
   - `getDailyOutfitRecommendation(userId: string): Promise<any>` → `Promise<RecommendationOutput>`
   - `getOccasionRecommendations(userId: string, occasion: string, limit: number): Promise<any>` → `Promise<RecommendationOutput>`
   - `getTrendingRecommendations(limit: number): Promise<any>` → `Promise<RecommendationOutput>`
   - `getStyleGuide(userId: string): Promise<any>` → `Promise<StyleGuideOutput>`
   - `recordFeedback(userId: string, clothingId: string, action: string): Promise<any>` → typed with FeedbackPayload
   - Internal candidate/score variables: replace `any[]` with `RecommendationCandidate[]`
   - Internal scoring: replace `any` with `ScoringResult`
3. Where Prisma returns dynamic objects, use `Record<string, unknown>` with type guards or cast to defined interfaces
4. For funnel pipeline methods (`fetchAllCandidates`, `filterByScene`, etc.), type each stage's input/output
</action>

<acceptance_criteria>

- `recommendation.orchestrator.ts` has zero `any` (grep `-c ': any\|as any\|<any>'` returns 0)
- `/* eslint-disable @typescript-eslint/no-explicit-any */` removed from top of file
- `tsc --noEmit` passes
- All public methods have explicit return types
  </acceptance_criteria>

---

## Task 3: Remove `any` from recommendation services (batch 1: rule-engine, collaborative-filtering, cold-start)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts (9 any)
- apps/backend/src/domains/platform/recommendations/services/collaborative-filtering.service.ts (7 any)
- apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts (5 any)
- apps/backend/src/domains/platform/recommendations/types/ (from Task 1)
  </read_first>

<action>
For each file:
1. Remove `/* eslint-disable @typescript-eslint/no-explicit-any */` if present
2. Replace function parameters `any` → typed interfaces (StrategyOutput, RecommendationCandidate, RecommendationContext)
3. Replace Prisma result `any` → specific Prisma types or `Record<string, unknown>` with narrowing
4. For `rule-engine.service.ts`: type rule definitions as `RuleDefinition` interface, type scoring functions with explicit inputs/outputs
5. For `collaborative-filtering.service.ts`: type similarity matrices as `Map<string, Map<string, number>>`, type user-item maps explicitly
6. For `cold-start.service.ts`: type strategy results as `ColdStartStrategy[]`, type internal rules maps with `Record<string, ...>`
</action>

<acceptance_criteria>

- All 3 files have zero `any` usages (grep confirms)
- No `eslint-disable` for no-explicit-any in these files
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 4: Remove `any` from recommendation services (batch 2: remaining 10 files)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/outfit-completion.service.ts (3 any)
- apps/backend/src/domains/platform/recommendations/services/knowledge-graph.service.ts (3 any)
- apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts (2 any)
- apps/backend/src/domains/platform/recommendations/services/unified-recommendation.engine.ts (2 any)
- apps/backend/src/domains/platform/recommendations/services/recommendation-feed.service.ts (2 any)
- apps/backend/src/domains/platform/recommendations/services/recommendation-cache.service.ts (2 any)
- apps/backend/src/domains/platform/recommendations/services/advanced-recommendation.service.ts
- apps/backend/src/domains/platform/recommendations/services/golden-recommendation.service.ts
- apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
- apps/backend/src/domains/platform/recommendations/services/vector-similarity.service.ts
- apps/backend/src/domains/platform/recommendations/services/qdrant.service.ts
- apps/backend/src/domains/platform/recommendations/services/recommendation-explainer.service.ts
- apps/backend/src/domains/platform/recommendations/types/ (from Task 1)
  </read_first>

<action>
Apply the same strategy as Task 3 to all remaining recommendation service files. For each:
1. Remove `eslint-disable @typescript-eslint/no-explicit-any`
2. Type all parameters, returns, and internal variables using the shared types
3. For vector services (qdrant, vector-similarity): type embedding arrays as `number[]`, search results as `VectorSearchResult`
4. For cache service: type cache entries as `CacheEntry<T>` generic
5. For feed service: type feed items as `FeedItem` with proper fields
</action>

<acceptance_criteria>

- Zero `any` in all 12 recommendation service files
- `tsc --noEmit` passes
- All exported methods have explicit parameter and return types
  </acceptance_criteria>

---

## Task 5: Remove `any` from social domain (community + consultant)

<read_first>

- apps/backend/src/domains/social/community/community.service.ts (25 any)
- apps/backend/src/domains/social/consultant/consultant.service.ts (15 any)
  </read_first>

<action>
1. Remove `eslint-disable` directives
2. For `community.service.ts` (25 any):
   - Define `CommunityPost`, `Comment`, `ContentModerationResult` interfaces
   - Type all Prisma query results explicitly
   - Type moderation pipeline inputs/outputs
   - Replace `any` in dynamic content handling with `Record<string, unknown>` + type guards
3. For `consultant.service.ts` (15 any):
   - Define `ConsultantProfile`, `ConsultantMatch`, `BookingResult` interfaces
   - Type matching algorithm inputs/outputs
   - Type booking/scheduling function parameters
</action>

<acceptance_criteria>

- Zero `any` in community.service.ts and consultant.service.ts
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 6: Remove `any` from commerce, ai-core, identity top offenders

<read_first>

- apps/backend/src/domains/commerce/order/order.service.ts (12 any)
- apps/backend/src/domains/ai-core/ai-stylist/services/item-replacement.service.ts (6 any)
- apps/backend/src/domains/ai-core/ai-stylist/decision-engine.service.ts (6 any)
- apps/backend/src/domains/identity/profile/services/user-profile.service.ts (12 any)
- apps/backend/src/domains/platform/merchant/merchant.service.ts (15 any)
- apps/backend/src/domains/platform/notification/services/notification.service.ts (7 any)
  </read_first>

<action>
For each file:
1. Remove `eslint-disable` directives
2. Define domain-specific interfaces where needed:
   - Commerce: `OrderWithItems`, `PaymentResult`, `RefundResult`
   - AI-Core: `StylistSuggestion`, `ReplacementCandidate`, `DecisionContext`
   - Identity: `ProfileUpdateData`, `ProfileCompleteness`
   - Merchant: `MerchantData`, `MerchantStats`
   - Notification: `NotificationPayload`, `PushResult`
3. Replace all `any` with typed interfaces
4. For Prisma results, use `Prisma.XxxGetPayload<{include: ...}>` utility types
</action>

<acceptance_criteria>

- Zero `any` in all 6 files listed above
- `tsc --noEmit` passes
- Total backend `any` count reduced by ~150 from these 6 files
  </acceptance_criteria>

---

## Task 7: Console.log cleanup (backend)

<read_first>

- apps/backend/src/main.ts (3 console.log at lines 128, 130, 133)
- apps/backend/src/common/logging/structured-logger.service.ts (3 console at lines 315, 328, 357)
  </read_first>

<action>
1. In `main.ts`: Replace `console.log(...)` with `Logger.log(...)` from `@nestjs/common`. The app already bootstraps NestJS, so Logger is available.
   ```typescript
   const logger = new Logger('Bootstrap');
   logger.log(`API running at: ${url}`);
   logger.log(`API docs at: ${url}/docs`);
   logger.log(`Production port: ${port}`);
   ```

2. In `structured-logger.service.ts`: These are the actual logging transport (console.log/warn/error in a logger wrapper). This is CORRECT behavior — the structured logger IS the abstraction over console. Add a comment explaining this is intentional:
   ```typescript
   // Intentional: this service IS the logging abstraction layer
   console.log(JSON.stringify(logEntry));
   ```
   No changes needed for the actual calls, but ensure no other file imports `console` directly for logging.
   </action>

<acceptance_criteria>

- `grep -r "console\." apps/backend/src/ --include="*.ts" | grep -v ".spec." | grep -v "structured-logger" | grep -v "scripts/" | grep -v "string literal"` returns 0 results for main.ts
- `main.ts` uses NestJS Logger instead of console.log
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Verification

```bash
# Count remaining `any` in production code (excluding specs)
cd apps/backend && npx tsc --noEmit 2>&1 | head -50
grep -r ": any\|as any" src/domains/ --include="*.ts" | grep -v ".spec." | wc -l
grep -r "eslint-disable.*no-explicit-any" src/domains/ --include="*.ts" | grep -v ".spec." | wc -l
# Verify console.log cleanup
grep -r "console\." src/ --include="*.ts" | grep -v ".spec." | grep -v "structured-logger" | grep -v "scripts/"
```

**Success:** `tsc --noEmit` passes, backend production `any` count reduced by ~200-250, console.log only in structured-logger (intentional).

---
wave: 1
depends_on: [Phase 1 complete]
files_modified:
  - apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts
  - apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
  - apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
  - apps/backend/src/domains/platform/feature-flags/feature-flag.service.ts
  - apps/backend/src/domains/platform/recommendations/recommendations.controller.ts
requirements_addressed: [REC-01, REC-02, REC-03, REC-06]
autonomous: true
---

# Plan 01: Recommendation Pipeline Completion

**Objective:** Complete the recommendation pipeline integration — StyleQuiz results flow into scoring, ColdStartService reads onboarding data, A/B experiment assignment integrated with FeatureFlag system, verify Orchestrator is sole entry point.

## Task 1: Verify Orchestrator is sole entry point (REC-01 verification)

<read_first>

- apps/backend/src/domains/platform/recommendations/recommendations.controller.ts
  </read_first>

<action>
1. Read the controller constructor. Verify it ONLY injects `RecommendationOrchestrator` — no direct service injections.
2. Read every endpoint method. Verify each calls `this.orchestrator.*` exclusively.
3. If any endpoint bypasses the orchestrator (calls a service directly), refactor it to route through the orchestrator. Add a delegate method to the orchestrator if needed.
4. Run `grep -n "RecommendationsService\|ColdStartService\|OutfitCompletionService\|BehaviorTrackingService\|RecommendationFeedService\|GoldenRecommendationService\|AdvancedRecommendationService" apps/backend/src/domains/platform/recommendations/recommendations.controller.ts` — should return ZERO matches in constructor or method bodies (only orchestrator allowed).
</action>

<acceptance_criteria>

- Controller constructor injects exactly 1 service: `RecommendationOrchestrator`
- Zero direct service imports in controller method bodies
- All 13 endpoints route through `this.orchestrator.*`
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 2: ColdStartService reads onboarding data (REC-03)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts
- apps/backend/src/domains/identity/onboarding/onboarding.service.ts
- apps/mobile/src/features/onboarding/stores/onboardingStore.ts
  </read_first>

<action>
1. In `ColdStartService.handleNewUser()`:
   a. After fetching user profile, also query `UserProfile` table for `onboardingData` (or query `StyleQuizResult` for latest `isLatest=true` result)
   b. Extract `primaryScenarios`, `styleExpression`, `garmentPreference`, `budgetRange` from onboarding data
   c. Use `primaryScenarios` to drive the scenario mapping (already partially done — `scenarioMapping` exists but verify it reads from actual onboarding data)
   d. Use `garmentPreference` (lowerBody/upperFit) to filter categories: if `skirts`, exclude pants-heavy recommendations; if `fitted`, prioritize slim-fit items
   e. Use `budgetRange` as price filter bounds

2. Add a private method `getOnboardingProfile(userId: string)` that:
   a. Queries `UserProfile` for the user's onboarding answers
   b. Falls back to querying `StyleQuizResult` where `isLatest=true`
   c. Returns a structured `OnboardingProfile` object with all extracted fields
   d. Returns null if no onboarding data exists (graceful fallback to demographics)

3. In `getProfileBasedStrategy()`, merge onboarding data with the existing `bodyType + styleExpression + primaryScenarios` logic. Onboarding data takes precedence when available.

4. Ensure `garmentPreference.lowerBody` influences category filtering:
   - `"pants"` → skip skirts/dresses
   - `"skirts"` → skip most pants (keep a few versatile options)
   - `"both"` → no filter
     </action>

<acceptance_criteria>

- `handleNewUser()` queries onboarding/quiz data before generating strategy
- `primaryScenarios` from onboarding drives scenario mapping
- `garmentPreference` filters category recommendations
- `budgetRange` from onboarding applied as price bounds
- Cold start works with zero onboarding data (graceful fallback)
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 3: StyleQuiz results flow into scoring weights (REC-02)

<read_first>

- apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
- apps/backend/src/domains/fashion/style-assessment/quiz/style-quiz.service.ts
- apps/backend/prisma/schema.prisma (StyleQuizResult model, lines 1889-1981)
  </read_first>

<action>
1. In `PreferenceLearningService`, add a new method `syncQuizResults(userId: string)`:
   a. Query `StyleQuizResult` where `userId` and `isLatest=true`
   b. Extract: `occasionPreferences` (Json), `colorPreferences` (Json), `styleKeywords` (String[]), `priceRange`
   c. Upsert these as `UserPreferenceWeight` records with appropriate categories:
      - `style_keyword` entries for each keyword in `styleKeywords`
      - `color_preference` entries for each color from `colorPreferences`
      - `occasion_preference` entries from `occasionPreferences`
   d. Set weight values based on `confidenceScore` from quiz result (higher confidence = higher weight)

2. In `RecommendationOrchestrator.applyPreferenceLearning()`:
   a. Before scoring, call `preferenceLearning.syncQuizResults(userId)` for cold-start users
   b. This ensures quiz-derived preferences are available for the current scoring pass

3. In `PreferenceLearningService.getUserPreferences()`:
   a. Verify quiz-sourced preferences are included alongside behavior-learned ones
   b. Quiz-sourced preferences should have a `source: 'quiz'` indicator in the metadata

4. Wire the sync into the onboarding completion flow:
   a. After `StyleQuizService.saveQuizResult()` is called, trigger `PreferenceLearningService.syncQuizResults(userId)`
   b. This can be done via the existing `ProfileEventSubscriberService` or directly in the quiz service
   </action>

<acceptance_criteria>

- Style quiz results (styleKeywords, colorPreferences, occasionPreferences) create UserPreferenceWeight entries
- Quiz preferences flow into recommendation scoring via `getUserPreferences()`
- Scoring weights reflect quiz confidence score
- Trigger happens automatically when quiz is completed
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Task 4: A/B experiment integration with FeatureFlag system (REC-06)

<read_first>

- apps/backend/src/domains/platform/feature-flags/feature-flag.service.ts
- apps/backend/src/domains/platform/feature-flags/strategies/ab-test.strategy.ts
- apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts (generateExperimentId method)
  </read_first>

<action>
1. In `RecommendationOrchestrator`, replace the simple `generateExperimentId()` with a proper FeatureFlag-backed assignment:
   a. Inject `FeatureFlagService` into the orchestrator constructor
   b. Add to `recommendations.module.ts` imports: `FeatureFlagModule` (or the relevant module)

2. Create a new method `assignExperimentVariant(userId: string)`:
   a. Call `featureFlagService.evaluate('recommendation_algorithm', userId)` (or similar flag key)
   b. If the flag exists and has variant type, use the assigned variant as part of the experiment ID
   c. If no flag exists, fall back to the current `exp-{timestamp}-{random}` format
   d. Return `{ experimentId, variant }` where `experimentId` = `exp-{variant or 'default'}-{timestamp}`

3. Update `recommend()` method to use `assignExperimentVariant()` instead of `generateExperimentId()`:
   a. Call it once per batch, not per item
   b. Attach the experimentId to every result in the batch

4. Seed a default feature flag in the seed data:
   a. Create flag key `recommendation_algorithm_v2` with type `variant`
   b. Variants: `control` (weight 50), `enhanced_scoring` (weight 50)
   c. This allows A/B testing of scoring algorithm changes without code deploys

5. Ensure the experiment_id is persisted in `RecommendationBatch.context` JSON field so it's traceable.
   </action>

<acceptance_criteria>

- Orchestrator uses FeatureFlagService for experiment assignment
- experimentId includes variant information when a flag exists
- Falls back to timestamp-random format when no flag is configured
- Default `recommendation_algorithm_v2` flag seeded
- experimentId persisted in RecommendationBatch for traceability
- `tsc --noEmit` passes
  </acceptance_criteria>

---

## Final Quality Gate

```bash
# Verify controller has only orchestrator injection
grep -c "orchestrator" apps/backend/src/domains/platform/recommendations/recommendations.controller.ts
# Should show orchestrator only

# Verify ColdStartService uses onboarding data
grep -n "onboarding\|primaryScenarios\|garmentPreference\|budgetRange" apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts
# Should show these terms in handleNewUser or getProfileBasedStrategy

# Verify quiz sync exists
grep -n "syncQuizResults\|StyleQuizResult" apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts
# Should show the new method

# Verify FeatureFlag integration
grep -n "featureFlag\|FeatureFlagService\|assignExperimentVariant" apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
# Should show the integration

# Type check
cd C:/AiNeed/apps/backend && npx tsc --noEmit
echo "Exit code: $?"
```

**SUCCESS CRITERIA:**

- Controller only injects Orchestrator (REC-01 verified)
- ColdStartService reads onboarding primaryScenarios, garmentPreference, budgetRange (REC-03)
- StyleQuiz results create preference weights (REC-02)
- A/B experiment uses FeatureFlag system (REC-06)
- `tsc --noEmit` zero errors

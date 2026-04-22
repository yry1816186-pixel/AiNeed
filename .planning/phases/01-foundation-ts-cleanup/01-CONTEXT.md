# Phase 1: Foundation + TS Cleanup - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The app compiles with zero TypeScript errors across the entire monorepo. The data schema supports all downstream recommendation and profiling features. Gender field is demoted to optional. Interface contracts for Phase 2-4 are frozen.

10 requirements: FND-01..05, GND-01..05

</domain>

<decisions>
## Implementation Decisions

### TS Error Strategy

- **D-01:** Batch fix by error pattern (not by file). Three dominant patterns identified:
  - Color index `gray[0]` on named color maps → fix to `gray[50]` or named access (~15 errors across BottomSheets, IconCard, Share)
  - `Colors` vs `colors` casing mismatch → find-replace to `colors` (~7 errors in ChatBubble)
  - `../theme` module not found → fix import paths to correct design-system location (~5 errors in Dialog, EmptyState, Input, LoadingStates, Toast)
  - `styles` vs `style` in Rating.tsx → simple rename
  - Expo tsconfig.base.json TS6046 → check tsconfig extends chain
- **D-02:** Remaining ~100 errors: fix individually but quickly — most are similar patterns (type assertions, missing imports, prop types)
- **D-03:** 3 parallel agents by error severity (as specified in fusion plan §14.2)

### Gender Demotion Scope

- **D-04:** Full demotion in one pass across all 12 backend files + mobile stores
- **D-05:** auth.dto.ts: `gender` changes from required to `@IsOptional()`
- **D-06:** onboardingStore: remove `gender` from required fields, add `primaryScenarios: string[]`, `ageBand: string`, `styleExpression: string` as required
- **D-07:** BodyMetricsService: replace `gender = user?.gender || Gender.female` with waist/hip ratio continuous variable. BMR uses Katch-McArdle formula (370 + 21.6 × leanMass), no gender dependency
- **D-08:** ProfileCompletenessService: gender weight 10% → 0%. Redistribute: 场景 20% + 体型 25% + 风格 20% + 衣橱 20% + 照片 15%
- **D-09:** ColdStartService: DEFERRED to Phase 2 (needs Orchestrator context, more complex refactor)
- **D-10:** Seed data: rewrite Gender.female assignments to be attribute-driven (use category + occasion instead)

### Data Schema Changes

- **D-11:** ClothingItem Prisma model additions: `material String?`, `season Season[]`, `gender Gender?` (already exists, make optional), `source DataSource` (new enum: MOCK, TAOBAO, JD, MANUAL)
- **D-12:** New tables: `RecommendationBatch` (batch tracking + attribution), `RecommendationImpression` (展示 → 点击 → 购买归因)
- **D-13:** Unify `UserBehavior` and `UserBehaviorEvent` — UserBehavior becomes a view, UserBehaviorEvent is the canonical model
- **D-14:** Single Prisma migration for all schema changes, run once

### Interface Contract Freezing

- **D-15:** Freeze three interfaces in `packages/types/` (or `@xuno/types` if already configured):
  - `RecommendationOutput` — items + outfit + explanation{why, alternative, nextAction, confidence}
  - `TryOnResult` — image + confidence + fitAssessment + suggestion + alternatives + scenes
  - `OnboardingOutput` — primaryScenarios + ageBand + height + weight + usualSize + garmentPreference{lowerBody} + styleExpression + styleImageSeeds + photoUri? + gender?
- **D-16:** garmentPreference is REQUIRED in OnboardingOutput (research finding: cold start is incoherent without it)
- **D-17:** gender is OPTIONAL with explicit comment: "不计入推荐权重，仅用于展示和合规"

### Mock Data Strategy

- **D-18:** Minimum 100 mock clothing items as JSON fixture
- **D-19:** Coverage matrix: 8 scenarios × 3 budget bands = 24 cells, ~4-5 items per cell
- **D-20:** Body type coverage is NOT required in Phase 1 (expand in Phase 2 when recommendation pipeline needs it)
- **D-21:** Each item includes: id, name, category, silhouette, color, price, season, occasion, budgetBand, sizeCurve, imageUrl (placeholder), source: MOCK

### Claude's Discretion

- Exact file ordering within each parallel agent batch
- Specific body fat calculation coefficients (as long as Gender.female fallback is eliminated)
- Prisma migration naming convention
- Mock data fixture file format (JSON vs TypeScript)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements

- `.planning/REQUIREMENTS.md` §v1 — FND-01..05, GND-01..05 requirements with acceptance criteria
- `.planning/ROADMAP.md` §Phase 1 — Phase goal, success criteria, dependency chain
- `.planning/PROJECT.md` §Constraints — Timeline (48h sprint), tech stack locks, execution principles

### Architecture & Research

- `docs/XUNO_EXECUTION_MASTER.md` §4 — Interface contracts to freeze, gender removal cascade map
- `docs/XUNO_FUSION_PLAN.md` §14.2 — Phase 1 agent parallelization strategy (3 agents)
- `docs/XUNO_FUSION_PLAN.md` §11 — BodyMetricsService de-gendering specification
- `docs/XUNO_FUSION_PLAN.md` §10.1 — Data schema P0 fixes
- `.planning/research/PITFALLS.md` — Pitfall 1: gender removal cascade through 6+ dependencies
- `.planning/research/ARCHITECTURE.md` — Data flow and component boundaries
- `.planning/research/STACK.md` — Zero new npm packages needed

### Existing Code (Key Files to Read)

- `apps/backend/src/domains/identity/profile/services/body-metrics.service.ts` — Contains `gender = user?.gender || Gender.female` (THE dangerous line)
- `apps/backend/src/domains/identity/profile/services/profile-completeness.service.ts` — Gender weight calculation
- `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts` — Male/female bucket logic (deferred to Phase 2)
- `apps/backend/src/domains/identity/onboarding/dto/onboarding.dto.ts` — Gender field in DTO
- `apps/backend/prisma/schema.prisma` — Current schema (needs enrichment)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `@xuno/types` package: already configured for cross-platform type sharing (15+ refs in mobile, backend via domains)
- Design token system: `DesignTokens.colors`, `DesignTokens.typography.sizes`, `Spacing` — already established
- Prisma ORM: migration pipeline already functional
- ESLint `no-explicit-any: error`: already configured from prior milestone

### Established Patterns

- Backend domains: 6 domains + 1 platform layer (identity, fashion, ai-core, commerce, social, customization, platform)
- Mobile feature-based: `src/features/{feature}/screens/`, `src/features/{feature}/stores/`
- Zustand stores: state management standard
- Theme system: `useTheme()` hook + `DesignTokens` constants

### Integration Points

- Interface contracts go in `packages/types/` (shared between mobile + backend)
- Mock data loaded via Prisma seed (`prisma/seeds/`)
- Gender demotion touches: identity domain (4 files), platform domain (1 file), ai-core domain (2 files), fashion domain (1 file), common types (1 file)

### Error Pattern Summary (138 mobile TS errors)

1. **Color index `0`** on named color map (~15 errors) — gray[0], gray[50] → use named keys
2. **`Colors` casing** (~7 errors) — ChatBubble references `Colors` instead of `colors`
3. **`../theme` module** (~5 errors) — design-system primitives import from deleted/renamed path
4. **`styles` vs `style`** (~2 errors) — Rating.tsx
5. **Expo tsconfig** (~1 error) — TS6046 module resolution
6. **Other** (~108 errors) — various type mismatches, missing props, `any` casts

</code_context>

<specifics>
## Specific Ideas

- The fusion plan specifies 3 parallel agents for Phase 1: Agent A (high-error files 42 errors), Agent B (mid-error files 22 errors), Agent C (low-error files ~74 errors)
- BodyMetricsService is THE most dangerous file — `gender = user?.gender || Gender.female` is a silent fallback that hides missing data
- garmentPreference must be in Onboarding Step 2, not optional — research confirmed cold start is incoherent without it

</specifics>

<deferred>
## Deferred Ideas

- ColdStartService refactor (bodyType+styleExpression replacing male/female buckets) — Phase 2 (needs Orchestrator context)
- FashionCLIP ONNX export — Phase 4 (only needed when Onboarding image seeds are used)
- SASRec training pipeline — Phase 8 (needs behavioral data)
- ClothingItem color standardization — Phase 7 (needs real product data)

</deferred>

---

_Phase: 01-foundation-ts-cleanup_
_Context gathered: 2026-04-22_

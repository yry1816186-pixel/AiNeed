# Phase 1: Foundation + TS Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-foundation-ts-cleanup
**Mode:** Auto (--auto)
**Areas discussed:** TS Error Strategy, Gender Demotion Scope, Data Schema, Interface Contracts, Mock Data

---

## TS Error Strategy

| Option                     | Description                                                                                  | Selected |
| -------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| Batch fix by error pattern | Group 138 errors into pattern clusters (color index, casing, imports), fix each pattern once | ✓        |
| Fix file by file           | Process each of ~20 files sequentially                                                       |          |
| Codemod generation         | Write automated codemods for all patterns                                                    |          |

**Auto-selected:** Batch fix by error pattern (recommended — most efficient for 138 errors with dominant patterns)
**Notes:** 3 dominant patterns account for ~27 errors. Remaining ~111 are diverse but individually simple.

---

## Gender Demotion Scope

| Option                              | Description                                                     | Selected |
| ----------------------------------- | --------------------------------------------------------------- | -------- |
| Full demotion in one pass           | Modify all 12 backend files + mobile stores in Phase 1          | ✓        |
| Partial demotion (DTO + store only) | Only make gender optional in API and store, defer service logic |          |
| Phase-by-phase demotion             | Spread across Phase 1-2-3                                       |          |

**Auto-selected:** Full demotion in one pass (recommended — avoids half-done state that breaks downstream)
**Notes:** ColdStartService deferred to Phase 2 (needs Orchestrator context). BodyMetricsService is THE dangerous file.

---

## Data Schema

| Option                          | Description                                                              | Selected |
| ------------------------------- | ------------------------------------------------------------------------ | -------- |
| Prisma migration + seed rewrite | Single migration for all schema changes, rewrite gender-biased seed data | ✓        |
| Incremental migrations          | Separate migration per table change                                      |          |
| Schema-only, seed later         | Add fields but don't populate in Phase 1                                 |          |

**Auto-selected:** Prisma migration + seed rewrite (recommended — schema and data consistency)
**Notes:** New tables: RecommendationBatch, RecommendationImpression. Unified UserBehaviorEvent.

---

## Interface Contracts

| Option                     | Description                                                            | Selected |
| -------------------------- | ---------------------------------------------------------------------- | -------- |
| Freeze all 3 contracts     | RecommendationOutput, TryOnResult, OnboardingOutput in packages/types/ | ✓        |
| Freeze recommendation only | Only freeze what Phase 2 needs immediately                             |          |
| Defer all freezing         | Let each phase define its own contracts                                |          |

**Auto-selected:** Freeze all 3 contracts (recommended — prevents Phase 2-4 agent divergence)
**Notes:** garmentPreference is REQUIRED in OnboardingOutput. gender is OPTIONAL with zero weight.

---

## Mock Data

| Option                               | Description                                           | Selected |
| ------------------------------------ | ----------------------------------------------------- | -------- |
| 100+ items, scenario × budget matrix | Minimum 100 items across 8 scenarios × 3 budget bands | ✓        |
| 50 items, basic coverage             | Fewer items, just enough to not crash                 |          |
| Reuse existing seed data             | Modify existing clothing.seed.ts                      |          |

**Auto-selected:** 100+ items, scenario × budget matrix (recommended — sufficient coverage for recommendation testing)
**Notes:** Body type coverage not required in Phase 1. Each item includes source: MOCK.

---

## Claude's Discretion

- Exact file ordering within each parallel agent batch
- Specific body fat calculation coefficients (as long as Gender.female fallback is eliminated)
- Prisma migration naming convention
- Mock data fixture file format

## Deferred Ideas

- ColdStartService refactor — Phase 2
- FashionCLIP ONNX export — Phase 4
- SASRec training pipeline — Phase 8
- Color standardization service — Phase 7

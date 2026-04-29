---
phase: 20-hou-duan-quan-zhan-yi-jian-qi-dong-yan-zheng
plan: 04
subsystem: backend
tags: [schema, prisma, demo-data, anti-fraud, gap-closure]
dependency_graph:
  requires: [20-01, 20-02, 20-03]
  provides: [schema-level-demo-filtering]
  affects: [recommendation-api, demo-seed]
tech_stack:
  added: [prisma-boolean-field, prisma-string-field]
  patterns: [safe-default-migration, dual-storage-backward-compat]
key_files:
  created: []
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/prisma/seeds/demo-recommendations.seed.ts
decisions:
  - is_demo/provider as schema fields (not just JSON context) for Prisma queryability
  - @default(false) and @default("real") ensures zero impact on existing production data
  - Context JSON retains is_demo/provider for backward compatibility
metrics:
  duration: 2min
  completed: "2026-04-29"
---

# Phase 20 Plan 04: Gap Closure — is_demo/provider Schema Fields Summary

Added `is_demo Boolean @default(false)` and `provider String @default("real")` to RecommendationBatch and StyleRecommendation models, enabling Prisma-level filtering of demo data for ROADMAP success criteria #5 and #8.

## Tasks Completed

| Task | Name                                                 | Commit   | Files                                                  |
| ---- | ---------------------------------------------------- | -------- | ------------------------------------------------------ |
| 1    | Add is_demo/provider fields to recommendation models | 5f552df6 | apps/backend/prisma/schema.prisma                      |
| 2    | Update demo seed to use schema-level fields          | 438648e9 | apps/backend/prisma/seeds/demo-recommendations.seed.ts |

## Changes Made

### Task 1: Schema Fields + Indexes

**RecommendationBatch** (schema.prisma):

- Added `is_demo Boolean @default(false)` at line 551
- Added `provider String @default("real")` at line 552
- Added `@@index([is_demo])` at line 560
- Added `@@index([provider])` at line 561

**StyleRecommendation** (schema.prisma):

- Added `is_demo Boolean @default(false)` at line 840
- Added `provider String @default("real")` at line 841
- Added `@@index([is_demo])` at line 855
- Added `@@index([provider])` at line 856

### Task 2: Demo Seed Update

**demo-recommendations.seed.ts**:

- `recommendationBatch.create`: Added `is_demo: true` and `provider: "sandbox"` as top-level data fields (lines 45-46)
- `styleRecommendation.create`: Added `is_demo: true` and `provider: "sandbox"` as top-level data fields (lines 76-77)
- Context JSON still contains `is_demo` and `provider` for backward compat (unchanged)

## Verification Results

- `npx prisma validate` — PASS (schema valid)
- `is_demo Boolean @default(false)` present on both RecommendationBatch (line 551) and StyleRecommendation (line 840)
- `provider String @default("real")` present on both models
- `@@index([is_demo])` and `@@index([provider])` on both models
- Seed file contains 3 `is_demo: true` and 3 `provider: "sandbox"` occurrences (top-level + JSON context)

## Decisions Made

1. **Safe defaults**: `@default(false)` for is_demo and `@default("real")` for provider — existing rows unaffected by migration
2. **Dual storage**: Kept is_demo/provider in JSON context for backward compat while adding schema-level fields for queryability
3. **Index placement**: Added after existing indexes, before `@@map` (RecommendationBatch) or closing brace (StyleRecommendation)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

No new security surface introduced beyond plan's threat model. Fields are metadata-only with safe defaults.

## Self-Check: PASSED

- FOUND: apps/backend/prisma/schema.prisma
- FOUND: apps/backend/prisma/seeds/demo-recommendations.seed.ts
- FOUND: .planning/phases/20-hou-duan-quan-zhan-yi-jian-qi-dong-yan-zheng/20-04-SUMMARY.md
- FOUND: 5f552df6 feat(20-04): add is_demo and provider fields to recommendation models
- FOUND: 438648e9 feat(20-04): update demo seed to use schema-level is_demo and provider fields

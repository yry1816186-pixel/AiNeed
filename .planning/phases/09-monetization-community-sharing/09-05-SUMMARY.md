---
phase: 09-monetization-community-sharing
plan: 05
status: completed
started: 2026-04-26T02:40:00Z
completed: 2026-04-26T02:50:00Z
total_tasks: 1
completed_tasks: 1
---

# Plan 09-05 Summary: CapsuleWardrobeProcessor -- BullMQ Async AI Generation

## Objective

Implement BullMQ processor for capsule wardrobe AI generation. Reads user wardrobe items from Prisma, calls Python DialogEngine for AI recommendations, merges into 30-piece capsule plan, and stores result in ContentPurchase metadata.

## Key Files Created

| File                                                                                             | Purpose                                                                                                        |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/domains/commerce/content-product/capsule-wardrobe.processor.ts`                | BullMQ processor that reads user saved/wishlisted items, calls DialogEngine AI, produces 30-piece capsule plan |
| `apps/backend/src/domains/commerce/content-product/__tests__/capsule-wardrobe.processor.spec.ts` | 11 tests covering processor behavior and getCapsuleWardrobeResult                                              |

## Key Files Modified

| File                                                                                          | Change                                                                             |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma`                                                           | Added `metadata Json?` field to ContentPurchase model for storing capsulePlan      |
| `apps/backend/src/domains/commerce/content-product/content-product.service.ts`                | Replaced stub with actual BullMQ dispatch; added `getCapsuleWardrobeResult` method |
| `apps/backend/src/domains/commerce/content-product/content-product.controller.ts`             | Added GET /capsule-wardrobe/result endpoint                                        |
| `apps/backend/src/domains/commerce/content-product/content-product.module.ts`                 | Added BullModule.registerQueue + CapsuleWardrobeProcessor provider                 |
| `apps/backend/src/domains/commerce/content-product/__tests__/content-product.service.spec.ts` | Added BullQueue mock to fix dependency injection                                   |

## Task 1: CapsuleWardrobeProcessor (TDD: RED -> GREEN)

**TDD approach: RED -> GREEN**

- **RED**: Wrote 11 tests covering all 9 plan behaviors (processor reads items, calculates counts, calls AI, merges plan, stores result, retries, final failure, and 3 result status states)
- **GREEN**: Implemented all components to pass all tests

**Implementation details:**

- `CapsuleWardrobeProcessor`: Extends `WorkerHost` with `@Processor("capsule-wardrobe-generate")`, concurrency=2
- Reads user items via `prisma.favorite.findMany` with `section: "saved_outfit"` and `section: "wishlisted"`
- Calculates `neededCount = max(0, 30 - existingCount)` for AI supplement recommendations
- Calls Python DialogEngine via dynamic `axios.post` to `POST /dialog/generate` with existing items context + needed count
- Builds `CapsulePlan` with: totalItems=30, existingItems, recommendedItems, outfitCombinations, reuseStats (averageReuse + top 5 most versatile), generatedAt
- Stores result in `ContentPurchase.metadata.capsulePlan` via `prisma.contentPurchase.update`
- Retry logic: 3 attempts with exponential backoff (2s base). On final failure (attemptsMade >= 2), stores `{ error, failedAt }` in metadata instead of re-throwing
- `ContentProductService.generateCapsuleWardrobe()`: dispatches BullMQ job, checks for existing plan or prior failure (allows retry)
- `ContentProductService.getCapsuleWardrobeResult()`: returns `{ status: "ready"|"generating"|"not_purchased" }` with capsulePlan when ready
- `ContentProductController`: GET /capsule-wardrobe/result endpoint with JWT auth

## Verification Results

1. Tests: `pnpm --filter backend test -- --testPathPattern="content-product" --passWithNoTests --forceExit`
   - 2 test suites, 31 tests -- ALL PASSED
   - capsule-wardrobe.processor.spec.ts: 11 tests
   - content-product.service.spec.ts: 20 tests (existing, still passing)

## Issues Encountered

- `ContentPurchase` model was missing `metadata Json?` field -- added to schema.prisma
- `jest.mock("axios")` with dynamic `import("axios")` required careful mock factory setup (`__esModule: true` pattern)
- Service test needed `BullQueue_capsule-wardrobe-generate` mock provider after `@InjectQueue` was added to service

## Commits

1. `166066e4` feat(commerce): add CapsuleWardrobeProcessor with BullMQ async AI generation

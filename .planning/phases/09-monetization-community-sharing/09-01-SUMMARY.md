---
phase: 09-monetization-community-sharing
plan: 01
status: completed
started: 2026-04-26T10:00:00Z
completed: 2026-04-26T10:30:00Z
total_tasks: 2
completed_tasks: 2
---

# Plan 09-01 Summary: Usage Limit System + Prisma Models

## Objective

Backend usage limit system: Redis INCR-based daily counters + NestJS Guard + decorator + progressive hint headers, plus Prisma models for content purchases and studio commissions.

## Key Files Created

| File                                                                                  | Purpose                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- | -------------------------- |
| `apps/backend/src/domains/commerce/usage-limit/usage-limit.service.ts`                | Redis INCR-based daily usage counting with Shanghai timezone TTL         |
| `apps/backend/src/domains/commerce/usage-limit/usage-limit.guard.ts`                  | NestJS Guard with premium bypass, X-Usage-\* headers, HTTP 429 exception |
| `apps/backend/src/domains/commerce/usage-limit/usage-limit.decorator.ts`              | @RequireLimit('ai_chat'                                                  | 'try_on' | 'wardrobe_item') decorator |
| `apps/backend/src/domains/commerce/usage-limit/dto/usage-limit.dto.ts`                | UsageActionType enum, UsageLimitResult and UsageLimitHeaders interfaces  |
| `apps/backend/src/domains/commerce/usage-limit/usage-limit.module.ts`                 | NestJS module exporting service and guard                                |
| `apps/backend/src/domains/commerce/usage-limit/__tests__/usage-limit.service.spec.ts` | 6 service tests                                                          |
| `apps/backend/src/domains/commerce/usage-limit/__tests__/usage-limit.guard.spec.ts`   | 10 guard tests                                                           |

## Key Files Modified

| File                                                   | Change                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `apps/backend/src/domains/commerce/commerce.module.ts` | Added UsageLimitModule to imports and exports                    |
| `apps/backend/prisma/schema.prisma`                    | Added 4 new models + 3 enums + contentPurchases relation on User |

## Task 1: UsageLimitModule (Service + Guard + Decorator + Tests)

**TDD approach: RED -> GREEN**

- **RED**: Wrote 16 tests covering service (6) and guard (10) behavior
- **GREEN**: Implemented all components to pass all tests

**Implementation details:**

- Redis key format: `xuno:usage:{userId}:{actionType}:{date}` (Asia/Shanghai timezone)
- TTL: seconds until next midnight in Shanghai timezone, set on first INCR only
- Daily limits: ai_chat=5, try_on=3, wardrobe_item=20, unknown=10
- Premium bypass: users with active UserSubscription skip all limits
- Response headers: X-Usage-Limit, X-Usage-Remaining, X-Usage-Reset on every guarded response
- Premium headers: X-Usage-Limit=-1, X-Usage-Remaining=-1 (unlimited)
- Exception: UsageLimitExceededException (HTTP 429) with actionType, limit, currentUsage
- CommerceModule imports and exports UsageLimitModule

## Task 2: Prisma Models

**Models added:**

- `ContentPurchase` -- one-time product unlock with @@unique([userId, productType])
- `StudioReferral` -- 7-day window tracking with @@index([userId, referredAt])
- `StudioCommissionBill` -- monthly settlement with @@unique([studioId, period])
- `StudioCommissionRate` -- configurable 15-20% rates with @unique studioId

**Enums added:**

- `ContentProductType` (color_report, body_report, capsule_wardrobe)
- `ContentPurchaseStatus` (active, refunded, expired)
- `StudioReferralStatus` (pending, converted, expired, cancelled)
- `CommissionBillStatus` (pending, confirmed, paid, disputed)

**Relation added:**

- `User.contentPurchases ContentPurchase[]`

## Verification Results

1. Tests: `pnpm --filter backend test -- --testPathPattern="usage-limit" --forceExit`
   - 2 test suites, 16 tests -- ALL PASSED
2. Schema: `npx prisma validate`
   - Schema valid

## Issues Encountered

None. Both tasks completed cleanly without issues.

## Commits

1. `c7640b38` feat(commerce): add UsageLimitModule with Redis INCR daily counters
2. `509cc78c` feat(prisma): add Phase 9 models for content purchases and studio commissions

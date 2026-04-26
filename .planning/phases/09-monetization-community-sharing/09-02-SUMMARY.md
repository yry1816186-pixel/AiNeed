---
phase: 09-monetization-community-sharing
plan: 02
status: completed
started: 2026-04-26T11:00:00Z
completed: 2026-04-26T11:25:00Z
total_tasks: 3
completed_tasks: 3
---

# Plan 09-02 Summary: Content Product + Studio Commission + Premium Gating

## Objective

Backend content product purchase system, studio referral tracking with monthly commission billing, and premium feature gating via SubscriptionGuard.

## Key Files Created

| File                                                                                              | Purpose                                                                                                      |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `apps/backend/src/domains/commerce/content-product/content-product.service.ts`                    | Content product purchase/unlock/check logic with PaymentService integration                                  |
| `apps/backend/src/domains/commerce/content-product/content-product.controller.ts`                 | REST endpoints: GET /content-products, POST /:type/purchase, GET /purchased, POST /capsule-wardrobe/generate |
| `apps/backend/src/domains/commerce/content-product/content-product.module.ts`                     | NestJS module importing PaymentModule, PrismaModule, SubscriptionModule                                      |
| `apps/backend/src/domains/commerce/content-product/dto/content-product.dto.ts`                    | DTOs for content product operations                                                                          |
| `apps/backend/src/domains/commerce/content-product/__tests__/content-product.service.spec.ts`     | 20 tests (8 service + 12 premium gating)                                                                     |
| `apps/backend/src/domains/commerce/studio-commission/studio-commission.service.ts`                | Studio referral tracking, order association, monthly bill generation                                         |
| `apps/backend/src/domains/commerce/studio-commission/studio-commission.controller.ts`             | REST endpoints: POST /referral/record, GET /bills, POST /bills/generate                                      |
| `apps/backend/src/domains/commerce/studio-commission/studio-commission.module.ts`                 | NestJS module with BullMQ commission-billing queue                                                           |
| `apps/backend/src/domains/commerce/studio-commission/dto/studio-commission.dto.ts`                | DTOs for studio commission operations                                                                        |
| `apps/backend/src/domains/commerce/studio-commission/__tests__/studio-commission.service.spec.ts` | 7 tests                                                                                                      |

## Key Files Modified

| File                                                                 | Change                                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/domains/commerce/payment/events/payment.events.ts` | Added CONTENT_PURCHASE_COMPLETED event + ContentPurchasePayload interface                                                         |
| `apps/backend/src/config/membership-plans.ts`                        | Added continuousOutfitPlan, deepWardrobeDiagnosis, aiProactivePush to features interface; set -1 for premium, absent for free/pro |
| `apps/backend/src/domains/commerce/commerce.module.ts`               | Added ContentProductModule and StudioCommissionModule to imports and exports                                                      |

## Task 1: ContentProductModule (Service + Controller + Payment Event Extension + Tests)

**TDD approach: RED -> GREEN**

- **RED**: Wrote 8 tests covering getProducts, checkPurchased, purchase, handlePaymentCompleted, getPurchasedProducts
- **GREEN**: Implemented all components to pass all tests

**Implementation details:**

- PRODUCTS constant: color_report=9.9, body_report=9.9, capsule_wardrobe=19.0 (server-side, not client input)
- `purchase()` validates not-already-purchased, creates PaymentOrder via PaymentService
- `handlePaymentCompleted()` uses Prisma upsert for idempotency (@@unique constraint on userId+productType)
- `generateCapsuleWardrobe()` verifies purchase exists, returns generating status (actual AI in Plan 09-05)
- PAYMENT_EVENTS.CONTENT_PURCHASE_COMPLETED added to payment.events.ts
- ContentPurchasePayload added to PaymentEventPayload union type
- Controller exposes 5 REST endpoints with JWT auth

## Task 2: StudioCommissionModule (Referral Tracking + Monthly Billing + Tests)

**TDD approach: RED -> GREEN**

- **RED**: Wrote 7 tests covering recordReferral, associateOrder, generateMonthlyBill, getCommissionBills
- **GREEN**: Implemented all components to pass all tests

**Implementation details:**

- 24h dedup: findFirst checks userId+studioId+referredAt within 24 hours before creating
- 7-day conversion window: associateOrder finds most recent pending referral within 7 days
- Default commission rate: 0.15 (15%) from StudioCommissionRate table or fallback
- generateMonthlyBill: counts total referrals + converted referrals, calculates commission via upsert
- BullMQ queue "commission-billing" registered in module for monthly cron scheduling
- Controller: POST /referral/record (silent tracking), GET /bills, POST /bills/generate (admin only)

## Task 3: MON-03 Premium Feature Gating

**TDD approach: RED -> GREEN**

- **RED**: Wrote 12 tests covering premium feature checkPermission behavior and MEMBERSHIP_PLANS configuration
- **GREEN**: Updated membership-plans.ts + controller with SubscriptionGuard

**Implementation details:**

- MEMBERSHIP_PLANS.premium.features: continuousOutfitPlan=-1, deepWardrobeDiagnosis=-1, aiProactivePush=-1
- Free/pro plans: these features absent (undefined -> getNumericFeatureLimit returns 0)
- POST /capsule-wardrobe/generate uses @UseGuards(SubscriptionGuard) + @SetMetadata(FEATURE_KEY, "continuousOutfitPlan")
- SubscriptionService.checkPermission returns allowed=false for free users, allowed=true for premium

## Verification Results

1. Tests: `pnpm --filter backend test -- --testPathPattern="content-product|studio-commission" --forceExit`

   - 2 test suites, 27 tests -- ALL PASSED

2. Breakdown:
   - content-product: 20 tests (8 service + 12 premium gating)
   - studio-commission: 7 tests

## Issues Encountered

- Initial JwtAuthGuard import path was wrong (`../../../common/guards/` -> `../../identity/auth/guards/`). Fixed after lint error in pre-commit hook.
- `period.split("-").map(Number)` destructure needed null guards for TypeScript strictness.

## Commits

1. `3ebd5546` feat(commerce): add ContentProduct + StudioCommission modules with premium feature gating

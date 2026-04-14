---
phase: 08-private-consultant
plan: 03
subsystem: api, payments
tags: [nestjs, prisma, scheduling, staged-payment, commission]
requires:
  - phase: 08-private-consultant/08-01
    provides: ConsultantAvailability model, ServiceBooking staged payment fields
provides:
  - ConsultantAvailabilityService with slot generation and conflict detection
  - Staged payment: 30% deposit + 70% final with platform commission 15%
  - Earnings management and withdrawal system
  - Availability scheduling DTOs and endpoints
affects: [08-05]
tech-stack:
  added: []
  patterns: [staged payment 30/70 split, platform commission 15%, time slot generation from templates]

key-files:
  created:
    - apps/backend/src/modules/consultant/consultant-availability.service.ts
    - apps/backend/src/modules/consultant/consultant-availability.service.spec.ts
    - apps/backend/src/modules/consultant/dto/availability.dto.ts
    - apps/backend/src/modules/consultant/dto/withdrawal.dto.ts
  modified:
    - apps/backend/src/modules/consultant/consultant.service.ts
    - apps/backend/src/modules/consultant/consultant.controller.ts
    - apps/backend/src/modules/consultant/consultant.module.ts

key-decisions:
  - "30% deposit + 70% final payment split"
  - "15% platform commission deducted from final payment"
  - "24h cancellation rule: full refund if >24h, 20% penalty if <24h"
  - "New consultant protection in ranking (minimum 0.5 score for <5 orders)"

requirements-completed: [ADV-04, ADV-07, ADV-08]

duration: pre-existing
completed: 2026-04-14
---

# Phase 08 Plan 03: Scheduling + Staged Payment + Settlement Summary

**ConsultantAvailabilityService with time slot generation, staged payment (30% deposit + 70% final), 15% platform commission, earnings management, and withdrawal system**

## Performance

- **Duration:** Pre-existing (committed prior to this execution session)
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- ConsultantAvailabilityService: weekly template CRUD, slot generation, conflict detection
- Availability DTOs: CreateAvailabilityDto, BatchCreateAvailabilityDto, AvailableSlotsQueryDto
- Staged payment: deposit 30%, final 70%, server-side calculation to prevent tampering
- Payment confirmation with idempotency (skip if already paid)
- Platform commission: 15% calculated on final payment confirmation
- ConsultantEarning record created on final payment
- Earnings list with summary (totalEarned, pendingAmount, settledAmount)
- Withdrawal request with available balance validation
- 24h cancellation rule with configurable penalty

## Task Commits

1. **Task 1: Availability service** - `f468d88` (feat)
2. **Task 2: Staged payment** - `c0e0282` (feat)
3. **Task 3: Earnings + withdrawal** - `d6c6957` (feat)
4. **Task 4: Tests** - `7283465` (fix/test)

## Files Created/Modified
- `apps/backend/src/modules/consultant/consultant-availability.service.ts` - Slot generation + conflict detection
- `apps/backend/src/modules/consultant/dto/availability.dto.ts` - Availability DTOs
- `apps/backend/src/modules/consultant/dto/withdrawal.dto.ts` - Withdrawal DTO
- `apps/backend/src/modules/consultant/consultant.service.ts` - Payment, earnings, withdrawal methods
- `apps/backend/src/modules/consultant/consultant.controller.ts` - Payment + earnings endpoints

## Decisions Made
- Deposit 30%, final 70%, all amounts server-calculated
- Platform commission 15% from total price
- 24h cancellation: full refund before, 20% penalty after
- Earning records created automatically on final payment confirmation

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness
- Scheduling API ready for mobile calendar view (Plan 05)
- Payment flow ready for mobile deposit/final CTA buttons
- Earnings/withdrawal ready for consultant dashboard

---
*Phase: 08-private-consultant*
*Completed: 2026-04-14*

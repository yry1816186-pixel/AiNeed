# Phase 04 Plan 03: Commerce Domain Migration Summary

## Execution Date
2026-04-17

## Objective
Migrate 9 commerce modules to `src/domains/commerce/`, merge stock-notification into platform notification, and eliminate CartModule <-> CouponModule and RefundRequestModule <-> PaymentModule forwardRef circular dependencies.

## Completed Tasks

### Task 01: Created Commerce Domain Directory Structure
- Created `src/domains/commerce/` with 8 subdirectories: cart/, coupon/, order/, payment/, refund-request/, subscription/, address/, size-recommendation/
- Created `src/domains/commerce/commerce.module.ts` as domain aggregator importing all 8 submodules

### Task 02: Migrated Payment Module
- Copied `src/modules/payment/` to `src/domains/commerce/payment/`
- Updated import paths: `../../common/` -> `../../../common/`, `../auth/` -> `../../../domains/identity/auth/`
- Payment module contains: controller, service, DTOs, events, guards, listeners, providers, types

### Task 03: Migrated Order Module
- Copied `src/modules/order/` to `src/domains/commerce/order/`
- Updated import paths including cross-domain references to PaymentModule and NotificationModule
- OrderModule now imports PaymentModule via `../payment/payment.module` (same domain)
- OrderService references NotificationService via `../../../domains/platform/notification/services/notification.service`

### Task 04: Eliminated CartModule <-> CouponModule Circular Dependency
**Analysis**: The forwardRef was unnecessary. CouponModule does NOT import CartModule - it was a one-way dependency from Cart -> Coupon.

**Changes**:
- `cart.module.ts`: Removed `forwardRef(() => CouponModule)`, replaced with direct `CouponModule` import
- `cart.service.ts`: Removed `@Inject(forwardRef(() => CouponService))`, replaced with direct `CouponService` injection
- Removed unused imports: `Inject`, `forwardRef` from `@nestjs/common`

### Task 05: Eliminated RefundRequestModule <-> PaymentModule Circular Dependency
**Analysis**: Same as Cart/Coupon - the forwardRef was unnecessary. PaymentModule does NOT import RefundRequestModule.

**Changes**:
- `refund-request.module.ts`: Removed `forwardRef(() => PaymentModule)`, replaced with direct `PaymentModule` import
- RefundRequestService already uses direct `PaymentService` injection (no forwardRef needed)

### Task 06: Migrated Subscription Module
- Copied `src/modules/subscription/` to `src/domains/commerce/subscription/`
- Updated import paths including AuthModule cross-domain reference
- SubscriptionModule contains: controller, service, decorators, DTOs, guards, listeners

### Task 07: Migrated Address and Size-Recommendation Modules
- Copied both modules to `src/domains/commerce/`
- Updated all import paths

### Task 08: Merged Stock-Notification into Platform Notification
- Copied `src/modules/stock-notification/` to `src/domains/platform/notification/stock/`
- Updated import paths: `../../common/` -> `../../../../common/`, `../auth/` -> `../../../../domains/identity/auth/`
- Updated `notification.module.ts` to import and export `StockNotificationModule`
- Stock-notification is now a submodule of platform notification, NOT in commerce domain

### Task 09: Updated All Cross-Module Import Path References
Updated 20+ files across the codebase that referenced old module paths:
- `modules/auth/` -> `domains/identity/auth/`
- `modules/metrics/` -> `domains/platform/metrics/`
- `modules/onboarding/` -> `domains/identity/onboarding/`
- `modules/profile/` -> `domains/identity/profile/`
- `modules/analytics/` -> `domains/platform/analytics/`
- `modules/merchant/` -> `domains/platform/merchant/`
- `modules/payment/events` -> `domains/commerce/payment/events`
- `modules/notification/` -> `domains/platform/notification/`

### Task 10: Updated app.module.ts
- Replaced 9 individual commerce module imports with single `CommerceModule` import
- Updated all domain module import paths to use `domains/` paths
- Updated `JwtAuthGuard` import to `domains/identity/auth/guards/jwt-auth.guard`
- Removed `StockNotificationModule` standalone import (now accessed through NotificationModule)

## Build Verification
- **TS2307 (module not found) errors: 0**
- **Other TS errors: 0** (via `npx tsc --noEmit`)
- All import paths resolve correctly

## Circular Dependency Verification
- `grep -r "forwardRef.*Cart\|forwardRef.*Coupon" src/` -> **0 matches**
- `grep -r "forwardRef.*Payment\|forwardRef.*RefundRequest" src/` -> **0 matches**

## Files Deleted from src/modules/
- cart/, coupon/, order/, payment/, refund-request/, subscription/, address/, size-recommendation/, stock-notification/

## Domain Architecture After Migration

```
src/domains/
  ai-core/          (Plan 02)
    ai/, ai-safety/, ai-stylist/, photos/, try-on/
  commerce/         (Plan 03 - THIS PLAN)
    cart/, coupon/, order/, payment/, refund-request/,
    subscription/, address/, size-recommendation/
  fashion/          (Plan 01)
    brands/, clothing/, search/, style-assessment/, wardrobe/, weather/
  identity/         (Plan 01)
    auth/, onboarding/, privacy/, profile/, users/
  platform/         (Plan 01 + Plan 03)
    admin/, analytics/, feature-flags/, health/, merchant/, metrics/,
    notification/ (with stock/ submodule), queue/, recommendations/
```

## Key Decisions
1. **forwardRef removal**: Both Cart->Coupon and RefundRequest->Payment forwardRef were unnecessary (one-way dependencies). Removed without needing EventEmitter2 refactoring.
2. **stock-notification placement**: Merged into `domains/platform/notification/stock/` instead of commerce, since notification infrastructure belongs to platform domain.
3. **CommerceModule as aggregator**: All 8 commerce submodules are imported/exported through a single CommerceModule, simplifying app.module.ts.

## Issues Encountered
- Windows PowerShell `Copy-Item` had issues with pre-existing subdirectories during file copy. Resolved by removing empty pre-created directories before copying.
- Some files had duplicate copies at root level (e.g., `cart.dto.ts` copied flat instead of into `dto/` subdirectory). Fixed by manual directory management.

## Commit
`3875d983` - refactor(backend): migrate commerce domain + eliminate circular dependencies

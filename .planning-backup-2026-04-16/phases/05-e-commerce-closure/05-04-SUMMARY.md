---
phase: 05-e-commerce-closure
plan: 04
subsystem: backend, cart, order
tags: [nestjs, prisma, cron, forwardRef, transaction, coupon]

requires:
  - phase: 05-01
    provides: CouponService with validateCoupon, calculateDiscount
provides:
  - Cart stock validation on addItem
  - Cart coupon-aware summary calculation
  - Cart batch operations (delete, move-to-favorites, SKU update)
  - Cart invalid items detection
  - Order confirm receipt with status validation
  - Order structured tracking timeline
  - Order tab-based listing with pagination
  - Order auto-confirm cron (15-day shipped orders)

affects: [05-05, 05-07, 05-08]

tech-stack:
  added: ["@nestjs/schedule Cron decorator"]
  patterns: ["forwardRef for circular CartModule-CouponModule dependency", "OrderTrackingTimeline typed array for structured timeline"]

key-files:
  created: []
  modified:
    - apps/backend/src/modules/cart/cart.service.ts
    - apps/backend/src/modules/cart/cart.controller.ts
    - apps/backend/src/modules/cart/cart.module.ts
    - apps/backend/src/modules/order/order.service.ts
    - apps/backend/src/modules/order/order.controller.ts

key-decisions:
  - "Used forwardRef to resolve CartModule-CouponModule circular dependency"
  - "Typed timeline array as OrderTrackingTimeline[] to allow optional tracking fields in structured tracking"
  - "Stock validation added to cart addItem before creating cart item"
  - "Auto-confirm cron runs daily at midnight for shipped orders older than 15 days"

patterns-established:
  - "forwardRef pattern for circular DI between cart and coupon modules"
  - "Typed timeline array for structured order tracking with optional carrier fields"

requirements-completed: [COMM-03, COMM-06, COMM-08]

duration: 12min
completed: 2026-04-14
---

# Phase 5 Plan 04: Cart + Order Enhancement Summary

Cart service enhanced with stock validation, coupon-aware pricing, batch operations, and inline SKU editing. Order service enhanced with confirm receipt, structured tracking timeline, tab-based listing, and daily auto-confirm cron.

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

### Task 1: Cart Enhancement

- Stock validation in addItem: checks ClothingItem.stock before adding to cart, throws BadRequestException if insufficient
- CouponService injected via forwardRef to resolve circular dependency with CouponModule
- getCartSummaryWithCoupon: calculates discount from coupon validation, computes shipping fee (free >= 99), returns full price breakdown
- getInvalidItems: detects cart items where product is inactive or deleted
- batchDelete: transactional multi-item deletion
- moveToFavorites: transactional favorite creation + cart item removal
- updateItemSku: color/size change with stock validation, merges quantities if target SKU already in cart
- CartModule imports CouponModule via forwardRef
- Controller added: GET /cart/invalid, DELETE /cart/batch, POST /cart/move-to-favorites, PATCH /cart/:id/sku

### Task 2: Order Enhancement

- confirmReceipt: validates SHIPPED status before transitioning to DELIVERED
- getStructuredTracking: returns OrderTrackingTimeline[] with status, time, description, and optional trackingNumber/carrier
- getOrdersByTab: tab-based filtering (all/pending/paid/shipped/completed/refund) with pagination
- autoConfirmOrders: @Cron daily at midnight, confirms shipped orders older than 15 days
- softDeleteOrder: soft-delete for cancelled/delivered/refunded orders
- Controller added: PATCH /orders/:id/confirm, DELETE /orders/:id, GET /orders/tab/:tab

## Commits

- `ccad308` -- feat(05-04): enhance cart and order modules with coupon, batch ops, tabs, auto-confirm

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed OrderTrackingTimeline type inference**
- **Found during:** Task 2
- **Issue:** Timeline array inferred from first element, causing TS2353 when pushing objects with optional trackingNumber/carrier fields
- **Fix:** Explicitly typed timeline array as `OrderTrackingTimeline[]`
- **Files modified:** apps/backend/src/modules/order/order.service.ts
- **Commit:** ccad308

## Known Stubs

None.

## Threat Flags

None.

---
phase: 09-monetization-community-sharing
plan: 03
status: complete
started: "2026-04-26"
completed: "2026-04-26"
commits: 2
files_created: 6
files_modified: 2
---

# Plan 09-03 Summary: Usage Limit BottomSheet + Content Product Screens

## What Was Done

### Task 1: Usage limit API interceptor + useUsageLimit hook + UsageLimitBottomSheet

**Commit:** `ce649037` feat(commerce): usage limit interceptor + hook + UsageLimitBottomSheet

Created a decoupled event-driven system for usage limit communication:

1. **`apps/mobile/src/shared/utils/usageEventEmitter.ts`** -- Typed event bus using `EventTarget` + `CustomEvent`. Two events: `usage:progressive` (80% threshold) and `usage:exceeded` (100% limit reached). Provides `emit()` and `on()` with type-safe payloads.

2. **`apps/mobile/src/services/api/client.ts`** (modified) -- Response interceptor reads `X-Usage-Remaining` and `X-Usage-Limit` headers. At >= 80% usage emits `usage:progressive`, at 0 remaining emits `usage:exceeded`. Error handler catches HTTP 429 and emits `usage:exceeded` with `actionType` from response body.

3. **`apps/mobile/src/features/commerce/services/usageLimitService.ts`** -- API service for explicit limit status check (`GET /usage-limit/status`). Exports `LimitInfo` type.

4. **`apps/mobile/src/features/commerce/hooks/useUsageLimit.ts`** -- React hook that subscribes to usage events via the emitter. Returns `{ showLimitSheet, setShowLimitSheet, closeLimitSheet, limitInfo }`.

5. **`apps/mobile/src/features/commerce/components/UsageLimitBottomSheet.tsx`** -- BottomSheetModal with `snapPoints=["70%"]`, matching TryOnBottomSheet pattern. Contains:
   - Header with sparkles icon + "今日额度已用完" title
   - Subtitle: "今天的 AI 穿搭搭子服务已用完，升级会员无限畅享"
   - Feature comparison table (AI 穿搭对话 5 次/天 vs 无限, 虚拟试穿 3 次/天 vs 无限, etc.)
   - Price badge: ¥9.9 元/月
   - "立即升级" CTA button navigating to SubscriptionScreen

### Task 2: Content product screens -- listing + preview/unlock + purchase flow

**Commit:** `f70880da` feat(commerce): content product screens with listing, preview/unlock, purchase flow

1. **`apps/mobile/src/features/commerce/services/contentProductService.ts`** -- Typed API service with `getProducts()`, `checkPurchased()`, `purchase()`, `getPurchased()` methods matching backend Plan 02 endpoints. Exports `ContentProductInfo`, `ContentPurchaseRecord`, `PurchaseResponse`, `CheckPurchaseResponse` types.

2. **`apps/mobile/src/features/commerce/components/ContentUnlockCTA.tsx`** -- "解锁完整报告" CTA component per D-07. Shows lock icon preview overlay, title, description, price badge, unlock button, and "购买后永久访问" hint. Uses camel brand color for CTA.

3. **`apps/mobile/src/features/commerce/screens/ContentProductScreen.tsx`** -- FlatList of product cards using `@tanstack/react-query` for data fetching. Default products (color_report 9.9, body_report 9.9, capsule_wardrobe 19.0) shown before API response. Purchased products display green "已解锁" badge + "查看报告" button. Unpurchased products show ContentUnlockCTA. Purchase triggers `contentProductService.purchase()` then navigates to Payment screen.

4. **`apps/mobile/src/navigation/types.ts`** (modified) -- Added `ContentProducts: undefined` to `ProfileStackParamList`.

5. **`apps/mobile/src/features/commerce/components/index.ts`** (updated) -- Exports `UsageLimitBottomSheet` and `ContentUnlockCTA`.

## Verification

- TypeScript compilation: 0 new errors (9 pre-existing errors in `StyleEvolutionChart.tsx` from another plan)
- All new files compile cleanly
- Prettier formatting passed via lint-staged hooks

## Files Changed

| File                                                                     | Action   | Lines |
| ------------------------------------------------------------------------ | -------- | ----- |
| `apps/mobile/src/shared/utils/usageEventEmitter.ts`                      | created  | ~55   |
| `apps/mobile/src/features/commerce/services/usageLimitService.ts`        | created  | ~22   |
| `apps/mobile/src/features/commerce/hooks/useUsageLimit.ts`               | created  | ~60   |
| `apps/mobile/src/features/commerce/components/UsageLimitBottomSheet.tsx` | created  | ~240  |
| `apps/mobile/src/services/api/client.ts`                                 | modified | +32   |
| `apps/mobile/src/features/commerce/services/contentProductService.ts`    | created  | ~70   |
| `apps/mobile/src/features/commerce/components/ContentUnlockCTA.tsx`      | created  | ~120  |
| `apps/mobile/src/features/commerce/screens/ContentProductScreen.tsx`     | created  | ~290  |
| `apps/mobile/src/features/commerce/components/index.ts`                  | modified | +2    |
| `apps/mobile/src/navigation/types.ts`                                    | modified | +1    |

## Requirements Met

| ID     | Description                                                       | Status |
| ------ | ----------------------------------------------------------------- | ------ |
| MON-01 | Free-tier limit UX (BottomSheet at 100%, toast at 80%)            | Done   |
| MON-02 | Content product purchase UI (listing + preview/unlock + purchase) | Done   |
| D-01   | BottomSheet upgrade guidance with comparison table                | Done   |
| D-05   | Progressive toast hint at 80% usage                               | Done   |
| D-06   | Content product listing page                                      | Done   |
| D-07   | Preview + unlock mode for unpaid content                          | Done   |

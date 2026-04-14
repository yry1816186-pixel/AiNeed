# AUDIT-COMPILE.md — 编译基线审计

**Date:** 2026-04-15
**Tool:** tsc --noEmit

## Summary

| Project | Errors | Warnings | Status |
|---------|--------|----------|--------|
| Backend (NestJS) | 1 | 0 | FAIL |
| Mobile (React Native) | 0 | 0 | PASS |

## Backend Errors (1)

| File | Line | Code | Description |
|------|------|------|-------------|
| src/modules/community/community.controller.ts | 296 | TS2339 | Property 'getUserPublicProfile' does not exist on type 'CommunityService' |

### Root Cause
`CommunityController` references `this.communityService.getUserPublicProfile()` but `CommunityService` does not define this method. Likely a missing method or renamed method.

### Fix
Add `getUserPublicProfile` method to `CommunityService`, or change the controller call to use an existing method.

## Mobile Errors (0)

Mobile TypeScript compilation passes with zero errors. Previous known errors (ThemeContext colorSeasons, MasonryFlashList, SVG Text props) appear to have been resolved or suppressed.

## Previous Baseline (from 10-PLAN.md)

- **Mobile (34 errors in 9 files)** — previously reported. Current: **0 errors**. Significant improvement.
- **Backend** — previously reported "TypeScript not in node_modules". Current: **1 error** after pnpm install.

## Recommendations

1. Fix the single backend TS2339 error in community.controller.ts
2. Maintain zero-error baseline for both projects

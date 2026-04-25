---
phase: 08-mini-program-photo-search-social
plan: 03
subsystem: mini-program, frontend
tags: [taro, wechat, mini-program, react, zustand, share-hooks, subpackage, jwt]

# Dependency graph
requires:
  - phase: 08-01
    provides: "POST /auth/wechat-mini endpoint"
  - phase: 08-02
    provides: "GET /social/style-dna/matches endpoint"
provides:
  - "Taro 4 mini-program project in apps/mini-program/"
  - "request.ts: Taro.request wrapper with JWT interceptor (401 redirect)"
  - "auth.ts: wx.login -> POST /auth/wechat-mini flow with token storage"
  - "dialog.ts: POST /dialog wrapper for Yiyi chat"
  - "Home page with photo search entry + quick chat + share hooks"
  - "Chat page with full Yiyi dialog interface"
  - "Profile page with WeChat login/logout"
  - "Subpackage structure: main (index, profile) + chat/search/social"
affects: [08-04]

# Tech tracking
tech-stack:
  added: [taro-4.2.0, taro-ui-3.3.1]
  patterns:
    [
      taro-request-jwt-interceptor,
      wechat-mini-login-flow,
      subpackage-routing,
      useShareAppMessage-viral,
    ]

key-files:
  created:
    - apps/mini-program/package.json
    - apps/mini-program/tsconfig.json
    - apps/mini-program/config/index.ts
    - apps/mini-program/config/dev.ts
    - apps/mini-program/config/prod.ts
    - apps/mini-program/project.config.json
    - apps/mini-program/src/app.config.ts
    - apps/mini-program/src/app.tsx
    - apps/mini-program/src/app.scss
    - apps/mini-program/src/services/request.ts
    - apps/mini-program/src/services/auth.ts
    - apps/mini-program/src/services/dialog.ts
    - apps/mini-program/src/store/user.ts
    - apps/mini-program/src/components/YiyiAvatar/index.tsx
    - apps/mini-program/src/components/YiyiAvatar/index.scss
    - apps/mini-program/src/components/ChatMessage/index.tsx
    - apps/mini-program/src/components/ChatMessage/index.scss
    - apps/mini-program/src/components/QuickReply/index.tsx
    - apps/mini-program/src/components/QuickReply/index.scss
    - apps/mini-program/src/pages/index/index.tsx
    - apps/mini-program/src/pages/index/index.config.ts
    - apps/mini-program/src/pages/index/index.scss
    - apps/mini-program/src/pages/chat/index.tsx
    - apps/mini-program/src/pages/chat/index.config.ts
    - apps/mini-program/src/pages/chat/index.scss
    - apps/mini-program/src/pages/profile/index.tsx
    - apps/mini-program/src/pages/profile/index.config.ts
    - apps/mini-program/src/pages/profile/index.scss
    - apps/mini-program/src/pages/search/index.tsx
    - apps/mini-program/src/pages/search/index.config.ts
    - apps/mini-program/src/pages/search/index.scss
    - apps/mini-program/src/pages/social/index.tsx
    - apps/mini-program/src/pages/social/index.config.ts
    - apps/mini-program/src/pages/social/index.scss
  modified:
    - pnpm-workspace.yaml

key-decisions:
  - "Subpackage strategy: main package has index + profile (<2MB), chat/search/social in subpackages"
  - "Taro.getStorageSync for JWT (not async) for simplicity; WeChat sandbox provides app-level isolation"
  - "401 interceptor clears tokens and redirects to profile page (not re-login)"
  - "Upload uses Taro.uploadFile with Bearer token header for image search"
  - "Share links use path-only with no sensitive params per threat model T-08-08"

patterns-established:
  - "Mini-program auth: Taro.login code -> POST /auth/wechat-mini -> store tokens -> Zustand"
  - "Share hooks: useShareAppMessage on all pages for viral WeChat distribution"
  - "Page config pattern: definePageConfig with enableShareAppMessage per page"

requirements-completed: [MINI-01, MINI-02]

# Metrics
duration: 10min
completed: 2026-04-25
---

# Phase 08 Plan 03: Taro Mini-program Scaffolding Summary

**Taro 4.2.0 mini-program project with 3 core pages (home, chat, profile), JWT-authenticated request layer, WeChat login flow, and viral share hooks**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T11:47:29Z
- **Completed:** 2026-04-25T11:57:35Z
- **Tasks:** 2
- **Files created:** 33, **Files modified:** 1

## Accomplishments

- Complete Taro 4.2.0 project in apps/mini-program/ with React 18 + Zustand + taro-ui
- Subpackage routing strategy: main pages (index, profile) + chat/search/social subpackages
- request.ts wraps Taro.request with JWT interceptor, 401 redirect, and upload support
- auth.ts implements wx.login -> POST /auth/wechat-mini flow with token storage
- dialog.ts wraps POST /dialog for Yiyi chat with sessionId tracking
- Home page: Yiyi greeting, photo search (chooseImage), quick chat button, share hooks
- Chat page: full dialog interface with message bubbles, quick replies, auto-scroll
- Profile page: WeChat login button, logged-in state with avatar/nickname, logout
- YiyiAvatar, ChatMessage, QuickReply shared components with XUNO design tokens
- useShareAppMessage and useShareTimeline hooks configured for viral distribution
- TypeScript compiles with zero errors in source files (upstream Taro type issues only)
- pnpm-workspace.yaml updated to include apps/mini-program

## Task Commits

Each task was committed atomically:

1. **Task 1: Taro project scaffolding + services + store** - `94350e06` (feat)
2. **Task 2: Taro pages + shared components** - `60ee9214` (feat)

## Files Created/Modified

- `apps/mini-program/package.json` - New: Taro 4.2.0 project with React, zustand, taro-ui
- `apps/mini-program/tsconfig.json` - New: TypeScript config with path aliases
- `apps/mini-program/config/index.ts` - New: Taro build config (webpack5, react, postcss)
- `apps/mini-program/config/dev.ts` - New: dev environment with localhost API
- `apps/mini-program/config/prod.ts` - New: prod environment with api.xuno.ai
- `apps/mini-program/project.config.json` - New: WeChat DevTools project config
- `apps/mini-program/src/app.config.ts` - New: subpackage routing strategy
- `apps/mini-program/src/app.tsx` - New: Taro app entry
- `apps/mini-program/src/app.scss` - New: XUNO design tokens (warm-camel, charcoal, warm-white)
- `apps/mini-program/src/services/request.ts` - New: Taro.request wrapper with JWT + 401 + upload
- `apps/mini-program/src/services/auth.ts` - New: wx.login -> /auth/wechat-mini flow
- `apps/mini-program/src/services/dialog.ts` - New: POST /dialog wrapper
- `apps/mini-program/src/store/user.ts` - New: Zustand auth state
- `apps/mini-program/src/components/YiyiAvatar/` - New: warm-camel circle avatar
- `apps/mini-program/src/components/ChatMessage/` - New: user/assistant message bubbles
- `apps/mini-program/src/components/QuickReply/` - New: horizontal scrollable quick replies
- `apps/mini-program/src/pages/index/` - New: home page with photo search + share hooks
- `apps/mini-program/src/pages/chat/` - New: Yiyi dialog page
- `apps/mini-program/src/pages/profile/` - New: login/profile page
- `apps/mini-program/src/pages/search/` - New: placeholder for photo search results
- `apps/mini-program/src/pages/social/` - New: placeholder for Style DNA matches
- `pnpm-workspace.yaml` - Modified: added apps/mini-program

## Decisions Made

- Subpackage strategy keeps main package minimal (index + profile only) -- sub-2MB target for WeChat review
- Taro.getStorageSync for JWT over async variant -- simpler code, WeChat sandbox provides sufficient isolation
- 401 response clears tokens and navigates to profile (not auto-relogin) -- avoids silent login loops
- Upload via Taro.uploadFile with Bearer header (not Taro.request) -- WeChat multipart form data handling
- Share links use path-only /pages/index/index with no sensitive query params -- threat model T-08-08 mitigation

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File                                         | Stub                                          | Reason                                                 |
| -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| apps/mini-program/src/pages/search/index.tsx | "Search page - coming soon" placeholder       | Plan 08-04 will implement photo search results         |
| apps/mini-program/src/pages/social/index.tsx | "Style DNA matches - coming soon" placeholder | Plan 08-04 will implement Style DNA social matching    |
| apps/mini-program/project.config.json        | appid: ""                                     | User must fill in registered WeChat mini-program AppID |

## Next Phase Readiness

- Mini-program project compiles, ready for build:weapp command
- Auth service ready to call POST /auth/wechat-mini (backend endpoint from Plan 01)
- Dialog service ready to call POST /dialog (existing backend)
- Home page chooseImage + navigateTo search ready for image search integration (Plan 04)
- Share hooks configured for WeChat viral distribution

## Self-Check: PASSED

All 33 created files and 1 modified file verified present. Both commits (94350e06, 60ee9214) verified in git log. All 6 verification checks passed.

---

_Phase: 08-mini-program-photo-search-social_
_Completed: 2026-04-25_

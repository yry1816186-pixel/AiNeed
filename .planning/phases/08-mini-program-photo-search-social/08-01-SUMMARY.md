---
phase: 08-mini-program-photo-search-social
plan: 01
subsystem: auth, api, ml
tags:
  [
    wechat,
    mini-program,
    jscode2session,
    fashion-siglip,
    vector-search,
    image-embedding,
    qdrant,
    nestjs,
    fastapi,
  ]

# Dependency graph
requires:
  - phase: 03-identity-domain
    provides: "WechatService, AuthService, AuthController, Prisma schema"
  - phase: 06-model-upgrade
    provides: "EmbeddingService with FashionSigLIP, QdrantVectorStore"
provides:
  - "POST /auth/wechat-mini endpoint with jscode2session"
  - "POST /api/vector/embed/image endpoint for FashionSigLIP image embedding"
  - "POST /api/vector/search/image endpoint for visual similarity search"
  - "AuthProvider.wechat_mini enum value"
  - "MiniProgramLoginDto with code validation"
affects: [08-02, 08-03, 08-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [jscode2session-for-mini-program, image-upload-to-embedding-pipeline]

key-files:
  created:
    - ml/api/routes/image_search.py
    - ml/api/tests/test_vector_search.py
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/domains/identity/auth/services/wechat.service.ts
    - apps/backend/src/domains/identity/auth/auth.controller.ts
    - apps/backend/src/domains/identity/auth/auth.service.ts
    - apps/backend/src/domains/identity/auth/dto/wechat-login.dto.ts
    - apps/backend/src/domains/identity/auth/auth.service.spec.ts
    - ml/api/main.py

key-decisions:
  - "Mini-program uses separate WECHAT_MINI_APP_ID/SECRET env vars with fallback to WECHAT_APP_ID/SECRET"
  - "Image search endpoint uses Form field for top_k (multipart form data)"
  - "Image validation checks content_type starts with image/ and size <= 10MB"

patterns-established:
  - "Mini-program auth flow: wx.login code -> jscode2session -> openid -> find/create user -> JWT"
  - "Image search flow: UploadFile -> PIL Image -> encode_image -> Qdrant search -> results"

requirements-completed: [MINI-01, PHO-01]

# Metrics
duration: 10min
completed: 2026-04-25
---

# Phase 08 Plan 01: Mini-program Login + Photo Search Summary

**WeChat mini-program jscode2session auth endpoint and FashionSigLIP image embedding + Qdrant vector search endpoints**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-25T11:18:32Z
- **Completed:** 2026-04-25T11:28:51Z
- **Tasks:** 2
- **Files modified:** 7 (6 backend + 1 ML)

## Accomplishments

- POST /auth/wechat-mini endpoint exchanges wx.login code for JWT via jscode2session
- POST /api/vector/search/image accepts image upload and returns visually similar items from Qdrant
- POST /api/vector/embed/image accepts image and returns 1152-dim FashionSigLIP embedding
- AuthProvider enum extended with wechat_mini value
- 51 backend tests pass (4 new loginWithMiniProgram tests) + 7 ML tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Mini-program login endpoint with jscode2session** - `e5adfae5` (feat)
2. **Task 2: Python image embedding + vector search endpoint** - `0fb685aa` (feat)

## Files Created/Modified

- `apps/backend/prisma/schema.prisma` - Added wechat_mini to AuthProvider enum
- `apps/backend/src/domains/identity/auth/services/wechat.service.ts` - Added jscode2session method with miniAppId/miniAppSecret
- `apps/backend/src/domains/identity/auth/auth.controller.ts` - Added POST /auth/wechat-mini endpoint
- `apps/backend/src/domains/identity/auth/auth.service.ts` - Added loginWithMiniProgram method
- `apps/backend/src/domains/identity/auth/dto/wechat-login.dto.ts` - Added MiniProgramLoginDto
- `apps/backend/src/domains/identity/auth/auth.service.spec.ts` - Added 4 loginWithMiniProgram tests
- `ml/api/routes/image_search.py` - New file: embed/image and search/image endpoints
- `ml/api/main.py` - Registered image_search router
- `ml/api/tests/test_vector_search.py` - New file: 7 pytest tests for image search

## Decisions Made

- Mini-program uses WECHAT_MINI_APP_ID/WECHAT_MINI_APP_SECRET with fallback to WECHAT_APP_ID/WECHAT_APP_SECRET -- this allows the same backend to serve both open platform OAuth and mini-program login with different AppIDs
- Image search uses Form field for top_k parameter (not query param) since it is a multipart upload
- Code validation limits code length to 128 chars (threat model T-08-01 mitigation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial test failure for loginWithMiniProgram because Prisma client needed regeneration after schema enum change. Fixed by running `npx prisma generate`.
- Pre-existing TypeScript errors in auth.service.ts (ConsentType mismatches in register/registerWithPhone) are unrelated to this plan.

## Next Phase Readiness

- Mini-program auth endpoint ready for frontend integration
- Image search endpoint ready for NestJS proxy layer in subsequent plans
- Prisma migration needed before deployment (schema has new enum value)

## Self-Check: PASSED

All 8 files verified present. Both commits (e5adfae5, 0fb685aa) verified in git log.

---

_Phase: 08-mini-program-photo-search-social_
_Completed: 2026-04-25_

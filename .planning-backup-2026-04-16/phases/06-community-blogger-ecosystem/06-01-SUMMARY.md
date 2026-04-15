---
phase: 06-community-blogger-ecosystem
plan: 01
subsystem: database, api
tags: [prisma, nestjs, redis, cron, community, blogger]

requires:
  - phase: 01-user-profile-style-test
    provides: User model, auth system
provides:
  - PostBookmark/ContentReport/BloggerProduct/ContentModerationLog Prisma models
  - Bookmark/share/report/trending API endpoints
  - Hot score algorithm with Redis caching
  - Following feed with mixed activity types
  - Multi-image upload (9 images max)
  - Folded comments with repliesLimit
affects: [06-02, 06-03, 06-04, 06-05]

tech-stack:
  added: [@nestjs/schedule]
  patterns: [hot-score-algorithm, redis-cache-aside, rate-limit-redis]

key-files:
  created: []
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/community/community.service.ts
    - apps/backend/src/modules/community/community.controller.ts
    - apps/backend/src/modules/community/community.module.ts
    - apps/backend/src/modules/community/dto/community.dto.ts

key-decisions:
  - "Used Redis for trending cache (TTL 300s) and report rate limiting (20/day)"
  - "Hot score formula: (like*3 + comment*2 + bookmark*5 + share*4) * time_decay where time_decay = 1/(1+hours/168)"
  - "Auto-hide posts with 3+ reports (moderationStatus=pending, isHidden=true)"

patterns-established:
  - "Cache-aside for trending: check Redis first, miss → query DB → cache top 50"
  - "Rate limiting via Redis INCR with TTL for daily reset"
  - "Cron-based hot score recalculation every 10 minutes"

requirements-completed: [SOC-01, SOC-02, SOC-03, SOC-04, SOC-05, SOC-12]

duration: 15min
completed: 2026-04-14
---

# Phase 06 Plan 01: Schema + Core Community Backend Summary

**Prisma schema with 4 new models + CommunityService bookmark/share/report/trending/hot-score + Redis caching + multi-image upload**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-14T05:00:00Z
- **Completed:** 2026-04-14T05:15:00Z
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments
- 4 new Prisma models: PostBookmark, ContentReport, BloggerProduct, ContentModerationLog
- CommunityPost extended with bookmarkCount, hotScore, moderationStatus, reportCount, isHidden
- User extended with bloggerLevel, bloggerScore, bloggerBadge
- 5 new API endpoints: bookmark, share, report, trending, following/feed
- Hot score algorithm with 10-minute cron + Redis caching
- Multi-image upload (9 max) with itemAnnotations
- Folded comments with configurable repliesLimit

## Task Commits

1. **Task 06-01-01: Schema changes** - `9dc8516` (feat)
2. **Task 06-01-02: Prisma db push** - Skipped (requires running DB)
3. **Task 06-01-03: DTOs + Service + Controller** - `b4af01a` (feat)
4. **Task 06-01-04: Hot score cron + following feed + caching** - `c062a36` (feat)
5. **Task 06-01-05: Multi-image upload + comments** - `e3d31db` (feat)

## Files Created/Modified
- `apps/backend/prisma/schema.prisma` - 4 new models + User/CommunityPost extensions + NotificationType enum
- `apps/backend/src/modules/community/dto/community.dto.ts` - 6 new DTOs + CreatePostDto.itemAnnotations + CommentQueryDto.repliesLimit
- `apps/backend/src/modules/community/community.service.ts` - 7 new methods + 3 modified methods
- `apps/backend/src/modules/community/community.controller.ts` - 5 new endpoints + 2 modified endpoints
- `apps/backend/src/modules/community/community.module.ts` - RedisModule import

## Decisions Made
- Used Redis for trending cache (key: `community:trending`, TTL 300s) and report rate limiting (key: `report:limit:{userId}`, TTL 86400s)
- Hot score formula weights: bookmark(5) > share(4) > like(3) > comment(2), with time decay half-life of 1 week (168h)
- Auto-hide posts at 3+ reports with moderationStatus="pending"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing schema errors**
- **Found during:** Task 1 (Schema changes)
- **Issue:** Duplicate `action` field on UserBehaviorEvent, missing reverse relations on ConsultantEarning/Withdrawal, missing @unique on ConsultantEarning.bookingId
- **Fix:** Removed duplicate field, added userId+user relations, added @unique constraint
- **Files modified:** apps/backend/prisma/schema.prisma
- **Verification:** prisma validate passes (except DATABASE_URL env)
- **Committed in:** 9dc8516

**2. [Rule 3 - Blocking] Fixed postinstall script**
- **Found during:** Task 1 (Schema validation)
- **Issue:** `scripts/build/patch-codegen.mjs` referenced in postinstall doesn't exist
- **Fix:** Changed postinstall to `echo skip` in root package.json
- **Files modified:** package.json
- **Verification:** pnpm install succeeds

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both necessary for build/validate to work. No scope creep.

## Issues Encountered
- prisma db push skipped (requires running PostgreSQL) - needs to be run when DB is available

## Next Phase Readiness
- Schema and backend APIs ready for Wave 2 (BloggerModule + Content Moderation)
- BloggerProduct model already in schema, ready for BloggerModule service
- ContentReport and ContentModerationLog models ready for moderation service

---
*Phase: 06-community-blogger-ecosystem*
*Completed: 2026-04-14*

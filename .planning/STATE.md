# Project State

**Project:** 寻裳 XunO
**Updated:** 2026-04-29T21:05Z

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-29)

**Core value:** 伊伊（AI 造型师）通过自然对话理解用户需求，精准推荐穿搭方案

## Phase Status

| Phase | Name                   | Status     | Progress |
| ----- | ---------------------- | ---------- | -------- |
| 1     | Foundation             | ✓ Complete | 100%     |
| 2     | Onboarding             | ✓ Complete | 100%     |
| 3     | Core AI                | ✓ Complete | 100%     |
| 4     | Commerce + Discovery   | ✓ Complete | 100%     |
| 5     | E2E Integration + Demo | ✓ Complete | 100%     |
| 6     | Production + Legal     | ✓ Complete | 100%     |

## Current Focus

Phase 6: Production + Legal — All 9 plans complete. Security hardening, rate limiting, legal docs, API docs, CI/CD, backup/restore, observability, load testing, migration/rollback all done.

## Next Action

Phase 6 complete. Ready for milestone wrap-up via `/gsd-complete-milestone`.

## Decisions

| Decision                                                 | Rationale                                                               | Date       |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| Pre-cache endpoint unauthenticated                       | Called by warmup scripts during infra setup                             | 2026-04-29 |
| TTS precache with HTTP fallback                          | Calls own endpoint first, local cache markers if offline                | 2026-04-29 |
| Mock recommendation data for pre-cache                   | Real AI pipeline needs full session context                             | 2026-04-29 |
| ScreenErrorBoundaries.ts centralized config              | Per-screen ErrorBoundary config in single file for maintainability      | 2026-04-29 |
| Today/Discover exports converted to wrapped defaults     | Cleaner lazy-load integration without .then() remapping in navigator    | 2026-04-29 |
| Onboarding step screens get individual ErrorBoundary     | Granular crash isolation — one step crash doesn't cascade whole wizard  | 2026-04-29 |
| Demo toggle in SettingsScreen Developer section          | **DEV** only exposure, long-press version easter egg as fallback        | 2026-04-29 |
| Seed profiles as compile-time constants                  | Zero I/O overhead vs runtime JSON loading for demo performance          | 2026-04-29 |
| Demo API interceptor mock+block pattern                  | Returns cached data for reads, blocks mutations during demo mode        | 2026-04-29 |
| AiFallbackService: direct HTTP GLM->Qwen                 | Explicit priority chain with configurable 5s timeout per tier           | 2026-04-29 |
| TTS text-only fallback with status field                 | Returns TtsFallbackResult with audio_unavailable for mobile UI control  | 2026-04-29 |
| E2E runner adopts check()/record_result() pattern        | Consistent with existing demo scripts for maintainability               | 2026-04-29 |
| 3-gate pre-run validation with distinct exit codes       | 2=preflight fail, 3=warmup fail, 1=checks fail, 0=all pass              | 2026-04-29 |
| Staging deploys on develop (GitFlow convention)          | Standard GitFlow: develop→staging, v\* tags→production                  | 2026-04-29 |
| Verify-deploy.sh with configurable timeout               | 120s default, 10s retry, supports slow-starting AI service              | 2026-04-29 |
| 4-scenario rollback runbook                              | Image, config, full infra, blue-green slot with decision criteria       | 2026-04-29 |
| FashionSigLIP-only ML pipeline                           | Removed all FashionCLIP fallbacks and references from active code       | 2026-04-29 |
| Diversity scorer: entropy 40% + style 35% + price 25%    | 3-metric weighted scoring for recommendation diversity observability    | 2026-04-29 |
| Bias audit threshold <0.2 for 10 profiles                | Tightened from <0.3 to ensure >0.8 diversity across diverse profiles    | 2026-04-29 |
| Dual rate limiting: @Throttle burst + AiQuotaGuard daily | Per-minute burst protection + daily quota on all AI endpoints           | 2026-04-29 |
| pnpm audit deferred to network-accessible env            | npmjs.org timeout from China; overrides provide compensating controls   | 2026-04-29 |
| Curated YAML spec alongside auto-generated JSON          | Human-readable YAML with rate limit docs + machine-generated JSON       | 2026-04-29 |
| Swagger UI already correctly env-gated                   | Verified NODE_ENV gate in main.ts — no code change needed               | 2026-04-29 |
| HighErrorRate threshold 5% for production                | Plan spec; 1% was overly aggressive for initial production launch       | 2026-04-29 |
| AI quota panel shows exceeded events + total call rate   | Dual metric view provides operational context for quota management      | 2026-04-29 |
| Retained domain-specific alerts alongside standard ones  | BruteForceDetected, TryOnServiceDown, PaymentFailureSpike remain        | 2026-04-29 |
| Production backup uses prod-\* container prefix          | Matches docker-compose.production.yml actual names                      | 2026-04-29 |
| Neo4j backup/restore gracefully skips when unavailable   | Optional service not in production compose yet                          | 2026-04-29 |
| MinIO off-instance backup storage                        | S3-compatible storage already deployed, avoids separate S3 dependency   | 2026-04-29 |
| k6 scenario imports renamed to avoid recursion           | runChatFlow/runRecommendationFlow/runTryonFlow prevent name shadowing   | 2026-04-29 |
| Load test uses actual DTO fields (photoId/itemId)        | Cross-referenced with CreateTryOnDto and RecommendationsController      | 2026-04-29 |
| 2x backend instances recommended for production HA       | Single-instance has no failover; 2x provides basic high availability    | 2026-04-29 |
| migrate-db.sh uses prisma migrate diff for detection     | More reliable than parsing status output for pending migrations         | 2026-04-29 |
| Rollback with optional --with-db-restore flag            | Separates image revert from database restore for deployment flexibility | 2026-04-29 |

## Performance

- **05-01:** 10min, 2 tasks, 6 files | Commits: 6e0531fb, 03f19d34
- **05-02:** 13min, 2 tasks, 8 files | Commit: c4d773df
- **05-03:** 10min, 2 tasks, 7 files | Commits: f058e509, 34d4b709
- **05-04:** 10min, 3 tasks, 9 files | Commits: 2e17ef74, 58912f8b, faf3285d
- **05-05:** 7min, 2 tasks, 3 files | Commits: eb98d69b, d7245d90
- **06-04:** 5min, 2 tasks, 2 files | Commit: cfdaa2a0
- **06-01:** 12min, 3 tasks, 10 files | Commits: 3490d4ee, f946795d, db23999c, 84f7e29a
- **06-03:** 21min, 2 tasks, 6 files | Commits: f7fd3767, 35bfd40f
- **06-08:** 4min, 2 tasks, 2 files | Commits: 561e56d4, 28f5ea23
- **06-05:** 5min, 2 tasks, 4 files | Commits: 8b8cbcd0, a5c5ec7e
- **06-06:** 8min, 2 tasks, 4 files | Commits: 24c7f0be, b7b05825
- **06-07:** 6min, 2 tasks, 7 files | Commits: 04f47490, 633545a7
- **06-09:** 4min, 2 tasks, 4 files | Commits: e168a1bc, 17a5f4b2

---

_State updated: 2026-04-29 after Phase 6 Plan 09 execution_

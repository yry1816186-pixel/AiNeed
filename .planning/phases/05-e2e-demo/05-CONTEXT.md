# Phase 5: E2E Integration + Competition Demo - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Achieve production-quality competition demo capable of 3 consecutive runs with zero crashes, ≤150s each, with automated preflight/warmup and 3-tier fallback resilience. This phase closes the gap between working features (Phase 1-4) and a polished, reliable demonstration suitable for a live competition audience.

13 requirements (DEMO-01 through DEMO-13) covering: 3-run rehearsal stability, warmup/preflight automation, voice reliability, GLM fallback pipeline, offline resilience, error boundaries, demo mode isolation, and fallback plans B/C.

</domain>

<decisions>
## Implementation Decisions

### Demo stability strategy

- **D-01:** Extend ErrorBoundary `withErrorBoundary` HOC to all 4 tab screens (Today, Discover, Stylist, Me) and Onboarding wizard. Existing `ErrorBoundary` infrastructure in `apps/mobile/src/shared/components/ErrorBoundary/` already wraps `AiStylistUnifiedScreen` — extend to remaining screens. Use per-screen config from `ScreenErrorBoundaries.ts`.
- **D-02:** Run 3-consecutive-run rehearsal with `adb logcat` crash monitoring. Target: zero FATAL/ReactNative/crash entries per run, ≤150s total per run (per `DEMO-SCRIPT-TEST-PLAN.md` timing estimates).

### Pre-caching and warmup

- **D-03:** Implement `POST /api/v1/demo/pre-cache` backend endpoint (currently missing — GAP identified by codebase scout). Must warm: top-5 recommendations per scene for all 10 seed profiles, 14 TTS phrases, scene configurations. Output: cache-hit manifest for validation.
- **D-04:** Extend `scripts/demo-warmup.sh` to add post-pre-cache validation: verify pre-cache JSON exists, verify all 14 TTS audio files on disk, measure cache-hit rate via response time comparison. Adopt existing `PASS/FAIL/SKIP` pattern with `record_result()`.
- **D-05:** Demo mode toggle (`DEMO_MODE=true`) triggers automatic pre-cache refresh on app open. Pre-cache data tagged `is_demo: true` — never mixed with real user data.

### Fallback cascade design

- **D-06:** 4-tier fallback chain. Tier 1: Live API (GLM-4-Flash, 5s timeout). Tier 2: Qwen auto-failover on timeout/error. Tier 3: cached recommendations from pre-cache (offline mode). Tier 4: pre-recorded video (Plan B, 1080p/30fps from `docs/PRESENTATION/XUNO-DEMO-FALLBACK.md`). Tier 5: PPT screenshot walkthrough (Plan C). Each tier transitions within 10 seconds max.
- **D-07:** Voice fallback: STT failure → auto-switch to text input (existing behavior). TTS failure → display text only (no audio). Both measured by warmup preflight.

### E2E automation strategy

- **D-08:** Automate core ~26 items from `docs/SMOKE-TEST.md` (Sections 2: Navigation, 4: Yiyi Dialog). Target: shell-script-based runner using `curl` for API health, `adb` for app interactions. Adopt existing `check()` / `record_result()` pattern from demo scripts. Remaining 50 items remain manual supplement.
- **D-09:** Automated checks must cover: 4-tab navigation smoke, Yiyi 10-step interview dialog completion, voice STT/TTS roundtrip latency <8s, try-on pipeline end-to-end, cross-scene memory verification.

### Demo mode isolation

- **D-10:** `DEMO_MODE=true` env flag controls: backend binding to `0.0.0.0:3001` (emulator access), frontend debug FAB visibility, seed data preload, real API call disabling. Toggle via developer settings on mobile. When ON, all recommendations served from cache — zero live API dependency during demo.
- **D-11:** ProfileDebugPanel (already built, hidden behind debug FAB) supports rapid switching between 10 seed profiles during demo rehearsal. `seed-user-data-v2.json` contains all 10 profiles with onboarding state, wardrobe items, and preferences.

### PPT/video regeneration

- **D-12:** Rebuild competition PPT and pre-recorded demo video **after** Phase 5 E2E dry-run verification passes. Screenshots must match actual app state. Current PPT/scripts may be stale — regenerate from latest app build.

### Claude's Discretion

- Exact ErrorBoundary fallback UI design per screen (loading skeleton, retry button wording)
- Pre-cache data structure (JSON schema for cached recommendations)
- Shell script error message wording and color scheme
- E2E test runner implementation (bash vs Node.js script)
- PPT slide layout and visual design (after screenshots captured)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Demo flow and script

- `docs/demo-script.md` — Competition demo flow (3 layers, 150s total), timing breakdown, degradation plan
- `docs/PRESENTATION/XUNO-DEMO-SCRIPT.md` — Detailed 8-act demo script with emotion curve, 3 "wow" moments, Q&A integration
- `docs/DEMO-SCRIPT-TEST-PLAN.md` — 3-run rehearsal test plan, per-step timing estimates with code references, run record template

### Verification and checklists

- `docs/DEMO-CHECKLIST.md` — 15-item pre-demo checklist (env prep 30min → warmup 10min → app 5min → backup)
- `docs/SMOKE-TEST.md` — 76-item smoke test across 10 categories, crash log template with `adb logcat` command

### Fallback and resilience

- `docs/PRESENTATION/XUNO-DEMO-FALLBACK.md` — 6 Plan B scenarios + Plan C (PPT), 10-second response timeline, pre-recording specs

### Demo data

- `docs/PRESENTATION/seed-user-data-v2.json` — 10 demo profiles (6 body types × 9 styles × 7 scenarios), onboarding state, wardrobe items

### Q&A preparation

- `docs/PRESENTATION/Q-A-PREP.md` — 10 technical + 5 business + 3 social-value Q&As with evidence citations

### Infrastructure scripts

- `scripts/demo-preflight.sh` — 4-stage environment health check (Docker, config, 15 services, port liveness)
- `scripts/demo-warmup.sh` — 5-step cache warming with timeout-protected retry (12 retries × 5s)
- `infrastructure/scripts/demo-local.sh` — 7-step one-click launch with 300s health wait

### Security audit

- `audit-output.json` — Existing security findings; any HIGH items must be addressed before demo

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **ErrorBoundary infrastructure** (`apps/mobile/src/shared/components/ErrorBoundary/`): Class component + `withErrorBoundary` HOC + `ErrorFallback` with retry + `createErrorBoundaryHOC` factory. Already wrapping `AiStylistUnifiedScreen`. Extend to remaining tab screens.
- **ProfileDebugPanel** (`apps/mobile/src/features/stylist/components/ProfileDebugPanel.tsx`): Debug FAB with profile switching, funnel visualization trigger. Use for rapid rehearsal profile switching.
- **TTS precache service** (`apps/backend/src/domains/ai-core/services/tts.service.ts`): Lazy-loads precache manifest, phrase key lookup, `PRECACHE_PHRASES` mapping. Verify all 14 phrases match demo script.
- **RecommendationBreakdown** (`apps/mobile/src/features/stylist/components/RecommendationBreakdown.tsx`): 7-layer funnel rendering. Ensure <2s render during demo.
- **Try-on orchestrator** (`apps/backend/src/domains/ai-core/services/tryon-orchestrator.service.ts`): DoubaoSeedreamProvider integration. Measure generation time per seed profile.

### Established Patterns

- **PASS/FAIL/SKIP result tracking**: All shell scripts use `record_result()` / `check()` with `[OK] [FAIL] [SKIP]` output and summary counting. Adopt for any new Phase 5 E2E scripts.
- **Timeout-protected retry**: `MAX_RETRIES=12`, `RETRY_INTERVAL=5s`, `ITEM_TIMEOUT=30s` via `run_with_timeout()` wrapper. Apply to voice STT, LLM response, try-on generation.
- **DEMO_MODE flag propagation**: `DEMO_MODE=true` env var → backend binding `0.0.0.0:3001` → frontend debug FAB → seed data preload. Already established, extend for pre-cache integration.
- **ErrorBoundary-as-default-export**: Every screen exports `default withErrorBoundary(ScreenComponent, config)`. Validate all 4 tab screens + onboarding follow this pattern.

### Integration Points

- **`POST /api/v1/demo/pre-cache`**: Referenced in warmup.sh but **NOT IMPLEMENTED** — must create controller + service in `apps/backend/src/domains/mobile-api/`.
- **demo-preflight.sh**: Add Phase 5 checks: seed data validation, TTS cache file integrity, Android emulator connectivity.
- **demo-warmup.sh**: Extend warmup to include voice roundtrip test, cross-scene memory verification, try-on pipeline dry-run.
- **Docker Compose (production.yml)**: 15 services, healthcheck gating. Ensure `demo-local.sh` reports 15/15 healthy before E2E execution.

</code_context>

<specifics>
## Specific Ideas

- Demo script has 3 "wow" moments: AI recommendation at 0:21, radar chart at 0:38, cross-scene memory at 1:07. Each must work flawlessly.
- "I want the 3-run rehearsal to feel like we're over-prepared, not rushing" — target ≤140s (not 150s limit) for margin.
- Fallback Plan B (pre-recorded video) must feel intentional, not like a failure — practice the transition, have narration ready.
- Emulator network table in DEMO-CHECKLIST.md references both WiFi + hotspot — test both paths.

</specifics>

<deferred>
## Deferred Ideas

- Automated CI pipeline for E2E tests (GitHub Actions) — infrastructure setup beyond Phase 5 scope
- Performance profiling and optimization (Core Web Vitals) — Phase 6 concern
- Multi-language demo support — out of scope for competition demo
- AR try-on alternative demo path — new capability, separate phase

</deferred>

---

_Phase: 05-e2e-demo_
_Context gathered: 2026-04-29_

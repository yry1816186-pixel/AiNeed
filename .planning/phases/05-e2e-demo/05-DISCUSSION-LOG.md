# Phase 5: E2E Integration + Competition Demo — Discussion Log

**Date:** 2026-04-29
**Mode:** --auto (autonomous selection)

## Areas Discussed

### Demo Stability Strategy

**Auto-selected:** Extend ErrorBoundary to all 4 tabs + Onboarding (recommended)
**Rationale:** Existing ErrorBoundary infrastructure already wraps AiStylistUnifiedScreen. Extending to remaining screens is lowest-risk path to zero-crash guarantee.

### Pre-caching and Warmup

**Auto-selected:** Implement missing `/api/v1/demo/pre-cache` endpoint + extend warmup.sh validation (recommended)
**Rationale:** warmup.sh already calls this endpoint but it's unimplemented — critical gap for demo reliability. Cache: top-5 recs per scene × 10 profiles, 14 TTS phrases.

### Fallback Cascade Design

**Auto-selected:** 4-tier cascade — Live → Qwen → Cached → Video → PPT (recommended)
**Rationale:** Matches existing `XUNO-DEMO-FALLBACK.md` 6 Plan B scenarios. Each tier transitions within 10s.

### E2E Automation Strategy

**Auto-selected:** Automate core 26 SMOKE-TEST items, 50 manual supplement (recommended)
**Rationale:** Full 76-item automation overkill for Phase 5. Shell-script runner using existing PASS/FAIL pattern.

### Demo Mode Isolation

**Auto-selected:** DEMO_MODE=true env flag + dedicated pre-cache endpoint (recommended)
**Rationale:** Already established — just need to ensure pre-cache integration and toggle visibility.

### PPT/Video Regeneration

**Auto-selected:** Rebuild after E2E verification pass (recommended)
**Rationale:** Screenshots must match actual app state. Current PPT may be stale.

## Deferred Ideas

- Automated CI pipeline for E2E tests — future phase
- Performance profiling — Phase 6
- Multi-language demo — out of scope

---

_Discussion log for Phase 5 :: 05-e2e-demo_
_Generated: 2026-04-29_

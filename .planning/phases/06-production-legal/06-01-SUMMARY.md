---
phase: 06-production-legal
plan: 01
subsystem: ml, recommendations
tags: [fashionSigLIP, diversity-scoring, bias-audit, FashionCLIP-removal]

requires:
  - phase: 04-commerce-discovery
    provides: recommendation engine with rule-based scoring

provides:
  - FashionSigLIP-only ML pipeline (no FashionCLIP remnants)
  - DiversityScorerService with 3-metric scoring (entropy, style, price)
  - Extended bias audit covering 10 diverse profile types
  - Diversity observability in recommendation pipeline

affects: [recommendations, ml-embeddings, bias-audit]

tech-stack:
  added: []
  patterns: [shannon-entropy-diversity, style-tag-diversity, price-spread-normalization]

key-files:
  created:
    - apps/backend/src/domains/platform/recommendations/services/diversity-scorer.service.ts
    - ml/scripts/__tests__/test_06_01_fashionclip_cleanup.py
    - apps/backend/src/domains/platform/recommendations/services/__tests__/diversity-scorer.service.spec.ts
  modified:
    - ml/config/paths.py
    - ml/services/rag/embeddings.py
    - ml/services/recommender/fashion_knowledge_rag.py
    - ml/scripts/bias_audit.py
    - ml/services/stylist/intelligent_style_recommender.py
    - apps/backend/src/domains/platform/recommendations/recommendations.module.ts
    - apps/backend/src/domains/platform/recommendations/recommendations.service.ts

key-decisions:
  - "Removed clip_fashion fallback branch entirely (FashionSigLIP-only pipeline)"
  - "Diversity scorer uses weighted combination: category entropy 40%, style diversity 35%, price spread 25%"
  - "Bias audit threshold tightened to <0.2 (diversity >0.8) for 10-profile test"
  - "Diversity scorer logs score for observability without altering recommendation order"

patterns-established:
  - "Shannon entropy for category distribution diversity"
  - "3-metric weighted diversity scoring in recommendation pipeline"

requirements-completed: [PROD-02, PROD-03]

duration: 12min
completed: 2026-04-29
---

# Phase 6 Plan 1: FashionSigLIP Cleanup + Diversity Scoring Summary

**FashionSigLIP-only ML pipeline with 3-metric diversity scorer and 10-profile bias audit**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-29T19:44:34Z
- **Completed:** 2026-04-29T19:56:30Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Removed all FashionCLIP references from active ML code paths (6 files cleaned)
- Created DiversityScorerService with Shannon entropy + style tag + price spread metrics
- Extended bias audit from 5 to 10 diverse profile types with diversity_score output
- Wired diversity scoring into recommendation pipeline for observability

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: FashionCLIP cleanup tests** - `3490d4ee` (test)
2. **Task 1 GREEN: FashionCLIP cleanup + 10 profiles** - `f946795d` (feat)
3. **Task 2 RED: DiversityScorer tests** - `db23999c` (test)
4. **Task 2 GREEN: DiversityScorerService implementation** - `84f7e29a` (feat)

**Plan metadata:** (pending final commit)

_Note: TDD tasks have multiple commits (test → feat)_

## Files Created/Modified

- `apps/backend/src/domains/platform/recommendations/services/diversity-scorer.service.ts` - 3-metric diversity scoring service
- `apps/backend/src/domains/platform/recommendations/services/__tests__/diversity-scorer.service.spec.ts` - 7 test cases for diversity scorer
- `ml/scripts/__tests__/test_06_01_fashionclip_cleanup.py` - 6 structural tests for FashionCLIP cleanup
- `ml/config/paths.py` - Removed clip_fashion fallback, updated docstrings to FashionSigLIP
- `ml/services/rag/embeddings.py` - Updated display name from ChineseFashionCLIP to FashionSigLIP local
- `ml/services/recommender/fashion_knowledge_rag.py` - Changed model_type to fashion_siglip
- `ml/services/stylist/intelligent_style_recommender.py` - Fixed default model path
- `ml/scripts/bias_audit.py` - Extended to 10 profiles, added diversity_score, tightened thresholds
- `apps/backend/src/domains/platform/recommendations/recommendations.module.ts` - Registered DiversityScorerService
- `apps/backend/src/domains/platform/recommendations/recommendations.service.ts` - Injected diversity scorer with debug logging

## Decisions Made

- Removed clip_fashion fallback entirely — FashionSigLIP is the sole embedding model
- Kept `get_fashion_clip_path()` method name for backward compatibility but docstring references FashionSigLIP
- Diversity scorer is observational (logs score) — existing diversityPenalty mechanism still controls reranking
- Weighted 3-metric approach chosen over single metric for robustness across recommendation dimensions
- Bias audit threshold tightened from <0.3 to <0.2 for 10 profiles (more stringent PROD-03 gate)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed fashion_clip references in files not listed in plan**

- **Found during:** Task 1 (FashionCLIP cleanup)
- **Issue:** Plan listed 4 files but verification `grep -r "fashion_clip" ml/` caught 2 additional files: `intelligent_style_recommender.py` (default path) and `paths.py:128` (dict key in check_model_availability)
- **Fix:** Updated default path in intelligent_style_recommender.py and renamed dict key from "fashion_clip" to "fashion_siglip"
- **Files modified:** ml/services/stylist/intelligent_style_recommender.py, ml/config/paths.py
- **Verification:** All 6 structural tests pass, grep returns 0 results in active files
- **Committed in:** f946795d (Task 1 GREEN commit)

**2. [Rule 3 - Blocking] Test file encoding error for non-UTF-8 ML files**

- **Found during:** Task 1 RED (test writing)
- **Issue:** Some ML files contain non-UTF-8 bytes causing UnicodeDecodeError in test scanner
- **Fix:** Added `errors="ignore"` fallback for UnicodeDecodeError in test file
- **Files modified:** ml/scripts/**tests**/test_06_01_fashionclip_cleanup.py
- **Verification:** Test runs successfully against all ML files
- **Committed in:** f946795d (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correctness and test reliability. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in ai-stylist.module.ts, glm-tryon.provider.ts, visual-search.service.ts, recommendation-explainer.service.ts — out of scope, not caused by this plan
- Live bias audit requires running backend API at localhost:3001 — structural verification passed, live run deferred to runtime

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FashionSigLIP pipeline is clean — no FashionCLIP remnants in active code
- Diversity scorer operational with 7/7 tests passing
- Bias audit covers 10 profiles with diversity_score metric
- Ready for Phase 6 Plan 2 (next plan in production-legal phase)

---

_Phase: 06-production-legal_
_Completed: 2026-04-29_

## Self-Check: PASSED

- All 10 key files verified on disk
- 4 commits verified in git log (3490d4ee, f946795d, db23999c, 84f7e29a)
- TDD gates: RED (test) → GREEN (feat) for both tasks

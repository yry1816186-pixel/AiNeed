---
phase: "01"
plan: "02"
subsystem: backend
tags:
  [orchestrator-facade, gender-removal, recommendation-pipeline, degradation, experiment-tracking]
dependency_graph:
  requires: [01-PLAN.md]
  provides:
    [
      orchestrator-single-entry-point,
      gender-free-cold-start,
      explanation-structure,
      degradation-strategy,
    ]
  affects: [recommendations-controller, orchestrator, cold-start, rule-engine, recommendation-types]
tech_stack:
  added:
    [
      ScoreWeights configurable fusion,
      RecommendationExplanationDetail,
      RecommendationOutput,
      scenarioMapping,
    ]
  patterns: [orchestrator-facade-delegation, degraded-pipeline-fallback, experiment-id-per-batch]
key_files:
  created: []
  modified:
    - apps/backend/src/domains/platform/recommendations/recommendations.controller.ts
    - apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts
    - apps/backend/src/domains/platform/recommendations/orchestrator/index.ts
    - apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts
    - apps/backend/src/domains/platform/recommendations/services/recommendation-explainer.service.ts
    - apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts
    - apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts
decisions:
  - Controller only injects RecommendationOrchestrator (facade pattern) - all 13 endpoints route through orchestrator
  - Gender removed from ColdStartService entirely; bodyType + styleExpression + primaryScenarios replace gender-based logic
  - Scoring weights made configurable via RecommendationRequest.options.scoreWeights (default: rule 0.4, vector 0.35, preference 0.25)
  - experimentId generated per recommendation batch for A/B tracking (format: exp-{timestamp}-{random})
  - Degraded pipeline uses rule engine with season+occasion templates when AI pipeline fails
metrics:
  duration: 23m
  completed: 2026-04-24
  tasks_completed: 5
  files_modified: 7
  lines_added: 551
  lines_removed: 184
---

# Phase 1 Plan 02: Recommendation Pipeline Architecture + ColdStartService Refactoring Summary

Made Orchestrator the sole entry point for all recommendation endpoints, removed all gender references from ColdStartService replacing with bodyType + styleExpression + primaryScenarios, added configurable scoring fusion weights, structured explanation output with experimentId for A/B tracking, and degradation strategy with rule engine fallback.

## Tasks Completed

| Task | Name                                                       | Commit   | Key Changes                                                             |
| ---- | ---------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| 1    | Extend Orchestrator to be the single entry point           | 8ad7c60a | Controller only injects Orchestrator, added 6 delegate methods          |
| 2    | Refactor ColdStartService - remove gender bucketing        | bca8f94d | Removed gender field, added scenarioMapping (7 entries), 3-tier sorting |
| 3    | Integrate behavior feedback into scoring (REC-02)          | 433fa0f7 | Configurable ScoreWeights, preference learning already integrated       |
| 4    | Ensure recommendation output includes explanation (REC-04) | 1b7960d1 | Added explanation structure + experimentId to every result              |
| 5    | Add degradation strategy (REC-05)                          | f19d10f0 | try/catch around AI pipeline, rule engine fallback with templates       |

## Key Technical Decisions

### Orchestrator as Sole Entry Point

Controller now only injects `RecommendationOrchestrator`. All 13 endpoints call `this.orchestrator.*` exclusively. Direct service injections (`RecommendationsService`, `OutfitCompletionService`, `BehaviorTrackingService`, `RecommendationFeedService`, `GoldenRecommendationService`) were removed from the controller. The Orchestrator handles delegation internally.

### Gender Removal from ColdStartService

The `UserProfile` interface no longer has a `gender` field. The `getProfileBasedStrategy` now uses a 3-tier sorting approach: (1) primaryScenarios via scenarioMapping, (2) bodyType via bodyTypeRules, (3) styleExpression via styleExpressionMapping. The `scenarioMapping` covers 7 scenarios: commute, interview, date, casual, workout, party, travel.

### Configurable Scoring Fusion

`RecommendationRequest.options.scoreWeights` allows overriding the default fusion weights (rule: 0.4, vector: 0.35, preference: 0.25). The `fuseAndExplain` method accepts custom weights.

### Experiment ID for A/B Tracking

Each recommendation batch generates a unique `experimentId` (format: `exp-{timestamp}-{random}`). This is attached to every `RecommendationResult` for downstream A/B experiment tracking (REC-06).

### Degraded Pipeline

The AI pipeline (fetchAllCandidates -> filterByScene -> filterBySize -> filterByBudget -> scoreByRules -> scoreByVector -> applyPreferenceLearning) is wrapped in try/catch. On failure, `degradedPipeline` delegates to `RuleEngineService.getDegradedRecommendations` which uses season + occasion + weather templates to fetch popular items matching the context.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Controller only injects `RecommendationOrchestrator` (verified: 1 orchestrator, 0 Services in constructor)
- Zero gender references in cold-start.service.ts (verified: grep returns 0)
- Zero `any` / `eslint-disable` in controller (verified: grep returns 0)
- `scenarioMapping` exists with 7 entries (verified)
- `experimentId` present in recommendation output (verified: 7 occurrences in orchestrator)
- `degradedPipeline` exists in orchestrator (verified)
- `getDegradedRecommendations` exists in rule-engine (verified)
- `tsc --noEmit` passes cleanly (zero errors)
- All 5 commits passed lint-staged (eslint --fix + prettier)

## Known Stubs

None. All code changes are complete with proper types and functionality.

## Threat Flags

No new security-relevant surface introduced. The degraded pipeline uses the same PrismaService data access patterns as the normal pipeline.

## Self-Check: PASSED

- All 7 key files verified present on disk
- All 5 commit hashes verified in git log (8ad7c60a, bca8f94d, 433fa0f7, 1b7960d1, f19d10f0)
- No unexpected file deletions in any commit
- tsc --noEmit passes cleanly

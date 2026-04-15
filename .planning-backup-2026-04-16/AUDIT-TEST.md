# AUDIT-TEST.md — 测试基线审计

**Date:** 2026-04-15

## Summary

| Project | Suites | Tests | Pass | Fail | Timeout | Coverage |
|---------|--------|-------|------|------|---------|----------|
| Backend | ~65 | ~1021+ | Most | Some | 3+ | ~15% |
| Mobile | ~5 | ~20 | Partial | Partial | 0 | ~5% |

## Backend Test Issues

### Failing/Timeout Tests

| Suite | Test | Error Type | Description |
|-------|------|------------|-------------|
| clothing.service.spec.ts | getItems (multiple) | Timeout | `executeQueryWithTimeout` rejects after QUERY_TIMEOUT_MS. Mock not properly returning before timeout. |
| clothing.service.spec.ts | Line 563, 585, 635 | Timeout | Same root cause — query timeout mechanism not mocked in tests |

### Root Cause
`ClothingService.executeQueryWithTimeout()` uses `setTimeout` with a rejection promise. The test mocks don't properly resolve before the timeout fires, causing all related tests to fail.

### Previous Test Status (from STATE.md)
- 65 suites, 1021+ tests were all passing after Phase 00 fixes
- Current regression likely from Phase 09 changes that added `executeQueryWithTimeout`

## Mobile Test Issues

- Pre-existing mobile tests (config/__tests__/runtime.test.ts) fail with module resolution
- Mobile test framework configured (babel-jest + __DEV__ globals) but coverage is minimal

## Coverage Analysis

### Backend (~15%)
- Core modules (auth, clothing, community, order) have test files
- Most Phase 06-09 modules lack tests
- AI/ML integration services have no tests (external API dependency)

### Mobile (~5%)
- Only config and utility tests exist
- No screen component tests
- No store tests
- No navigation tests

## Recommendations

1. Fix clothing.service.spec.ts timeout mocks — mock `executeQueryWithTimeout` directly
2. Add tests for Phase 06-09 backend modules
3. Add mobile screen/store tests
4. Target 30% backend coverage, 15% mobile coverage for MVP

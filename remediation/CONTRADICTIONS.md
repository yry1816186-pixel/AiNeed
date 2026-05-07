# Contradictions Register — Phase 0

## Contradictions Found Across Audit Files

| ID    | Claim A                                     | Source A                         | Claim B                                                                              | Source B                     | Resolution Status                                                                             |
| ----- | ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------- |
| C-001 | "Backend has 100+ unit tests"               | 00_EXECUTIVE_SUMMARY.md          | "Tests not executed" — run report skipped test execution                             | 02_RUN_BUILD_TEST_REPORT.md  | UNVERIFIED — tests exist on disk but pass rate not locally confirmed                          |
| C-002 | "Install & Build works"                     | 00_EXECUTIVE_SUMMARY.md          | "Build not tested due to resource intensity"                                         | 02_RUN_BUILD_TEST_REPORT.md  | PARTIALLY RESOLVED — install confirmed (pnpm install success), build NOT verified             |
| C-003 | "Security score 52/100"                     | 00_EXECUTIVE_SUMMARY.md          | "Security infrastructure is strong"                                                  | 14_HANDOFF_FOR_NEXT_AGENT.md | UNRESOLVED — both are AUDIT-REPORTED; infrastructure exists but enforcement gaps are critical |
| C-004 | "Production alerting targets empty"         | 00_EXECUTIVE_SUMMARY.md (P0-010) | "infrastructure/ directory has more complete config"                                 | 14_HANDOFF_FOR_NEXT_AGENT.md | UNRESOLVED — dual config directories with drift                                               |
| C-005 | "Mobile app partially works with mock data" | 00_EXECUTIVE_SUMMARY.md          | "Mobile not tested — requires Metro bundler + emulator"                              | 02_RUN_BUILD_TEST_REPORT.md  | UNRESOLVED — mobile runtime behavior is UNVERIFIED                                            |
| C-006 | ".env may be in git history"                | 00_EXECUTIVE_SUMMARY.md          | CONFIRMED: `.env.production` committed 2026-04-29; `.env.local` committed 2026-04-29 | Local git log verification   | **CONFIRMED** — secrets WERE in git history                                                   |
| C-007 | "Commercial-grade architecture exists"      | Implied by project scope         | "97% data is synthetic; core data pipeline broken"                                   | 00_EXECUTIVE_SUMMARY.md      | UNRESOLVED — architecture is strong but data foundation is weak                               |

## Key Resolution: C-006 (Secret History)

**EVIDENCE**: Local git log shows:

- Commit `633545a7` on 2026-04-29 20:56:34 added `.env.production` to git
- Commit `23420a28` on 2026-04-29 11:58:14 added `.env.local` to git
- Currently only `.env.example` and `.env.security.example` are tracked

**SEVERITY**: P0 — CONFIRMED secret exposure in git history
**ACTION REQUIRED**: Secret rotation is mandatory before any production use
**STATUS**: BLOCKED — requires human authorization to rotate production secrets

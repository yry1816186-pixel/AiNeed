# Open Blockers — Phase 0

## P0 Blockers (Prevent Production Use)

| ID    | Blocker                                                                                  | Severity | Status         | Human Required                       |
| ----- | ---------------------------------------------------------------------------------------- | -------- | -------------- | ------------------------------------ |
| B-001 | Secret exposure in git history — `.env.production` and `.env.local` committed 2026-04-29 | P0       | CONFIRMED      | YES — secret rotation authorization  |
| B-002 | Consent enforcement not wired to AI/photo endpoints                                      | P0       | AUDIT-REPORTED | No                                   |
| B-003 | Data import pipeline broken — missing `import-fashion-dataset.py`                        | P0       | AUDIT-REPORTED | No                                   |
| B-004 | `data/raw/` directory missing — 5 ML dataset paths unresolved                            | P0       | AUDIT-REPORTED | Possibly — data license verification |
| B-005 | Coordination model training data is all-zero vectors                                     | P0       | AUDIT-REPORTED | No                                   |
| B-006 | Backend E2E tests are null-op — zero `*.e2e-spec.ts` files                               | P0       | AUDIT-REPORTED | No                                   |
| B-007 | Production alertmanager targets empty                                                    | P0       | AUDIT-REPORTED | No                                   |

## P1 Blockers (Prevent Commercial Readiness)

| ID    | Blocker                                                | Severity | Status         | Human Required   |
| ----- | ------------------------------------------------------ | -------- | -------------- | ---------------- |
| B-008 | 7 mobile store methods are TODO stubs                  | P1       | AUDIT-REPORTED | No               |
| B-009 | Mobile production paths fallback to mock/fake products | P1       | AUDIT-REPORTED | No               |
| B-010 | No global request body size limit                      | P1       | AUDIT-REPORTED | No               |
| B-011 | Inconsistent file upload validation                    | P1       | AUDIT-REPORTED | No               |
| B-012 | No privacy policy, TOS, algorithm registration         | P1       | AUDIT-REPORTED | YES — legal team |
| B-013 | No saved coordination model weights                    | P1       | AUDIT-REPORTED | No               |

## Human-Decision Blockers

| ID    | Decision Required                                | Impact                                   |
| ----- | ------------------------------------------------ | ---------------------------------------- |
| H-001 | Authorize secret rotation for all services       | Cannot proceed with security remediation |
| H-002 | Verify dataset licenses for commercial use       | Cannot populate data/raw/                |
| H-003 | Legal entity and data controller role definition | Cannot complete compliance docs          |
| H-004 | MVP scope confirmation                           | Cannot finalize feature readiness matrix |
| H-005 | Confirm whether demo launch is acceptable        | Affects launch strategy                  |

## Phase Gate

- Phase 0 can complete with blockers documented
- Phase 1 requires human to review B-001 (secret rotation) before proceeding
- All P0 items must be fixed or precisely blocked before Phase 2
